import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { offlineSelect, offlineUpsert, generateUUID } from '../lib/offlineApi'
import db from '../lib/offlineStore'
import { useAuth } from './useAuth'

export function useMorningBrief({ autoRun = true } = {}) {
  const { user } = useAuth()
  const hasRun = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateBrief = async (force = false) => {
    console.log('[useMorningBrief] generateBrief called. force:', force)
    if (!user) return
    setIsGenerating(true)
    const today = new Date().toLocaleDateString('en-CA')
    const hasNewsItem = (items) => Array.isArray(items) && items.some(i => i.type === 'news' || (!i.type && !i.hardware_opportunity_id))

    try {
      let existingBrief = null

      if (!force) {
        // 1. Check if a row exists in morning_briefs for today's date and current user in Dexie
        const { data: existingBriefs, error: checkError } = await offlineSelect('morning_briefs', {
          user_id: user.id,
          date: today
        })

        if (checkError) {
          console.error('Morning Brief: Existing check error:', checkError)
        }

        existingBrief = existingBriefs?.[0] || null

        if (existingBrief && hasNewsItem(existingBrief.items)) {
          console.log('Morning Brief: News brief already exists for today. Skipping generation.')
          setIsGenerating(false)
          return
        }

        // Check if Supabase already has today's brief with news (e.g. from earlier run or other client)
        if (typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
          try {
            const { data: remoteBrief } = await supabase
              .from('morning_briefs')
              .select('*')
              .eq('user_id', user.id)
              .eq('date', today)
              .maybeSingle()

            if (remoteBrief && hasNewsItem(remoteBrief.items)) {
              console.log('Morning Brief: Found existing brief with news in Supabase, caching to Dexie.')
              if (db?.morning_briefs) {
                await db.morning_briefs.put(remoteBrief)
              }
              await offlineUpsert('morning_briefs', remoteBrief)
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('polaris-morning-brief-updated', { detail: remoteBrief }))
              }
              setIsGenerating(false)
              return
            }
          } catch (fetchErr) {
            console.warn('Morning Brief: Remote check error:', fetchErr)
          }
        }
      }

      // 2. Invoke the generate-morning-brief Edge Function
      console.log('Morning Brief: Invoking generate-morning-brief Edge Function...')
      const { data, error } = await supabase.functions.invoke('generate-morning-brief', {
        body: { force }
      })

      if (error) {
        console.error('Morning Brief Edge Function failed (Full Object):', error)
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json().catch(() => null)
          console.error('Morning Brief Edge Function error body:', errBody)
        } else {
          console.error('Morning Brief Edge Function error.context:', error.context)
        }
        console.error('Morning Brief Edge Function error.message:', error.message)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('polaris-morning-brief-failed', { detail: error }))
        }
      } else {
        console.log('Morning Brief Edge Function succeeded:', data)

        // Fetch the generated brief from Supabase to get the exact canonical record
        let recordToPersist = null
        if (typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
          try {
            const { data: remoteBrief } = await supabase
              .from('morning_briefs')
              .select('*')
              .eq('user_id', user.id)
              .eq('date', today)
              .maybeSingle()

            if (remoteBrief) {
              recordToPersist = remoteBrief
            }
          } catch (fetchErr) {
            console.warn('Failed to fetch newly created brief from Supabase:', fetchErr)
          }
        }

        // Fallback if remote fetch failed but data.items exists
        if (!recordToPersist && data?.items) {
          const nonNewsItems = (existingBrief?.items || []).filter(
            i => i.type === 'opportunity' || i.hardware_opportunity_id
          )
          recordToPersist = {
            id: existingBrief?.id || generateUUID(),
            user_id: user.id,
            date: today,
            items: [...nonNewsItems, ...data.items],
            seen: existingBrief?.seen ?? false,
            created_at: existingBrief?.created_at || new Date().toISOString()
          }
        }

        if (recordToPersist) {
          if (db?.morning_briefs) {
            await db.morning_briefs.put(recordToPersist)
          }
          await offlineUpsert('morning_briefs', recordToPersist)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('polaris-morning-brief-updated', { detail: recordToPersist }))
          }
        }
      }
    } catch (err) {
      console.error('Morning Brief: Unexpected error invoking Edge Function:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-morning-brief-failed', { detail: err }))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!user || !autoRun) return
    
    if (!hasRun.current) {
      hasRun.current = true
      generateBrief()
    }

    // Check every hour if a new brief is needed (e.g. date rolled over)
    // generateBrief automatically skips if today's brief already exists
    const intervalId = setInterval(() => {
      generateBrief()
    }, 60 * 60 * 1000)

    return () => clearInterval(intervalId)
  }, [user, autoRun])

  return { generateBrief, isGenerating }
}
