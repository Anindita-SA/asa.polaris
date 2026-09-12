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
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayStartISO = todayStart.toISOString()

      try {
        const { data: allTemplates, error: templateError } = await offlineSelect('recurring_task_templates')
        const templates = (allTemplates || []).filter(t => t.user_id === user.id && t.is_active && (!t.last_generated_date || t.last_generated_date < today))

        if (templateError) {
          console.error('Error fetching recurring task templates:', templateError)
          setGenerated(0)
          return
        }

        // Fetch all tasks for this user (we need to find 'done' ones to recycle)
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

          // a. Find existing task for this template (by source_template_id or exact title fallback)
          const existingTask = allTasks.find(t => t.source_template_id === template.id || t.title?.trim().toLowerCase() === template.title?.trim().toLowerCase());

          if (existingTask) {
            if (existingTask.status === 'done') {
              // RECYCLE: It was completed previously, so bring it back to active and bump completion_count
              const pastDates = Array.isArray(existingTask.completion_dates) ? existingTask.completion_dates : [];
              const dateCompleted = template.last_generated_date || today;

              const updatePayload = { 
                status: 'active',
                source_template_id: template.id,
                completion_count: (existingTask.completion_count || 0) + 1,
                completion_dates: pastDates.includes(dateCompleted) ? pastDates : [...pastDates, dateCompleted],
                skip_count: 0 // Reset nagging
              };
              if (template.is_habit) {
                updatePayload.category = 'habits';
                updatePayload.quadrant = 'important_not_urgent';
              }

              const { error: updateTaskErr } = await offlineUpdate('tasks', { id: existingTask.id }, updatePayload);

              if (updateTaskErr) console.error('Error recycling recurring task:', updateTaskErr);
            } else {
              // If existingTask.source_template_id is null, link it
              if (!existingTask.source_template_id) {
                await offlineUpdate('tasks', { id: existingTask.id }, { source_template_id: template.id });
              }
              // Skip inserting a duplicate
              continue;
            }
          } else {
            // b. Insert new task if it never existed
            const insertPayload = {
              id: crypto.randomUUID(),
              user_id: user.id,
              title: template.title,
              notes: template.notes,
              quadrant: template.is_habit ? 'important_not_urgent' : template.quadrant,
              estimated_minutes: template.estimated_minutes,
              status: 'active',
              source_template_id: template.id,
              completion_count: 0,
              completion_dates: [],
              skip_count: 0,
              created_at: new Date().toISOString()
            };
            if (template.is_habit) {
              insertPayload.category = 'habits';
            }

            const { error: insertError } = await offlineInsert('tasks', insertPayload);

            if (insertError) {
              console.error('Error inserting recurring task for template:', template.id, insertError);
              continue;
            }
          }

          // c. Update template last_generated_date
          const { error: updateError } = await offlineUpdate('recurring_task_templates', { id: template.id }, { last_generated_date: today });

          if (updateError) {
            console.error('Error updating recurring template last_generated_date:', template.id, updateError);
          }

          count += 1;
        }

        console.log(`Generated ${count} recurring task(s) for ${today}`);
        setGenerated(count);
      } catch (err) {
        console.error('Unexpected error in useRecurringTasks:', err);
        setGenerated(0);
      }
    };

    generateTasks();
  }, [user]);

  return { generated };
}
