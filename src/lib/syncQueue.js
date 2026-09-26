import db from './offlineStore';

export async function enqueue(table, operation, payload) {
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

