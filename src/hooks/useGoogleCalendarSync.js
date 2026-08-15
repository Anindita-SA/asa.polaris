import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

export function useGoogleCalendarSync() {
  const { user, providerToken } = useAuth()
  const [syncedEvents, setSyncedEvents] = useState([])
  const [proposedEvents, setProposedEvents] = useState([])
  const [backups, setBackups] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('polaris_auto_sync_gcal') === 'true'
  })
  const [lastSyncedAt, setLastSyncedAt] = useState(() => {
    return localStorage.getItem('polaris_last_gcal_sync') || null
  })

  // Toggle auto sync preference
  const setAutoSync = (enabled) => {
    setAutoSyncEnabled(enabled)
    localStorage.setItem('polaris_auto_sync_gcal', enabled ? 'true' : 'false')
  }

  // Fetch events stored in Supabase
  const fetchSupabaseSchedule = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true })

      if (!error && data) {
        setSyncedEvents(data.filter(e => e.status === 'confirmed'))
        setProposedEvents(data.filter(e => e.status === 'proposed'))
      }
    } catch (e) {
      console.error('Failed to fetch schedule from Supabase:', e)
    }
  }, [user?.id])

  // Fetch snapshots/backups
  const fetchBackups = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('calendar_backups')
        .select('id, snapshot_name, event_count, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setBackups(data)
      }
    } catch (e) {
      console.error('Failed to fetch backups:', e)
    }
  }, [user?.id])

  // Main Sync function: Google Calendar -> Supabase
  const syncNow = useCallback(async () => {
    if (!user?.id || !providerToken) return null

    setIsSyncing(true)
    try {
      // Fetch 30 days past and 60 days future from GCal
      const start = new Date()
      start.setDate(start.getDate() - 30)
      const end = new Date()
      end.setDate(end.getDate() + 60)

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${providerToken}` } }
      )

      if (!res.ok) throw new Error(`Google Calendar API returned status ${res.status}`)

      const data = await res.json()
      const gcalItems = data.items || []

      // Upsert into Supabase calendar_events
      for (const item of gcalItems) {
        const isAllDay = !item.start?.dateTime
        const startTime = item.start?.dateTime || item.start?.date
        const endTime = item.end?.dateTime || item.end?.date

        if (!startTime || !endTime) continue

        await supabase.from('calendar_events').upsert({
          user_id: user.id,
          gcal_event_id: item.id,
          summary: item.summary || '(No title)',
          description: item.description || '',
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
          is_all_day: isAllDay,
          color_id: item.colorId || null,
          location: item.location || null,
          source: 'gcal',
          status: 'confirmed',
          raw_payload: item,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,gcal_event_id' })
      }

      const timestamp = new Date().toLocaleTimeString()
      setLastSyncedAt(timestamp)
      localStorage.setItem('polaris_last_gcal_sync', timestamp)

      await fetchSupabaseSchedule()
      return { count: gcalItems.length }
    } catch (e) {
      console.error('Calendar sync error:', e)
      return { error: e.message }
    } finally {
      setIsSyncing(false)
    }
  }, [user?.id, providerToken, fetchSupabaseSchedule])

  // Create full snapshot backup (.ICS + Supabase entry)
  const createBackup = useCallback(async (customName) => {
    if (!user?.id) return

    const { data: allEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)

    const name = customName || `Schedule Snapshot ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString()}`
    const events = allEvents || []

    // Build RFC 5545 ICS string
    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Polaris Ecosystem//Calendar Backup//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${name}`
    ]

    events.forEach(e => {
      const dtStart = new Date(e.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtEnd = new Date(e.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${e.id}@polaris.app`)
      icsLines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`)
      icsLines.push(`DTSTART:${dtStart}`)
      icsLines.push(`DTEND:${dtEnd}`)
      icsLines.push(`SUMMARY:${e.summary || 'Event'}`)
      if (e.description) icsLines.push(`DESCRIPTION:${e.description.replace(/\n/g, '\\n')}`)
      icsLines.push('END:VEVENT')
    })

    icsLines.push('END:VCALENDAR')
    const rawIcs = icsLines.join('\r\n')

    // Insert into Supabase calendar_backups
    await supabase.from('calendar_backups').insert({
      user_id: user.id,
      snapshot_name: name,
      event_count: events.length,
      raw_ics_content: rawIcs
    })

    // Trigger local download
    const blob = new Blob([rawIcs], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${name.replace(/[/\\?%*:|"<> ]/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    await fetchBackups()
  }, [user?.id, fetchBackups])

  // Approve a proposed event (Commit to confirmed status)
  const approveProposedEvent = async (eventId) => {
    await supabase
      .from('calendar_events')
      .update({ status: 'confirmed', updated_at: new Date().toISOString() })
      .eq('id', eventId)
    await fetchSupabaseSchedule()
  }

  // Reject a proposed event
  const rejectProposedEvent = async (eventId) => {
    await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
    await fetchSupabaseSchedule()
  }

  // Initial load & Auto-sync effect
  useEffect(() => {
    if (user?.id) {
      fetchSupabaseSchedule()
      fetchBackups()
      if (autoSyncEnabled && providerToken) {
        syncNow()
      }
    }
  }, [user?.id, providerToken, autoSyncEnabled])

  return {
    syncedEvents,
    proposedEvents,
    backups,
    isSyncing,
    autoSyncEnabled,
    lastSyncedAt,
    setAutoSync,
    syncNow,
    createBackup,
    approveProposedEvent,
    rejectProposedEvent,
    refetch: fetchSupabaseSchedule
  }
}
