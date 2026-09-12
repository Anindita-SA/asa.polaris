import db from './offlineStore';
import { enqueue } from './syncQueue';
import { flushQueue, pullData } from './syncManager';

// Return data structure `{ data, error }` to match Supabase
export async function offlineSelect(table, match = {}) {
  try {
    // Return data from Dexie
    let data;
    if (Object.keys(match).length === 0) {
      data = await db[table].toArray();
    } else {
      data = await db[table].filter(item => {
        for (const key in match) {
          if (item[key] !== match[key]) return false;
        }
        return true;
      }).toArray();
    }
    return { data, error: null };
  } catch (error) {
    console.error(`offlineSelect error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineUpsert(table, row) {
  try {
    await db[table].put(row);
    await enqueue(table, 'upsert', row);
    
    if (navigator.onLine) {
      flushQueue();
    }
    return { data: [row], error: null };
  } catch (error) {
    console.error(`offlineUpsert error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineInsert(table, row) {
  try {
    await db[table].add(row);
    await enqueue(table, 'insert', row);
    
    if (navigator.onLine) {
      flushQueue();
    }
    return { data: [row], error: null };
  } catch (error) {
    console.error(`offlineInsert error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineUpdate(table, match, data) {
  try {
    const items = await db[table].filter(item => {
      for (const key in match) {
        if (item[key] !== match[key]) return false;
      }
      return true;
    }).toArray();

    for (const item of items) {
      await db[table].update(item.id, data);
    }
    
    await enqueue(table, 'update', { match, data });
    
    if (navigator.onLine) {
      flushQueue();
    }
    return { data: items.map(i => ({ ...i, ...data })), error: null };
  } catch (error) {
    console.error(`offlineUpdate error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineDelete(table, match) {
  try {
    const items = await db[table].filter(item => {
      for (const key in match) {
        if (item[key] !== match[key]) return false;
      }
      return true;
    }).toArray();

    for (const item of items) {
      await db[table].delete(item.id);
    }

    await enqueue(table, 'delete', { match });
    
    if (navigator.onLine) {
      flushQueue();
    }
    return { data: items, error: null };
  } catch (error) {
    console.error(`offlineDelete error on ${table}:`, error);
    return { data: null, error };
  }
}
