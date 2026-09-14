import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function migrateSubtasksToTasks() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('Missing Supabase URL or Key in environment variables.');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log('Fetching subtasks for migration...');
  const { data: subtasks, error: subtasksError } = await supabase
    .from('subtasks')
    .select('*');

  if (subtasksError) {
    console.error('Error fetching subtasks:', subtasksError);
    return;
  }

  if (!subtasks || subtasks.length === 0) {
    console.log('No subtasks found in subtasks table. Nothing to migrate.');
    return;
  }

  console.log(`Found ${subtasks.length} subtasks to process.`);

  // Fetch all existing tasks to check for duplicates and valid parent_task_ids
  const { data: existingTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, milestone_id, parent_task_id, user_id');

  if (tasksError) {
    console.error('Error fetching existing tasks:', tasksError);
    return;
  }

  // Fetch existing milestones to check for valid foreign key references
  const { data: existingMilestones, error: milestonesError } = await supabase
    .from('milestones')
    .select('id');

  if (milestonesError) {
    console.error('Error fetching milestones:', milestonesError);
    return;
  }

  const milestoneIds = new Set((existingMilestones || []).map(m => m.id));
  const tasksList = existingTasks || [];
  const taskIds = new Set(tasksList.map(t => t.id));

  let migratedCount = 0;
  let skippedCount = 0;

  for (const row of subtasks) {
    const parentType = row.parent_type;
    let taskPayload = null;

    if (parentType === 'milestone') {
      const validMilestoneId = milestoneIds.has(row.parent_id) ? row.parent_id : null;
      const exists = tasksList.some(
        t => t.id === row.id || (t.title === row.title && t.milestone_id === validMilestoneId)
      );
      if (!exists) {
        taskPayload = {
          id: row.id,
          user_id: row.user_id,
          milestone_id: validMilestoneId,
          parent_task_id: null,
          title: row.title,
          status: row.completed ? 'done' : 'active',
          quadrant: 'important_not_urgent',
          category: 'academic',
          created_at: row.created_at || new Date().toISOString()
        };
      }
    } else if (parentType === 'task') {
      const validParentTaskId = taskIds.has(row.parent_id) ? row.parent_id : null;
      const exists = tasksList.some(
        t => t.id === row.id || (t.title === row.title && t.parent_task_id === validParentTaskId)
      );
      if (!exists) {
        taskPayload = {
          id: row.id,
          user_id: row.user_id,
          parent_task_id: validParentTaskId,
          milestone_id: null,
          title: row.title,
          status: row.completed ? 'done' : 'active',
          quadrant: 'important_not_urgent',
          created_at: row.created_at || new Date().toISOString()
        };
      }
    } else if (parentType === 'node') {
      const exists = tasksList.some(
        t => t.id === row.id || (t.title === row.title && t.user_id === row.user_id)
      );
      if (!exists) {
        taskPayload = {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          status: row.completed ? 'done' : 'active',
          quadrant: 'important_not_urgent',
          created_at: row.created_at || new Date().toISOString()
        };
      }
    } else if (parentType === 'focus') {
      const exists = tasksList.some(
        t => t.id === row.id || (t.title === row.title && t.user_id === row.user_id)
      );
      if (!exists) {
        taskPayload = {
          id: row.id,
          user_id: row.user_id,
          title: row.title,
          status: row.completed ? 'done' : 'active',
          quadrant: 'important_not_urgent',
          created_at: row.created_at || new Date().toISOString()
        };
      }
    }

    if (taskPayload) {
      const { error: insertError } = await supabase
        .from('tasks')
        .insert(taskPayload);

      if (insertError) {
        console.error(`Failed to insert task for subtask ${row.id}:`, insertError.message);
      } else {
        tasksList.push(taskPayload);
        taskIds.add(taskPayload.id);
        migratedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log(`Migration complete. Migrated: ${migratedCount}, Skipped/Existing: ${skippedCount}`);
}

migrateSubtasksToTasks().catch(err => {
  console.error('Migration failed with exception:', err);
  process.exit(1);
});
