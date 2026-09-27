import db from './offlineStore';
import { supabase } from './supabase';
import { enqueue } from './syncQueue';
import { flushQueue } from './syncManager';

export const TABLES_REQUIRING_TITLE = [
  'tasks',
  'focus_items',
  'backburner',
  'milestones',
  'goals',
  'subtasks',
  'nudges',
  'recurring_task_templates'
];

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export function validateRowPayload(table, row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {
      valid: false,
      error: new Error('Invalid row payload: payload must be a non-null object')
    };
  }

  if (TABLES_REQUIRING_TITLE.includes(table)) {
    if (typeof row.title !== 'string' || row.title.trim().length === 0) {
      return {
        valid: false,
        error: new Error(`Validation error: '${table}' records require a non-empty title string`)
      };
    }
  }

  if (table === 'daily_tasks') {
    const hasTitle = typeof row.title === 'string' && row.title.trim().length > 0;
    const hasTaskName = typeof row.task_name === 'string' && row.task_name.trim().length > 0;
    if (!hasTitle && !hasTaskName) {
      return {
        valid: false,
        error: new Error("Validation error: 'daily_tasks' records require a non-empty title or task_name")
      };
    }
  }

  const validatedRow = { ...row };
  const isInvalidId = !validatedRow.id ||
    typeof validatedRow.id === 'number' ||
    /^\d+$/.test(String(validatedRow.id)) ||
    (typeof validatedRow.id === 'string' && (validatedRow.id.startsWith('temp') || validatedRow.id.startsWith('ielts-mock-')));

  if (isInvalidId) {
    validatedRow.id = generateUUID();
  }

  if (!row.id || typeof row.id === 'number' || /^\d+$/.test(String(row.id)) || (typeof row.id === 'string' && (row.id.startsWith('temp') || row.id.startsWith('ielts-mock-')))) {
    row.id = validatedRow.id;
  }

  return {
    valid: true,
    error: null,
    row: validatedRow
  };
}

// Return data structure `{ data, error }` to match Supabase
export async function offlineSelect(table, match = {}) {
  try {
    if (!db || !db[table]) {
      return { data: [], error: null };
    }

    let rawData;
    if (Object.keys(match).length === 0) {
      rawData = await db[table].toArray();
    } else {
      rawData = await db[table].filter(item => {
        for (const key in match) {
          if (item[key] !== match[key]) return false;
        }
        return true;
      }).toArray();
    }

    const isGhostRecord = (item) => {
      if (!item || typeof item !== 'object') return true;
      if (TABLES_REQUIRING_TITLE.includes(table)) {
        return typeof item.title !== 'string' || item.title.trim().length === 0;
      }
      if (table === 'daily_tasks') {
        const hasTitle = typeof item.title === 'string' && item.title.trim().length > 0;
        const hasTaskName = typeof item.task_name === 'string' && item.task_name.trim().length > 0;
        return !hasTitle && !hasTaskName;
      }
      return false;
    };

    const ghostItems = (rawData || []).filter(isGhostRecord);
    if (ghostItems.length > 0) {
      const ghostIds = ghostItems.map(i => i.id).filter(Boolean);
      if (ghostIds.length > 0) {
        db[table].bulkDelete(ghostIds).catch(err => {
          console.error(`Dexie ghost cleanup error on ${table}:`, err);
        });
      }
    }

    const cleanData = (rawData || []).filter(item => !isGhostRecord(item));
    return { data: cleanData, error: null };
  } catch (error) {
    console.error(`offlineSelect error on ${table}:`, error);
    // Fallback to Supabase if IndexedDB / Dexie is missing or throwing
    if (typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
      try {
        let query = supabase.from(table).select('*');
        for (const key in match) {
          query = query.eq(key, match[key]);
        }
        const { data: sbData, error: sbErr } = await query;
        if (!sbErr && sbData) {
          return { data: sbData, error: null };
        }
      } catch (sbEx) {}
    }
    return { data: [], error };
  }
}

export async function offlineUpsert(table, row) {
  try {
    const validation = validateRowPayload(table, row);
    if (!validation.valid) {
      return { data: null, error: validation.error };
    }
    const payload = validation.row || row;

    if (!db[table]) {
      return { data: [payload], error: null };
    }

    await db[table].put(payload);
    await enqueue(table, 'upsert', payload);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table, operation: 'upsert', data: payload }
      }));
    }

    if (navigator.onLine) {
      flushQueue();
    }
    return { data: [payload], error: null };
  } catch (error) {
    console.error(`offlineUpsert error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineInsert(table, row) {
  try {
    const validation = validateRowPayload(table, row);
    if (!validation.valid) {
      return { data: null, error: validation.error };
    }
    const payload = validation.row || row;

    if (!db[table]) {
      return { data: [payload], error: null };
    }

    await db[table].add(payload);
    await enqueue(table, 'insert', payload);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table, operation: 'insert', data: payload }
      }));
    }

    if (navigator.onLine) {
      flushQueue();
    }
    return { data: [payload], error: null };
  } catch (error) {
    console.error(`offlineInsert error on ${table}:`, error);
    return { data: null, error };
  }
}

export async function offlineUpdate(table, match, data) {
  try {
    if (TABLES_REQUIRING_TITLE.includes(table)) {
      if (data?.title !== undefined && (typeof data.title !== 'string' || data.title.trim().length === 0)) {
        return {
          data: null,
          error: new Error(`Validation error: cannot update '${table}' with empty title`)
        };
      }
    }

    if (table === 'daily_tasks') {
      if (data?.title !== undefined && (typeof data.title !== 'string' || data.title.trim().length === 0)) {
        if (data?.task_name === undefined || typeof data.task_name !== 'string' || data.task_name.trim().length === 0) {
          return {
            data: null,
            error: new Error("Validation error: cannot update 'daily_tasks' with empty title or task_name")
          };
        }
      }
      if (data?.task_name !== undefined && (typeof data.task_name !== 'string' || data.task_name.trim().length === 0)) {
        if (data?.title === undefined || typeof data.title !== 'string' || data.title.trim().length === 0) {
          return {
            data: null,
            error: new Error("Validation error: cannot update 'daily_tasks' with empty title or task_name")
          };
        }
      }
    }

    if (!db[table]) {
      return { data: [], error: null };
    }

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
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table, operation: 'update', match, data }
      }));
    }

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
    if (!db[table]) {
      return { data: [], error: null };
    }

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
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table, operation: 'delete', match }
      }));
    }

    if (navigator.onLine) {
      flushQueue();
    }
    return { data: items, error: null };
  } catch (error) {
    console.error(`offlineDelete error on ${table}:`, error);
    return { data: null, error };
  }
}
