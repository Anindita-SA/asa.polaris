import { useState, useEffect, useCallback } from 'react'
import { offlineSelect, offlineUpdate } from '../lib/offlineApi'
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
    const { data, error } = await offlineSelect('morning_briefs', {
      user_id: user.id,
      date: today
    })

    if (error) {
      console.error('Error fetching morning brief for sequence:', error)
      return
    }

    const brief = (data || [])[0]
    if (!brief) {
      setStage('loading')
      console.log('Morning Sequence Stage:', 'loading')
      return
    }

    setBriefId(brief.id)
    setBriefItems(brief.items || [])

    if (!brief.seen) {
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
    
    const { error } = await offlineUpdate(
      'morning_briefs',
      { id: briefId, user_id: user.id },
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
