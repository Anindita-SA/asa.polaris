import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { createSafeClient } from './lib/safe_supabase.js';

/**
 * Groups tasks by normalized title and determines which task to keep,
 * calculating merged completion_count and completion_dates.
 *
 * @param {Array} tasks - List of task objects from DB
 * @returns {Array} Array of resolution objects
 */
export function identifyDuplicatesAndMerge(tasks = []) {
  const groups = new Map();

  for (const task of tasks) {
    const key = (task.title || '').trim().toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(task);
  }

  const resolutions = [];

  for (const [titleKey, group] of groups.entries()) {
    if (group.length > 1) {
      // Sort tasks to determine the kept task:
      // 1. Task with source_template_id takes priority
      // 2. Earliest created_at takes priority
      // 3. Stable tie-breaker on id
      const sorted = [...group].sort((a, b) => {
        const aHasTpl = Boolean(a.source_template_id);
        const bHasTpl = Boolean(b.source_template_id);
        if (aHasTpl && !bHasTpl) return -1;
        if (!aHasTpl && bHasTpl) return 1;

        const aTime = a.created_at ? new Date(a.created_at).getTime() : Infinity;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : Infinity;
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return (a.id || '').localeCompare(b.id || '');
      });

      const keptTask = sorted[0];
      const duplicateTasks = sorted.slice(1);
      const duplicateIds = duplicateTasks.map(t => t.id);

      // Sum completion_count across all duplicates in group
      const totalCompletionCount = group.reduce((sum, t) => sum + (Number(t.completion_count) || 0), 0);

      // Merge unique completion_dates
      const dateSet = new Set();
      for (const t of group) {
        if (Array.isArray(t.completion_dates)) {
          for (const d of t.completion_dates) {
            if (typeof d === 'string' && d.trim()) {
              dateSet.add(d.trim());
            }
          }
        }
      }
      const mergedCompletionDates = Array.from(dateSet).sort();

      resolutions.push({
        titleKey,
        keptTask,
        duplicateTasks,
        duplicateIds,
        totalCompletionCount,
        mergedCompletionDates
      });
    }
  }

  return resolutions;
}

export async function runCleanup(supabaseClient = null) {
  console.log('Starting duplicate task cleanup...');
  const supabase = supabaseClient || (await createSafeClient('cleanup_duplicates', false, false));
  const uid = supabase._uid;

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', uid)
    .in('status', ['active', 'inbox', 'scheduled']);

  if (error) {
    console.error('Error fetching tasks for duplicate cleanup:', error);
    throw error;
  }

  if (!tasks || tasks.length === 0) {
    console.log('No active, inbox, or scheduled tasks found.');
    return { mergedGroups: 0, markedDoneCount: 0 };
  }

  const resolutions = identifyDuplicatesAndMerge(tasks);

  if (resolutions.length === 0) {
    console.log('No duplicate tasks found.');
    return { mergedGroups: 0, markedDoneCount: 0 };
  }

  console.log(`Found ${resolutions.length} duplicate group(s) across ${tasks.length} tasks.`);
  let totalMarkedDone = 0;

  for (const res of resolutions) {
    const { keptTask, duplicateIds, totalCompletionCount, mergedCompletionDates } = res;
    console.log(`Keeping task "${keptTask.title}" (${keptTask.id}). Merging ${duplicateIds.length} duplicate(s)...`);

    // Update kept task with merged count and dates
    const { error: updateErr } = await supabase
      .from('tasks')
      .update({
        completion_count: totalCompletionCount,
        completion_dates: mergedCompletionDates
      })
      .eq('id', keptTask.id)
      .eq('user_id', uid);

    if (updateErr) {
      console.error(`Failed to update kept task ${keptTask.id}:`, updateErr);
      throw updateErr;
    }

    // Mark duplicate rows with status: 'done'
    const { error: doneErr } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .in('id', duplicateIds)
      .eq('user_id', uid);

    if (doneErr) {
      console.error(`Failed to mark duplicate tasks as done:`, doneErr);
      throw doneErr;
    }

    totalMarkedDone += duplicateIds.length;
  }

  console.log(`Cleanup complete. Merged ${resolutions.length} groups and marked ${totalMarkedDone} duplicate tasks as done.`);
  return { mergedGroups: resolutions.length, markedDoneCount: totalMarkedDone };
}

const isDirectExecution = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isDirectExecution) {
  runCleanup().catch(err => {
    console.error('Duplicate cleanup failed:', err);
    process.exit(1);
  });
}
