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
    flushQueue().then(async () => {
      pruneDLQ();
      if (userId) {
        // Fetch all tables at once via RPC to save connection pool
        const tables = [
          'tasks', 'daily_tasks', 'goals', 'milestones', 'day_plan_blocks',
          'focus_items', 'backburner', 'subtasks', 'recurring_task_templates',
          'hardware_opportunities', 'eulogies', 'practice_scores', 'curricula',
          'curriculum_topics', 'curriculum_resources', 'curriculum_categories',
          'media_log', 'habits', 'nodes', 'mini_games', 'calendar_events',
          'calendar_backups', 'nudges', 'contacts', 'wins', 'mood_logs',
          'highlights', 'io_logs', 'pomodoro_logs', 'morning_briefs',
          'user_settings', 'outreach_targets', 'habit_logs', 'meal_logs',
          'workout_logs', 'weight_logs'
        ];

        try {
          const rpcChunkSize = 10;
          let rpcFailed = false;

          for (let i = 0; i < tables.length; i += rpcChunkSize) {
            const chunk = tables.slice(i, i + rpcChunkSize);
            const { data, error } = await supabase.rpc('get_user_data', { p_user_id: userId, p_tables: chunk });
            
            if (error) {
              console.warn(`RPC batch fetch failed for chunk ${i}:`, error);
              rpcFailed = true;
              break;
            }
            
            for (const table of chunk) {
              if (!db || !db[table]) continue;
              const records = data[table];
              if (records && records.length > 0) {
                const validRecords = records.filter(item => {
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
            }
          }
          
          if (rpcFailed) throw new Error('RPC batch fetch partially failed');
          
        } catch (err) {
          console.warn('RPC batch fetch failed or unavailable, falling back to chunked sync', err);
          const chunkSize = 5;
          for (let i = 0; i < tables.length; i += chunkSize) {
            const chunk = tables.slice(i, i + chunkSize);
            await Promise.all(chunk.map(table => pullData(table, userId)));
          }
        }

        await pullProfile(userId);
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

