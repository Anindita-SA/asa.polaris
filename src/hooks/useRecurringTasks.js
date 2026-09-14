import { useState, useEffect, useRef } from 'react'
import { offlineSelect, offlineInsert, offlineUpdate } from '../lib/offlineApi'
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

      try {
        const { data: allTemplates, error: templateError } = await offlineSelect('recurring_task_templates')
        const templates = (allTemplates || []).filter(t => t.user_id === user.id && t.is_active)

        if (templateError) {
          console.error('Error fetching recurring task templates:', templateError)
          setGenerated(0)
          return
        }

        // Fetch all tasks for this user
        const { data: dbTasks, error: activeTasksError } = await offlineSelect('tasks')
        const allTasks = (dbTasks || []).filter(t => t.user_id === user.id)
          
        if (activeTasksError) {
          console.error('Error fetching tasks:', activeTasksError)
          setGenerated(0)
          return
        }

        let count = 0

        for (const template of templates) {
          // 0. Frequency check
          if (template.frequency === 'weekly' && template.last_generated_date) {
            const lastGen = new Date(template.last_generated_date)
            const todayDate = new Date(today)
            const diffDays = Math.round((todayDate - lastGen) / (1000 * 60 * 60 * 24))
            
            if (diffDays < 7) {
              continue 
            }
          }

          const templateTitleNorm = template.title?.trim().toLowerCase()

          // Target only root tasks (!t.parent_task_id) matching source_template_id === template.id or normalized title
          const matchingRootTasks = allTasks.filter(t =>
            !t.parent_task_id &&
            (t.source_template_id === template.id || (t.title && t.title.trim().toLowerCase() === templateTitleNorm))
          )

          // If ANY open task (status !== 'done') already exists for that template, DO NOT insert or recycle anything.
          const openTask = matchingRootTasks.find(t => t.status !== 'done')

          if (openTask) {
            if (!openTask.source_template_id) {
              await offlineUpdate('tasks', { id: openTask.id }, { source_template_id: template.id })
            }
            if (!template.last_generated_date || template.last_generated_date < today) {
              const { error: updateError } = await offlineUpdate('recurring_task_templates', { id: template.id }, { last_generated_date: today })
              if (updateError) {
                console.error('Error updating recurring template last_generated_date:', template.id, updateError)
              }
            }
            continue
          }

          // If all matching tasks are done, check if template.last_generated_date < today. Only recycle if not completed today.
          const completedTasks = matchingRootTasks.filter(t => t.status === 'done')

          if (completedTasks.length > 0) {
            if (template.last_generated_date && template.last_generated_date >= today) {
              continue
            }

            // Sort by created_at descending to pick the MOST RECENT completed canonical row
            completedTasks.sort((a, b) => {
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
              return timeB - timeA
            })

            const canonicalTask = completedTasks[0]

            // Recycle the single canonical row
            const pastDates = Array.isArray(canonicalTask.completion_dates) ? canonicalTask.completion_dates : []
            const dateCompleted = template.last_generated_date || today

            const updatePayload = {
              status: 'active',
              deadline: today,
              source_template_id: template.id,
              completion_count: (canonicalTask.completion_count || 0) + 1,
              completion_dates: pastDates.includes(dateCompleted) ? pastDates : [...pastDates, dateCompleted],
              skip_count: 0
            }
            if (template.is_habit) {
              updatePayload.category = 'habits'
              updatePayload.quadrant = 'important_not_urgent'
            }

            const { error: updateTaskErr } = await offlineUpdate('tasks', { id: canonicalTask.id }, updatePayload)
            if (updateTaskErr) console.error('Error recycling recurring task:', updateTaskErr)

            // Update template last_generated_date to today
            const { error: updateError } = await offlineUpdate('recurring_task_templates', { id: template.id }, { last_generated_date: today })
            if (updateError) {
              console.error('Error updating recurring template last_generated_date:', template.id, updateError)
            }

            count += 1
          } else {
            // If no matching tasks exist at all, only insert if not already generated today
            if (template.last_generated_date && template.last_generated_date >= today) {
              continue
            }

            const insertPayload = {
              id: crypto.randomUUID(),
              user_id: user.id,
              title: template.title,
              notes: template.notes,
              deadline: today,
              quadrant: template.is_habit ? 'important_not_urgent' : template.quadrant,
              estimated_minutes: template.estimated_minutes,
              status: 'active',
              source_template_id: template.id,
              completion_count: 0,
              completion_dates: [],
              skip_count: 0,
              created_at: new Date().toISOString()
            }
            if (template.is_habit) {
              insertPayload.category = 'habits'
            }

            const { error: insertError } = await offlineInsert('tasks', insertPayload)
            if (insertError) {
              console.error('Error inserting recurring task for template:', template.id, insertError)
              continue
            }

            // Update template last_generated_date to today
            const { error: updateError } = await offlineUpdate('recurring_task_templates', { id: template.id }, { last_generated_date: today })
            if (updateError) {
              console.error('Error updating recurring template last_generated_date:', template.id, updateError)
            }

            count += 1
          }
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
