import db from './offlineStore';

export function isGuestMode() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem('polaris_guest_mode') === 'true') {
      return true;
    }
    const tokenStr = window.localStorage.getItem('sb-msplriifoeyknlusfixm-auth-token');
    if (tokenStr) {
      const parsed = JSON.parse(tokenStr);
      if (parsed?.user?.email === 'guest@polaris.com' || parsed?.user?.id === 'a73d9cbb-92ea-4f9e-ad61-3a0c5c3c0a52') {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export function isGuestPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const GUEST_UID = 'a73d9cbb-92ea-4f9e-ad61-3a0c5c3c0a52';
  if (payload.user_id === GUEST_UID || payload.user_id === 'guest') return true;
  if (payload.match?.user_id === GUEST_UID || payload.match?.user_id === 'guest') return true;
  if (payload.data?.user_id === GUEST_UID || payload.data?.user_id === 'guest') return true;
  return false;
}

export async function enqueue(table, operation, payload) {
  // CRITICAL DEFENSE (Step 6): Guest sessions and guest payloads are strictly forbidden from enqueuing into remote sync
  if (isGuestMode() || isGuestPayload(payload)) {
    return false;
  }
  // operation: 'insert' | 'update' | 'upsert' | 'delete'
  await db._syncQueue.add({
    table,
    operation,
    payload,       // the row data or filter criteria
    synced: 0,
    createdAt: Date.now(),
  });
}

export async function getPending() {
  return db._syncQueue
    .where('synced').equals(0)
    .sortBy('createdAt');
}

export async function markSynced(localId) {
  await db._syncQueue.update(localId, { synced: 1 });
}

export async function clearSynced(localIds = []) {
  if (localIds.length > 0) {
    await db._syncQueue.bulkDelete(localIds);
  } else {
    await db._syncQueue.where('synced').equals(1).delete();
  }
}

export async function moveToDLQ(item, errorMsg) {
  if (!db.sync_errors) return;
  await db.sync_errors.add({
    table: item.table,
    operation: item.operation,
    payload: item.payload,
    error_message: errorMsg,
    created_at: Date.now()
  });
}

