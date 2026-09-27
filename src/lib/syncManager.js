import { supabase } from './supabase';
import db from './offlineStore';
import { getPending, markSynced, clearSynced } from './syncQueue';
import { validateRowPayload, TABLES_REQUIRING_TITLE } from './offlineApi';

export async function pullData(table, userId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!userId) return;

  try {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
        return;
      }
      throw error;
    }

    if (!db || !db[table]) return;

    if (data && data.length > 0) {
      const validRecords = data.filter(item => {
        const { valid } = validateRowPayload(table, item);
        return valid;
      });
      if (validRecords.length > 0) {
        if (typeof db.transaction === 'function') {
          await db.transaction('rw', db[table], async () => {
            await db[table].bulkPut(validRecords);
          });
        } else {
          await db[table].bulkPut(validRecords);
        }
      }
    }
  } catch (err) {
    if (err?.code === 'PGRST205' || err?.message?.includes('schema cache') || err?.code === '42P01') {
      return;
    }
    console.error(`Error pulling data for table ${table}:`, err);
  }
}

export async function pullProfile(userId) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!userId) return;

  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;

    if (data && db.profiles) {
      await db.profiles.put(data);
    }
  } catch (err) {
    console.error('Error pulling profile:', err);
  }
}

let flushPromise = null;

export function flushQueue() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
  if (flushPromise) return flushPromise;

  flushPromise = (async () => {
    try {
    const pending = await getPending();
    if (pending.length === 0) return;

    const successfulIds = [];

    for (const item of pending) {
      try {
        if (item.operation === "insert" || item.operation === "upsert") {
          const validation = validateRowPayload(item.table, item.payload);
          if (!validation.valid) {
            console.warn(`Moving corrupted ${item.operation} payload to DLQ for ${item.table}:`, validation.error);
            const { moveToDLQ } = await import("./syncQueue");
            await moveToDLQ(item, validation.error);
            successfulIds.push(item.localId);
            continue;
          }

          const { error } = await supabase.from(item.table).upsert(validation.row || item.payload);
          if (error) throw error;
        } else if (item.operation === "update") {
          if (TABLES_REQUIRING_TITLE.includes(item.table)) {
            if (item.payload?.data?.title !== undefined && (typeof item.payload.data.title !== "string" || item.payload.data.title.trim().length === 0)) {
              console.warn(`Moving corrupted update payload to DLQ for ${item.table}: empty title`);
              const { moveToDLQ } = await import("./syncQueue");
              await moveToDLQ(item, "empty title");
              successfulIds.push(item.localId);
              continue;
            }
          }

          if (item.table === "daily_tasks") {
            const title = item.payload?.data?.title;
            const taskName = item.payload?.data?.task_name;
            if (title !== undefined && (typeof title !== "string" || title.trim().length === 0)) {
              if (taskName === undefined || typeof taskName !== "string" || taskName.trim().length === 0) {
                console.warn("Moving corrupted update payload to DLQ for daily_tasks: empty title or task_name");
                const { moveToDLQ } = await import("./syncQueue");
                await moveToDLQ(item, "empty title or task_name");
                successfulIds.push(item.localId);
                continue;
              }
            }
          }

          if (!item.payload?.match || typeof item.payload.match !== "object" || Object.keys(item.payload.match).length === 0) {
            console.warn(`Moving corrupted update payload to DLQ without match criteria for ${item.table}`);
            const { moveToDLQ } = await import("./syncQueue");
            await moveToDLQ(item, "missing match criteria");
            successfulIds.push(item.localId);
            continue;
          }

          const { error } = await supabase.from(item.table).update(item.payload.data).match(item.payload.match);
          if (error) throw error;
        } else if (item.operation === "delete") {
          if (!item.payload?.match || typeof item.payload.match !== "object" || Object.keys(item.payload.match).length === 0) {
            console.warn(`Moving corrupted delete payload to DLQ without match criteria for ${item.table}`);
            const { moveToDLQ } = await import("./syncQueue");
            await moveToDLQ(item, "missing match criteria");
            successfulIds.push(item.localId);
            continue;
          }

          const { error } = await supabase.from(item.table).delete().match(item.payload.match);
          if (error) throw error;
        }
        
        successfulIds.push(item.localId);
      } catch (error) {
        if (error?.code === 'PGRST205' || error?.message?.includes('schema cache') || error?.code === '42P01') {
          console.warn(`Table '${item.table}' not found in remote schema cache (PGRST205). Moving operation ${item.localId} to DLQ.`);
          const { moveToDLQ } = await import("./syncQueue");
          await moveToDLQ(item, error.message || `Table '${item.table}' not found in remote schema cache (PGRST205)`);
          successfulIds.push(item.localId);
          continue;
        }

        console.error(`Failed to sync operation ${item.localId} on ${item.table}:`, error);
        if (error && (error.code || error.details || error.message?.includes("violates"))) {
          console.warn(`Moving unrecoverable poison pill operation ${item.localId} to DLQ to unblock queue.`);
          const { moveToDLQ } = await import("./syncQueue");
          await moveToDLQ(item, error.message || JSON.stringify(error));
          successfulIds.push(item.localId);
          continue;
        }
        break;
      }
    }

    if (successfulIds.length > 0) {
      await clearSynced(successfulIds);
    }
  } finally {
    flushPromise = null;
  }
  })();

  return flushPromise;
}

export async function pruneDLQ() {
  if (!db.sync_errors) return;
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  try {
    const oldErrors = await db.sync_errors.where('created_at').below(cutoff).primaryKeys();
    if (oldErrors.length > 0) {
      await db.sync_errors.bulkDelete(oldErrors);
      console.log(`Pruned ${oldErrors.length} old entries from DLQ.`);
    }
  } catch (err) {
    console.error('Failed to prune DLQ:', err);
  }
}

export function initSyncManager(userId) {
  const handleOnline = () => {
    flushQueue().then(() => {
      pruneDLQ();
      if (userId) {
        // Refresh critical tables when coming online
        pullData('tasks', userId);
        pullData('daily_tasks', userId);
        pullData('goals', userId);
        pullData('milestones', userId);
        pullData('day_plan_blocks', userId);
        pullData('focus_items', userId);
        pullData('backburner', userId);
        pullData('subtasks', userId);
        pullData('recurring_task_templates', userId);
        pullData('hardware_opportunities', userId);
        pullData('eulogies', userId);
        pullData('practice_scores', userId);
        pullData('curricula', userId);
        pullData('curriculum_topics', userId);
        pullData('curriculum_resources', userId);
        pullData('curriculum_categories', userId);
        pullData('media_log', userId);
        pullData('habits', userId);
        pullData('nodes', userId);
        pullData('mini_games', userId);
        pullData('calendar_events', userId);
        pullData('calendar_backups', userId);
        pullData('nudges', userId);
        pullData('contacts', userId);
        pullData('wins', userId);
        pullData('mood_logs', userId);
        pullData('highlights', userId);
        pullData('io_logs', userId);
        pullData('pomodoro_logs', userId);
        pullData('morning_briefs', userId);
        pullData('user_settings', userId);
        pullData('outreach_targets', userId);
        pullData('habit_logs', userId);
        pullData('meal_logs', userId);
        pullData('workout_logs', userId);
        pullData('weight_logs', userId);
        pullProfile(userId);
      }
    });
  };

  window.addEventListener('online', handleOnline);

  // Initial flush when initializing (e.g. app load)
  if (navigator.onLine) {
    handleOnline();
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
