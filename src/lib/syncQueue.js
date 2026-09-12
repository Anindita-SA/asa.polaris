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

export async function clearSynced() {
  await db._syncQueue.where('synced').equals(1).delete();
}
