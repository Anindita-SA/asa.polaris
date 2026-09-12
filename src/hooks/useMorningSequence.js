import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMorningSequence() {
  const { user } = useAuth()
  const [stage, setStage] = useState('loading')
  const [briefId, setBriefId] = useState(null)
  const [briefItems, setBriefItems] = useState([])

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
    const { data, error } = await supabase
      .from('morning_briefs')
      .select('id, seen, items')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (error) {
      console.error('Error fetching morning brief for sequence:', error)
      return
    }

    if (!data) {
      setStage('loading')
      console.log('Morning Sequence Stage:', 'loading')
      return
    }

    setBriefId(data.id)
    setBriefItems(data.items || [])

    if (!data.seen) {
      setStage('spark')
      console.log('Morning Sequence Stage:', 'spark')
    } else {
      setStage('brief')
      console.log('Morning Sequence Stage:', 'brief')
    }
  }, [user])

  useEffect(() => {
    checkSequence()
  }, [checkSequence])

  const markSparkSeen = async () => {
    if (!user?.id || !briefId) return
    
    const { error } = await supabase
      .from('morning_briefs')
      .update({ seen: true })
      .eq('id', briefId)
      .eq('user_id', user.id)
      
    if (!error) {
      setStage('brief')
      console.log('Morning Sequence Stage:', 'brief')
    } else {
      console.error('Error updating spark seen:', error)
    }
  }

  return { stage, briefItems, markSparkSeen, refreshSequence: checkSequence }
}
