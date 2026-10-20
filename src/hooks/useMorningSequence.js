import { useState, useEffect, useCallback } from 'react'
import { offlineSelect, offlineUpdate } from '../lib/offlineApi'
import { supabase } from '../lib/supabase'
import db from '../lib/offlineStore'
import { useAuth } from './useAuth'

export function useMorningSequence() {
  const { user } = useAuth()
  const [stage, setStage] = useState('loading')
  const [briefId, setBriefId] = useState(null)
  const [briefItems, setBriefItems] = useState([])

  const hasNewsItem = (items) => Array.isArray(items) && items.some(i => i.type === 'news' || (!i.type && !i.hardware_opportunity_id))

  const checkSequence = useCallback(async () => {
    if (!user) return

    const today = new Date().toLocaleDateString('en-CA')
    
    // Check if Ignite fired today. 
    // (Using localStorage as the Ignite button in DayBriefView currently doesn't persist state)
    const igniteFiredToday = localStorage.getItem('polaris_ignite_date') === today

    if (igniteFiredToday) {
      setStage('done')
      console.log('Morning Sequence Stage:', 'done')
      return
    }

    // Check morning briefs table
    const { data, error } = await offlineSelect('morning_briefs', {
      user_id: user.id,
      date: today
    })

    if (error) {
      console.error('Error fetching morning brief for sequence:', error)
      return
    }

    let brief = (data || [])[0]

    // Fallback: if not in Dexie yet or if brief in Dexie lacks news, check Supabase directly if online
    if ((!brief || !hasNewsItem(brief.items)) && typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
      try {
        const { data: remoteBrief } = await supabase
          .from('morning_briefs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        if (remoteBrief && (hasNewsItem(remoteBrief.items) || !brief)) {
          brief = remoteBrief
          if (db?.morning_briefs) {
            await db.morning_briefs.put(remoteBrief)
          }
        }
      } catch (err) {
        console.warn('Morning Sequence: Remote brief fallback failed:', err)
      }
    }

    if (!brief) {
      setStage('loading')
      console.log('Morning Sequence Stage:', 'loading')
      return
    }

    setBriefId(brief.id)
    setBriefItems(brief.items || [])

    if (!brief.seen) {
      if (hasNewsItem(brief.items)) {
        setStage('spark')
        console.log('Morning Sequence Stage:', 'spark')
      } else {
        // Brief exists but lacks news items (e.g. created by scout with only opportunities).
        // Wait in loading until news is generated so we don't present an empty popup!
        setStage('loading')
        console.log('Morning Sequence Stage:', 'loading (waiting for news)')
      }
    } else {
      setStage('brief')
      console.log('Morning Sequence Stage:', 'brief')
    }
  }, [user])

  useEffect(() => {
    checkSequence()

    const handleUpdate = (e) => {
      if (e?.detail?.table && e.detail.table !== 'morning_briefs') return
      checkSequence()
    }

    const handleFailed = () => {
      // If generation failed, transition to brief so the app does not stay in loading
      setStage((prev) => (prev === 'loading' ? 'brief' : prev))
    }

    // Safety timeout: if loading stage lasts longer than 12s, fallback to brief
    const timer = setTimeout(() => {
      setStage((prev) => (prev === 'loading' ? 'brief' : prev))
    }, 12000)

    window.addEventListener('polaris-morning-brief-updated', handleUpdate)
    window.addEventListener('polaris-tasks-changed', handleUpdate)
    window.addEventListener('polaris-morning-brief-failed', handleFailed)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('polaris-morning-brief-updated', handleUpdate)
      window.removeEventListener('polaris-tasks-changed', handleUpdate)
      window.removeEventListener('polaris-morning-brief-failed', handleFailed)
    }
  }, [checkSequence])

  const markSparkSeen = async () => {
    if (!user?.id) return
    const today = new Date().toLocaleDateString('en-CA')
    const match = briefId ? { id: briefId, user_id: user.id } : { user_id: user.id, date: today }
    
    const { error } = await offlineUpdate(
      'morning_briefs',
      match,
      { seen: true }
    )
      
    if (!error) {
      setStage('brief')
      console.log('Morning Sequence Stage:', 'brief')
    } else {
      console.error('Error updating spark seen:', error)
    }
  }

  return { stage, briefItems, markSparkSeen, refreshSequence: checkSequence }
}
