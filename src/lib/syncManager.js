import { supabase } from './supabase';
import db from './offlineStore';
import { getPending, clearSynced } from './syncQueue';
import { validateRowPayload, TABLES_REQUIRING_TITLE } from './offlineApi';
import { markTableMissing, isTableMissing, clearMissingTables } from './missingTables';

export { isTableMissing, markTableMissing, clearMissingTables };

export const PULL_PAGE_LIMIT = 1000;

export const SYNC_TABLES = [
  'tasks', 'daily_tasks', 'goals', 'milestones', 'day_plan_blocks',
  'focus_items', 'backburner', 'subtasks', 'recurring_task_templates',
  'hardware_opportunities', 'eulogies', 'practice_scores', 'curricula',
  'curriculum_topics', 'curriculum_resources', 'curriculum_categories',
  'media_log', 'habits', 'nodes', 'mini_games', 'calendar_events',
  'calendar_backups', 'nudges', 'contacts', 'wins', 'mood_logs',
  'highlights', 'io_logs', 'pomodoro_logs', 'morning_briefs',
  'user_settings', 'outreach_targets', 'habit_logs', 'meal_logs',
  'workout_logs', 'weight_logs', 'daily_plan', 'daily_plan_items',
  'daily_plan_streams', 'day_state', 'exam_dates'
];

// Module-level state
let currentUserId = null;
let activeOnlineListener = null;
let lastFullPullTime = 0;
let fullPullPromise = null;
let flushPromise = null;
let retryAttempt = 0;
let retryTimer = null;
const FULL_PULL_MIN_INTERVAL_MS = 60 * 1000;

export function clearSyncManager() {
  currentUserId = null;
  lastFullPullTime = 0;
  fullPullPromise = null;
  flushPromise = null;
  retryAttempt = 0;
  clearMissingTables();
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  if (activeOnlineListener && typeof window !== 'undefined') {
    window.removeEventListener('online', activeOnlineListener);
    activeOnlineListener = null;
  }
}

export function _resetSyncManagerForTesting() {
  clearSyncManager();
}

export function getLastFullPullTime() {
  return lastFullPullTime;
}

export function _setLastFullPullTimeForTesting(time) {
  lastFullPullTime = time;
}

export function getCurrentSyncUserId() {
  return currentUserId;
}

export function isOnlineListenerActive() {
  return activeOnlineListener !== null;
}

export async function pullData(table, userId, triggerReason = 'direct') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (!userId) return;
  if (isTableMissing(table)) return;

  if (import.meta.env?.DEV) {
    console.log(`[SyncManager] Pull start | Reason: ${triggerReason} | Table: ${table} | User: ${userId}`);
  }

  try {
    let query = supabase
      .from(table)
      .select('*')
      .eq('user_id', userId);
    if (typeof query?.limit === 'function') {
      query = query.limit(PULL_PAGE_LIMIT);
    }
    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache') || error.code === '42P01') {
        markTableMissing(table);
        return;
      }
      throw error;
    }

    if (!db || !db[table]) return;

    const validRecords = (data || []).filter(item => {
      const { valid } = validateRowPayload(table, item);
      return valid;
    });
    const remoteMap = new Map(validRecords.map(r => [r.id, r]));

    // Fetch existing local records for this user
    let localRows = [];
    if (typeof db[table].where === 'function') {
      try {
        localRows = await db[table].where('user_id').equals(userId).toArray();
      } catch {
        if (typeof db[table].toArray === 'function') {
          const all = await db[table].toArray();
          localRows = all.filter(r => r.user_id === userId);
        }
      }
    } else if (typeof db[table].toArray === 'function') {
      const all = await db[table].toArray();
      localRows = all.filter(r => r.user_id === userId);
    }
    const localMap = new Map(localRows.map(r => [r.id, r]));

    // Identify remote additions and modifications
    const toPut = [];
    for (const remoteRow of validRecords) {
      const localRow = localMap.get(remoteRow.id);
      if (!localRow) {
        toPut.push(remoteRow);
      } else {
        if (JSON.stringify(remoteRow) !== JSON.stringify(localRow)) {
          toPut.push(remoteRow);
        }
      }
    }

    // Safety guards for remote deletions:
    // 1. Must succeed with no error (we are past error check).
    // 2. Returned count must be below the page limit (not truncated).
    const isTruncated = data && data.length >= PULL_PAGE_LIMIT;
    // 3. Response must NOT be empty while local rows exist for that user.
    const isEmptyWhileLocalExist = (!data || data.length === 0) && localRows.length > 0;

    let toDelete = [];
    let deleteSkippedReason = null;

    if (isTruncated) {
      deleteSkippedReason = `Response reached page limit (${data?.length}/${PULL_PAGE_LIMIT}); skipping deletions to prevent premature pruning`;
    } else if (isEmptyWhileLocalExist) {
      deleteSkippedReason = `Remote response was empty while ${localRows.length} local rows exist; skipping deletions`;
    } else if (data && data.length > 0 && localRows.length > 0) {
      // Find rows present locally but missing remotely
      for (const localRow of localRows) {
        if (!remoteMap.has(localRow.id)) {
          toDelete.push(localRow.id);
        }
      }

      // 4. Never delete rows with a pending item in the sync queue
      if (toDelete.length > 0 && db._syncQueue) {
        try {
          const pending = await getPending();
          const pendingIds = new Set(
            pending
              .filter(p => p.table === table)
              .map(p => p.payload?.id || p.payload?.match?.id || p.payload?.data?.id)
              .filter(Boolean)
          );
          toDelete = toDelete.filter(id => !pendingIds.has(id));
        } catch {
          // If queue check fails, proceed cautiously
        }
      }

      // 5. Never delete more than 25% of a table's local rows in one pull
      if (toDelete.length > localRows.length * 0.25) {
        const pct = Math.round((toDelete.length / localRows.length) * 100);
        console.warn(`[SyncManager] Deletion safety guard triggered for ${table}: attempted to delete ${toDelete.length} of ${localRows.length} rows (${pct}% > 25%). Skipping deletions.`);
        toDelete = [];
        deleteSkippedReason = `Deletion exceeded 25% threshold (${pct}%)`;
      }
    }

    if (deleteSkippedReason && import.meta.env?.DEV) {
      console.log(`[SyncManager] Deletion guard active for ${table}: ${deleteSkippedReason}`);
    }

    const hasChanges = toPut.length > 0 || toDelete.length > 0;
    const dispatchedEvents = [];

    if (hasChanges) {
      if (typeof db.transaction === 'function') {
        await db.transaction('rw', db[table], async () => {
          if (toPut.length > 0) await db[table].bulkPut(toPut);
          if (toDelete.length > 0) await db[table].bulkDelete(toDelete);
        });
      } else {
        if (toPut.length > 0) await db[table].bulkPut(toPut);
        if (toDelete.length > 0) await db[table].bulkDelete(toDelete);
      }

      if (['tasks', 'daily_tasks', 'goals', 'milestones', 'daily_plan', 'daily_plan_streams', 'day_state'].includes(table) && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table } }));
        dispatchedEvents.push(`polaris-tasks-changed(${table})`);
      }

      if (table === 'io_logs' && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-io-logs-changed', { detail: { table: 'io_logs' } }));
        dispatchedEvents.push('polaris-io-logs-changed(io_logs)');
      }
    }

    // Dev-only console line at end of each pull
    if (import.meta.env?.DEV) {
      console.log(`[SyncManager] Pull complete | Table: ${table} | Rows written: ${toPut.length} | Rows deleted: ${toDelete.length} | Events: ${dispatchedEvents.join(', ') || 'none'}`);
    }

    return {
      table,
      rowsWritten: toPut.length,
      rowsDeleted: toDelete.length,
      eventsDispatched: dispatchedEvents
    };
  } catch (err) {
    if (err?.code === 'PGRST205' || err?.message?.includes('schema cache') || err?.code === '42P01') {
      markTableMissing(table);
      return;
    }
    console.error(`Error pulling data for table ${table}:`, err);
    throw err;
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

function scheduleRetry(userId) {
  if (!userId || typeof window === 'undefined') return;
  if (retryTimer) clearTimeout(retryTimer);

  retryAttempt++;
  const baseDelay = Math.min(300000, 1000 * Math.pow(2, retryAttempt));
  const jitter = Math.random() * 1000;
  const delay = baseDelay + jitter;

  if (import.meta.env?.DEV) {
    console.log(`[SyncManager] Scheduling retry in ${Math.round(delay)}ms (attempt ${retryAttempt})`);
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    pullAll(userId, `retry (attempt ${retryAttempt})`);
  }, delay);
}

export function pullAll(userId, triggerReason = 'manual') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
  if (!userId) return Promise.resolve();

  const now = Date.now();
  if (lastFullPullTime > 0 && now - lastFullPullTime < FULL_PULL_MIN_INTERVAL_MS) {
    if (import.meta.env?.DEV) {
      console.log(`[SyncManager] Full pull skipped (cooldown active: ${Math.round((now - lastFullPullTime) / 1000)}s / 60s). Reason: ${triggerReason}`);
    }
    return Promise.resolve();
  }

  if (fullPullPromise) return fullPullPromise;

  fullPullPromise = (async () => {
    if (import.meta.env?.DEV) {
      console.log(`[SyncManager] Pull start | Reason: ${triggerReason} | Table: all | User: ${userId}`);
    }

    try {
      await flushQueue();
      await pruneDLQ();

      let totalWritten = 0;
      let totalDeleted = 0;
      const allEvents = new Set();
      const perTableStats = {};

      const chunkSize = 5;
      for (let i = 0; i < SYNC_TABLES.length; i += chunkSize) {
        const chunk = SYNC_TABLES.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(table => pullData(table, userId, triggerReason)));
        for (const res of results) {
          if (res) {
            totalWritten += res.rowsWritten;
            totalDeleted += res.rowsDeleted;
            res.eventsDispatched.forEach(e => allEvents.add(e));
            if (res.rowsWritten > 0 || res.rowsDeleted > 0 || res.eventsDispatched.length > 0) {
              perTableStats[res.table] = {
                written: res.rowsWritten,
                deleted: res.rowsDeleted,
                events: res.eventsDispatched
              };
            }
          }
        }
      }

      await pullProfile(userId);

      lastFullPullTime = Date.now();
      retryAttempt = 0;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-sync-complete'));
      }

      if (import.meta.env?.DEV) {
        console.log(`[SyncManager] Full pull summary | Total written: ${totalWritten} | Total deleted: ${totalDeleted} | Events dispatched: ${Array.from(allEvents).join(', ') || 'none'} | Affected tables: ${Object.keys(perTableStats).length}`);
      }
    } catch (err) {
      console.error(`[SyncManager] Full pull failed (${triggerReason}):`, err);
      scheduleRetry(userId);
    } finally {
      fullPullPromise = null;
    }
  })();

  return fullPullPromise;
}

export function initSyncManager(userId) {
  // Remove any previous online listener before adding
  if (activeOnlineListener && typeof window !== 'undefined') {
    window.removeEventListener('online', activeOnlineListener);
    activeOnlineListener = null;
  }

  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  if (!userId) {
    clearSyncManager();
    return () => {};
  }

  currentUserId = userId;

  const handleOnline = async () => {
    // 1. Flush offline write queue immediately upon reconnecting (NEVER blocked by pull cooldown)
    await flushQueue();
    await pruneDLQ();

    // 2. Full pull of tables is throttled by the 60-second cooldown
    pullAll(userId, 'online event').catch(err => {
      if (import.meta.env?.DEV) {
        console.warn('[SyncManager] Online event pull background error:', err?.message || err);
      }
    });
  };

  activeOnlineListener = handleOnline;
  if (typeof window !== 'undefined') {
    window.addEventListener('online', activeOnlineListener);
  }

  // Initial pull when initializing (e.g. app load)
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    flushQueue().then(() => {
      return pullAll(userId, 'auth init');
    }).catch(err => {
      // Prevent unhandled promise rejection during background init pull
      if (import.meta.env?.DEV) {
        console.warn('[SyncManager] Initial pull background error:', err?.message || err);
      }
    });
  }

  return () => {
    if (activeOnlineListener && typeof window !== 'undefined') {
      window.removeEventListener('online', activeOnlineListener);
      activeOnlineListener = null;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };
}
