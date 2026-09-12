import { supabase } from './supabase';
import db from './offlineStore';
import { getPending, markSynced, clearSynced } from './syncQueue';

export async function pullData(table, userId) {
  if (!navigator.onLine) return;
  if (!userId) return;

  try {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) throw error;

    await db.transaction('rw', db[table], async () => {
      // Assuming local db is specific to the current user, or we clear only this user's data
      const existing = await db[table].where('user_id').equals(userId).primaryKeys();
      await db[table].bulkDelete(existing);
      
      if (data && data.length > 0) {
        await db[table].bulkAdd(data);
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

    if (data) {
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
        const { error } = await supabase.from(item.table).upsert(item.payload);
        if (error) throw error;
      } else if (item.operation === 'update') {
        const { error } = await supabase.from(item.table).update(item.payload.data).match(item.payload.match);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const { error } = await supabase.from(item.table).delete().match(item.payload.match);
        if (error) throw error;
      }
      
      await markSynced(item.localId);
    } catch (error) {
      console.error(`Failed to sync operation ${item.localId} on ${item.table}:`, error);
      // Stop flushing on error to maintain order
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
