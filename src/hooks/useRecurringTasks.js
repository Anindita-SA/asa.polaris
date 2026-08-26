import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useRecurringTasks() {
  const { user } = useAuth()
  const [generated, setGenerated] = useState(null)
  const hasRun = useRef(false)

  useEffect(() => {
    if (!user || hasRun.current) return
    hasRun.current = true

    const generateTasks = async () => {
      const today = new Date().toLocaleDateString('en-CA')
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayStartISO = todayStart.toISOString()

      try {
        const { data: templates, error: templateError } = await supabase
          .from('recurring_task_templates')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .or(`last_generated_date.is.null,last_generated_date.lt.${today}`)

        if (templateError) {
          console.error('Error fetching recurring task templates:', templateError)
          setGenerated(0)
          return
        }

        if (!templates || templates.length === 0) {
          setGenerated(0)
          return
        }

        let count = 0

        for (const template of templates) {
          // 0. Frequency check (daily passes through by default)
          if (template.frequency === 'weekly' && template.last_generated_date) {
            const lastGen = new Date(template.last_generated_date)
            const todayDate = new Date(today)
            const diffDays = Math.round((todayDate - lastGen) / (1000 * 60 * 60 * 24))
            
            if (diffDays < 7) {
              continue // Skip if it hasn't been 7 days yet
            }
          }

          // a. Duplicate check: tasks table for source_template_id and created today
          const { data: existingTasks, error: dupError } = await supabase
            .from('tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('source_template_id', template.id)
            .gte('created_at', todayStartISO)

          if (dupError) {
            console.error('Error checking duplicate task for template:', template.id, dupError)
            continue
          }

          if (existingTasks && existingTasks.length > 0) {
            continue
          }

          // b. Insert into tasks
          const { error: insertError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: template.title,
              notes: template.notes,
              quadrant: template.quadrant,
              estimated_minutes: template.estimated_minutes,
              status: 'active',
              source_template_id: template.id,
            })

          if (insertError) {
            console.error('Error inserting recurring task for template:', template.id, insertError)
            continue
          }

          // c. Update template last_generated_date
          const { error: updateError } = await supabase
            .from('recurring_task_templates')
            .update({ last_generated_date: today })
            .eq('id', template.id)
            .eq('user_id', user.id)

          if (updateError) {
            console.error('Error updating recurring template last_generated_date:', template.id, updateError)
          }

          count += 1
        }

        console.log(`Generated ${count} recurring task(s) for ${today}`)
        setGenerated(count)
      } catch (err) {
        console.error('Unexpected error in useRecurringTasks:', err)
        setGenerated(0)
      }
    }

    generateTasks()
  }, [user])

  return { generated }
}
