import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useGoogleCalendarSync } from '../../hooks/useGoogleCalendarSync'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCcw, Database, Archive, Check, X, BellRing, ShieldCheck, LogIn } from 'lucide-react'

const GOOGLE_COLORS = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
}

const CalendarView = () => {
  const { providerToken, signInWithGoogle } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('gcal') // 'gcal' | 'backups'

  // Hybrid Sync & Backup Hook
  const {
    proposedEvents,
    backups,
    isSyncing,
    autoSyncEnabled,
    lastSyncedAt,
    setAutoSync,
    syncNow,
    createBackup,
    approveProposedEvent,
    rejectProposedEvent
  } = useGoogleCalendarSync()

  // Fetch events directly from Google Calendar API
  const fetchEvents = async (date) => {
    if (!providerToken) return
    
    setLoading(true)
    setError(null)
    
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`, {
        headers: {
          Authorization: `Bearer ${providerToken}`
        }
      })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Google Calendar access expired or denied. Please reconnect.')
        }
        throw new Error('Failed to fetch events.')
      }
      
      const data = await res.json()
      setEvents(data.items || [])
    } catch (err) {
      console.error('Fetch events error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(currentWeek)
  }, [currentWeek, providerToken])

  const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="h-full flex flex-col overflow-hidden bg-void">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-6 border-b border-blue-900/20 bg-void/50 backdrop-blur-sm z-10 shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-sky" />
            <h2 className="font-display text-2xl text-starlight tracking-wider">
              {format(start, 'MMMM yyyy')}
            </h2>
          </div>
          <p className="text-xs text-dim mt-0.5">
            Google Calendar live grid & multi-calendar Supabase sync
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Tab Switches */}
          <div className="flex glass border border-blue-900/30 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('gcal')} 
              className={`px-3 py-1.5 rounded-md text-xs font-display transition-all ${activeTab === 'gcal' ? 'bg-sky/20 text-sky border border-sky/30' : 'text-dim hover:text-starlight'}`}>
              Google Calendar
            </button>
            <button 
              onClick={() => setActiveTab('backups')} 
              className={`px-3 py-1.5 rounded-md text-xs font-display transition-all flex items-center gap-1.5 ${activeTab === 'backups' ? 'bg-sky/20 text-sky border border-sky/30' : 'text-dim hover:text-starlight'}`}>
              <Database className="w-3 h-3" /> Backups ({backups.length})
            </button>
          </div>

          {/* Sync & Backup Toolbar */}
          <button
            onClick={syncNow}
            disabled={isSyncing || !providerToken}
            className="glass border border-sky/30 text-sky hover:bg-sky/20 px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Sync Google Calendar to Supabase Database">
            <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync GCal → DB'}
          </button>

          <button
            onClick={() => createBackup()}
            className="glass border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all"
            title="Create Full Schedule Snapshot Backup (.ICS & Database)">
            <Archive className="w-3.5 h-3.5" /> Snapshot Backup
          </button>

          {activeTab === 'gcal' && providerToken && (
            <div className="flex items-center gap-2">
              <button onClick={() => fetchEvents(currentWeek)} disabled={loading}
                className="p-2 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors"
                title="Refresh Calendar">
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="h-4 w-px bg-blue-900/30 mx-1" />
              <button onClick={() => setCurrentWeek(d => subWeeks(d, 1))}
                className="p-1.5 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentWeek(new Date())}
                className="px-2.5 py-1 rounded-lg hover:bg-stardust/30 text-xs font-display tracking-widest text-dim hover:text-starlight transition-colors uppercase border border-blue-900/20">
                Today
              </button>
              <button onClick={() => setCurrentWeek(d => addWeeks(d, 1))}
                className="p-1.5 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Proposed Schedule Staging Review Bar */}
      {proposedEvents.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b className="font-display">Staged Proposed Schedule:</b> You have {proposedEvents.length} proposed session(s) awaiting your review.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {proposedEvents.map(pe => (
              <div key={pe.id} className="glass border border-amber-500/30 rounded px-2 py-1 text-[11px] flex items-center gap-2 text-starlight">
                <span>{pe.summary}</span>
                <button 
                  onClick={() => approveProposedEvent(pe.id)} 
                  className="text-emerald-400 hover:text-emerald-300 p-0.5" 
                  title="Approve & Commit">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => rejectProposedEvent(pe.id)} 
                  className="text-red-400 hover:text-red-300 p-0.5" 
                  title="Reject">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'backups' ? (
        /* Backups Vault */
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="glass border border-blue-900/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display text-starlight text-base">Main Control & Backup Vault</h3>
              </div>
              <button
                onClick={() => createBackup()}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl text-xs font-display flex items-center gap-2 transition-all">
                <Archive className="w-4 h-4" /> Create Snapshot Now
              </button>
            </div>
            <p className="text-xs text-dim leading-relaxed">
              All your schedules are versioned and backed up. When you click <b>"Create Snapshot Now"</b>, Polaris generates an un-deletable version entry in Supabase and triggers a clean <code className="text-sky bg-void/50 px-1 py-0.5 rounded">.ICS</code> file download for your local archives.
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs text-starlight">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-blue-900/40 bg-void/50 text-sky focus:ring-sky"
                />
                <span>Auto-sync Google Calendar to Supabase when active</span>
              </label>
              {lastSyncedAt && <span className="text-dim text-[11px]">Last synced: {lastSyncedAt}</span>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-dim">Saved Schedule Snapshots ({backups.length})</h4>
            {backups.length === 0 ? (
              <div className="text-center py-8 glass border border-blue-900/20 rounded-xl text-dim text-xs">
                No saved snapshots yet. Click "Create Snapshot Now" above to generate your first backup.
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.id} className="glass border border-blue-900/20 p-4 rounded-xl flex items-center justify-between hover:border-sky/30 transition-all">
                    <div>
                      <h5 className="text-sm font-display text-starlight">{b.snapshot_name}</h5>
                      <p className="text-xs text-dim mt-0.5">
                        {b.event_count} events · Created {new Date(b.created_at).toLocaleDateString()} at {new Date(b.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
                      Backed Up
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Google Calendar Grid Tab */
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-16 scrollbar-hide">
          {!providerToken || error?.includes('reconnect') ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <CalendarIcon className="w-16 h-16 text-sky/60 mb-4 animate-bounce" />
              <h2 className="font-display text-2xl text-starlight tracking-wider mb-2">Connect Google Calendar</h2>
              <p className="font-body text-dim mb-6 max-w-sm text-xs leading-relaxed">
                Connect your Google account once to display your live Google Calendar events directly inside Polaris.
              </p>
              <button 
                onClick={signInWithGoogle}
                className="px-6 py-3 glass border border-sky/40 bg-sky/10 text-sky hover:bg-sky/20 rounded-xl font-display text-sm transition-all flex items-center gap-2">
                <LogIn className="w-4 h-4" /> Sign in with Google
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 min-w-[700px] min-h-[500px]">
              {days.map(day => {
                const isToday = isSameDay(day, new Date())
                const dayEvents = events.filter(e => {
                  const eStart = e.start?.dateTime || e.start?.date
                  return eStart && isSameDay(new Date(eStart), day)
                })

                return (
                  <div key={day.toISOString()} className="flex-1 flex flex-col min-w-[120px] glass border border-blue-900/20 rounded-xl p-3">
                    <div className={`pb-2 border-b mb-3 ${isToday ? 'border-sky text-sky' : 'border-blue-900/20 text-dim'}`}>
                      <p className="text-[11px] font-mono tracking-widest uppercase">
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-2xl font-display ${isToday ? 'text-starlight font-bold' : 'text-starlight/80'}`}>
                        {format(day, 'd')}
                      </p>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[450px] scrollbar-hide">
                      {loading ? (
                        <div className="animate-pulse space-y-2">
                          <div className="h-12 bg-stardust/20 rounded-lg" />
                          <div className="h-12 bg-stardust/20 rounded-lg" />
                        </div>
                      ) : dayEvents.length === 0 ? (
                        <div className="text-center pt-6 text-dim/30 font-body text-xs italic">
                          No events
                        </div>
                      ) : (
                        dayEvents.map(event => {
                          const isAllDay = !event.start.dateTime
                          const startTime = isAllDay ? 'All day' : format(new Date(event.start.dateTime), 'h:mm a')
                          const color = GOOGLE_COLORS[event.colorId] || '#38bdf8'

                          return (
                            <div key={event.id} 
                              className="glass rounded-lg p-2.5 border border-blue-900/20 hover:border-sky/30 transition-all text-left space-y-1"
                              style={{ 
                                borderLeftColor: color, 
                                borderLeftWidth: 3,
                                backgroundColor: `${color}0d`
                              }}>
                              <p className="text-[10px] font-mono text-dim">{startTime}</p>
                              <p className="text-xs font-display text-starlight leading-snug line-clamp-2">
                                {event.summary || '(No title)'}
                              </p>
                              {event.location && (
                                <p className="text-[10px] text-dim truncate">{event.location}</p>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CalendarView
