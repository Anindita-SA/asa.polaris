import { supabase } from './supabase';
import db from './offlineStore';
import { getPending, markSynced, clearSynced } from './syncQueue';
import { validateRowPayload, TABLES_REQUIRING_TITLE } from './offlineApi';

export async function pullData(table, userId) {
  if (!navigator.onLine) return;
  if (!userId) return;

  try {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) throw error;

    if (!db[table]) return;

    await db.transaction('rw', db[table], async () => {
      // Assuming local db is specific to the current user, or we clear only this user's data
      const existing = await db[table].where('user_id').equals(userId).primaryKeys();
      await db[table].bulkDelete(existing);
      
      if (data && data.length > 0) {
        const validRecords = data.filter(item => {
          const { valid } = validateRowPayload(table, item);
          return valid;
        });
        if (validRecords.length > 0) {
          await db[table].bulkAdd(validRecords);
        }
      }
    });
  } catch (err) {
    console.error(`Error pulling data for table ${table}:`, err);
  }
}

export async function pullProfile(userId) {
  if (!navigator.onLine) return;
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

let isFlushing = false;

export async function flushQueue() {
  if (!navigator.onLine) return;
  if (isFlushing) return;
  isFlushing = true;

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
    isFlushing = false;
  }
}

export function initSyncManager(userId) {
  const handleOnline = () => {
    flushQueue().then(() => {
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




