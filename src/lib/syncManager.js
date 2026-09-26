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

export async function flushQueue() {
  if (!navigator.onLine) return;

  const pending = await getPending();
  if (pending.length === 0) return;

  for (const item of pending) {
    try {
      if (item.operation === 'insert' || item.operation === 'upsert') {
        const validation = validateRowPayload(item.table, item.payload);
        if (!validation.valid) {
          console.warn(`Dropping corrupted ${item.operation} payload in sync queue for ${item.table}:`, validation.error);
          await markSynced(item.localId);
          continue;
        }

        const { error } = await supabase.from(item.table).upsert(validation.row || item.payload);
        if (error) throw error;
      } else if (item.operation === 'update') {
        if (TABLES_REQUIRING_TITLE.includes(item.table)) {
          if (item.payload?.data?.title !== undefined && (typeof item.payload.data.title !== 'string' || item.payload.data.title.trim().length === 0)) {
            console.warn(`Dropping corrupted update payload in sync queue for ${item.table}: empty title`);
            await markSynced(item.localId);
            continue;
          }
        }

        if (item.table === 'daily_tasks') {
          const title = item.payload?.data?.title;
          const taskName = item.payload?.data?.task_name;
          if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
            if (taskName === undefined || typeof taskName !== 'string' || taskName.trim().length === 0) {
              console.warn("Dropping corrupted update payload in sync queue for daily_tasks: empty title or task_name");
              await markSynced(item.localId);
              continue;
            }
          }
          if (taskName !== undefined && (typeof taskName !== 'string' || taskName.trim().length === 0)) {
            if (title === undefined || typeof title !== 'string' || title.trim().length === 0) {
              console.warn("Dropping corrupted update payload in sync queue for daily_tasks: empty title or task_name");
              await markSynced(item.localId);
              continue;
            }
          }
        }

        if (!item.payload?.match || typeof item.payload.match !== 'object' || Object.keys(item.payload.match).length === 0) {
          console.warn(`Dropping corrupted update payload without match criteria for ${item.table}`);
          await markSynced(item.localId);
          continue;
        }

        const { error } = await supabase.from(item.table).update(item.payload.data).match(item.payload.match);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        if (!item.payload?.match || typeof item.payload.match !== 'object' || Object.keys(item.payload.match).length === 0) {
          console.warn(`Dropping corrupted delete payload without match criteria for ${item.table}`);
          await markSynced(item.localId);
          continue;
        }

        const { error } = await supabase.from(item.table).delete().match(item.payload.match);
        if (error) throw error;
      }
      
      await markSynced(item.localId);
    } catch (error) {
      console.error(`Failed to sync operation ${item.localId} on ${item.table}:`, error);
      // If it's a hard database error from Supabase (e.g., constraint violation, bad data), discard it.
      // Supabase errors typically have a 'code' or 'details' property, whereas network errors are usually TypeError.
      if (error && (error.code || error.details || error.message?.includes('violates'))) {
        console.warn(`Discarding unrecoverable poison pill operation ${item.localId} to unblock queue.`);
        await markSynced(item.localId);
        continue;
      }
      // Stop flushing on network error to maintain order
      break;
    }
  }

  await clearSynced();
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

