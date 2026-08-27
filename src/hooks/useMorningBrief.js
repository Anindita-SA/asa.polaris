import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useMorningBrief({ autoRun = true } = {}) {
  const { user } = useAuth()
  const hasRun = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const generateBrief = async (force = false) => {
    console.log('[useMorningBrief] generateBrief called. force:', force);
    if (!user) return
    setIsGenerating(true)
    const today = new Date().toLocaleDateString('en-CA')

    try {
      if (!force) {
        // 1. Check if a row exists in morning_briefs for today's date and current user
        const { data: existingBrief, error: checkError } = await supabase
          .from('morning_briefs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle()

        if (checkError) {
          console.error('Morning Brief: Existing check error:', checkError)
        }

        if (existingBrief) {
          console.log('Morning Brief: Brief already exists for today. Skipping generation.')
          setIsGenerating(false)
          return
        }
      }

      // 2. Invoke the generate-morning-brief Edge Function
      console.log('Morning Brief: Invoking generate-morning-brief Edge Function...')
      const { data, error } = await supabase.functions.invoke('generate-morning-brief', {
        body: { force }
      })

      if (error) {
        console.error('Morning Brief Edge Function failed (Full Object):', error);
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json().catch(() => null);
          console.error('Morning Brief Edge Function error body:', errBody);
        } else {
          console.error('Morning Brief Edge Function error.context:', error.context);
        }
        console.error('Morning Brief Edge Function error.message:', error.message);
      } else {
        console.log('Morning Brief Edge Function succeeded:', data)
      }
    } catch (err) {
      console.error('Morning Brief: Unexpected error invoking Edge Function:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (!user || !autoRun || hasRun.current) return
    hasRun.current = true
    generateBrief()
  }, [user, autoRun])

  return { generateBrief, isGenerating }
}
