// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateRowPayload,
  offlineInsert,
  offlineUpsert,
  offlineUpdate,
  offlineSelect,
  TABLES_REQUIRING_TITLE
} from './offlineApi';
import db from './offlineStore';
import { enqueue } from './syncQueue';
import { flushQueue } from './syncManager';

vi.mock('./syncQueue', () => ({
  enqueue: vi.fn().mockResolvedValue(1)
}));

vi.mock('./syncManager', () => ({
  flushQueue: vi.fn(),
  pullData: vi.fn()
}));

vi.mock('./offlineStore', () => {
  const store = {};
  const createTable = () => {
    let items = [];
    return {
      _getItems: () => items,
      _setItems: (newItems) => { items = [...newItems]; },
      add: vi.fn(async (row) => {
        items.push({ ...row });
        return row.id;
      }),
      put: vi.fn(async (row) => {
        const idx = items.findIndex(i => i.id === row.id);
        if (idx >= 0) {
          items[idx] = { ...row };
        } else {
          items.push({ ...row });
        }
        return row.id;
      }),
      update: vi.fn(async (id, data) => {
        const idx = items.findIndex(i => i.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx], ...data };
          return 1;
        }
        return 0;
      }),
      delete: vi.fn(async (id) => {
        items = items.filter(i => i.id !== id);
      }),
      bulkDelete: vi.fn(async (ids) => {
        const idSet = new Set(ids);
        items = items.filter(i => !idSet.has(i.id));
      }),
      toArray: vi.fn(async () => [...items]),
      filter: vi.fn((predicate) => ({
        toArray: async () => items.filter(predicate),
        delete: async () => {
          items = items.filter(i => !predicate(i));
        }
      }))
    };
  };

  const tables = [
    'tasks',
    'focus_items',
    'backburner',
    'milestones',
    'goals',
    'subtasks',
    'nudges',
    'recurring_task_templates',
    'daily_tasks',
    'day_plan_blocks',
    'profiles',
    'eulogies'
  ];

  tables.forEach(t => {
    store[t] = createTable();
  });

  return {
    default: store
  };
});

describe('offlineApi - validateRowPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid non-object row payloads', () => {
    expect(validateRowPayload('tasks', null).valid).toBe(false);
    expect(validateRowPayload('tasks', undefined).valid).toBe(false);
    expect(validateRowPayload('tasks', 'string payload').valid).toBe(false);
    expect(validateRowPayload('tasks', 12345).valid).toBe(false);
    expect(validateRowPayload('tasks', [1, 2, 3]).valid).toBe(false);
  });

  it('rejects missing or empty titles for all tables requiring title', () => {
    for (const table of TABLES_REQUIRING_TITLE) {
      const missingTitle = validateRowPayload(table, { user_id: 'u1' });
      expect(missingTitle.valid).toBe(false);
      expect(missingTitle.error).toBeInstanceOf(Error);
      expect(missingTitle.error.message).toContain(table);

      const emptyTitle = validateRowPayload(table, { title: '', user_id: 'u1' });
      expect(emptyTitle.valid).toBe(false);

      const whitespaceTitle = validateRowPayload(table, { title: '   \t  \n ', user_id: 'u1' });
      expect(whitespaceTitle.valid).toBe(false);

      const nonStringTitle = validateRowPayload(table, { title: 42, user_id: 'u1' });
      expect(nonStringTitle.valid).toBe(false);
    }
  });

  it('accepts valid non-empty titles for tables requiring title', () => {
    for (const table of TABLES_REQUIRING_TITLE) {
      const result = validateRowPayload(table, { title: 'Valid Record', user_id: 'u1' });
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.row.title).toBe('Valid Record');
      expect(result.row.id).toBeDefined();
    }
  });

  it('validates daily_tasks requiring non-empty title or task_name', () => {
    const neither = validateRowPayload('daily_tasks', { user_id: 'u1' });
    expect(neither.valid).toBe(false);

    const emptyBoth = validateRowPayload('daily_tasks', { title: '', task_name: '   ' });
    expect(emptyBoth.valid).toBe(false);

    const withTitle = validateRowPayload('daily_tasks', { title: 'Morning Workout' });
    expect(withTitle.valid).toBe(true);
    expect(withTitle.row.id).toBeDefined();

    const withTaskName = validateRowPayload('daily_tasks', { task_name: 'Evening Reading' });
    expect(withTaskName.valid).toBe(true);
    expect(withTaskName.row.id).toBeDefined();
  });

  it('ensures row.id is populated with a generated UUID if missing or preserved if present', () => {
    const withoutId = { title: 'Generated ID Task' };
    const res1 = validateRowPayload('tasks', withoutId);
    expect(res1.valid).toBe(true);
    expect(res1.row.id).toBeTruthy();
    expect(withoutId.id).toBeTruthy();

    const withId = { id: 'custom-uuid-123', title: 'Existing ID Task' };
    const res2 = validateRowPayload('tasks', withId);
    expect(res2.valid).toBe(true);
    expect(res2.row.id).toBe('custom-uuid-123');
  });

  it('accepts valid rows for tables not requiring title', () => {
    const result = validateRowPayload('eulogies', { content: 'My life philosophy' });
    expect(result.valid).toBe(true);
    expect(result.row.id).toBeDefined();
    expect(result.row.content).toBe('My life philosophy');
  });
});

describe('offlineApi - offlineInsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach(table => {
      if (table._setItems) table._setItems([]);
    });
  });

  it('rejects empty string titles for focus_items, tasks, and backburner', async () => {
    const badFocus = await offlineInsert('focus_items', { title: '', user_id: 'u1' });
    expect(badFocus.data).toBeNull();
    expect(badFocus.error).toBeInstanceOf(Error);
    expect(db.focus_items.add).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    const badTask = await offlineInsert('tasks', { title: '   ', user_id: 'u1' });
    expect(badTask.data).toBeNull();
    expect(badTask.error).toBeInstanceOf(Error);
    expect(db.tasks.add).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    const badBackburner = await offlineInsert('backburner', { user_id: 'u1' });
    expect(badBackburner.data).toBeNull();
    expect(badBackburner.error).toBeInstanceOf(Error);
    expect(db.backburner.add).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('successfully inserts valid payload and enqueues mutation', async () => {
    const eventSpy = vi.fn();
    window.addEventListener('polaris-tasks-changed', eventSpy);

    const validRow = { title: 'Master Quantum Physics', category: 'academic', user_id: 'u1' };
    const result = await offlineInsert('focus_items', validRow);

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].title).toBe('Master Quantum Physics');
    expect(result.data[0].id).toBeDefined();
    expect(db.focus_items.add).toHaveBeenCalledWith(expect.objectContaining({ title: 'Master Quantum Physics' }));
    expect(enqueue).toHaveBeenCalledWith('focus_items', 'insert', expect.objectContaining({ title: 'Master Quantum Physics' }));
    expect(eventSpy).toHaveBeenCalled();

    window.removeEventListener('polaris-tasks-changed', eventSpy);
  });
});

describe('offlineApi - offlineUpsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach(table => {
      if (table._setItems) table._setItems([]);
    });
  });

  it('rejects invalid payloads on offlineUpsert', async () => {
    const badGoal = await offlineUpsert('goals', { title: '   ' });
    expect(badGoal.data).toBeNull();
    expect(badGoal.error).toBeInstanceOf(Error);
    expect(db.goals.put).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    const nullPayload = await offlineUpsert('milestones', null);
    expect(nullPayload.data).toBeNull();
    expect(nullPayload.error).toBeInstanceOf(Error);
    expect(db.milestones.put).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('successfully upserts valid payload and enqueues mutation', async () => {
    const row = { id: 'goal-1', title: 'Complete thesis draft', target: 100, user_id: 'u1' };
    const result = await offlineUpsert('goals', row);

    expect(result.error).toBeNull();
    expect(result.data).toEqual([row]);
    expect(db.goals.put).toHaveBeenCalledWith(row);
    expect(enqueue).toHaveBeenCalledWith('goals', 'upsert', row);
  });
});

describe('offlineApi - offlineUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach(table => {
      if (table._setItems) table._setItems([]);
    });
  });

  it('rejects updating title to whitespace or empty for tables requiring title', async () => {
    db.tasks._setItems([{ id: 'task-1', title: 'Initial Title', user_id: 'u1' }]);

    const emptyRes = await offlineUpdate('tasks', { id: 'task-1' }, { title: '' });
    expect(emptyRes.data).toBeNull();
    expect(emptyRes.error).toBeInstanceOf(Error);
    expect(db.tasks.update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    const spaceRes = await offlineUpdate('tasks', { id: 'task-1' }, { title: '   ' });
    expect(spaceRes.data).toBeNull();
    expect(spaceRes.error).toBeInstanceOf(Error);
    expect(db.tasks.update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects updating daily_tasks to empty title and empty task_name', async () => {
    db.daily_tasks._setItems([{ id: 'dt-1', title: 'Daily Workout', user_id: 'u1' }]);

    const res = await offlineUpdate('daily_tasks', { id: 'dt-1' }, { title: '', task_name: '' });
    expect(res.data).toBeNull();
    expect(res.error).toBeInstanceOf(Error);
    expect(db.daily_tasks.update).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('allows updating non-title fields and valid non-empty titles', async () => {
    db.tasks._setItems([{ id: 'task-1', title: 'Initial Title', status: 'inbox', user_id: 'u1' }]);

    // Non-title update
    const statusUpdate = await offlineUpdate('tasks', { id: 'task-1' }, { status: 'done' });
    expect(statusUpdate.error).toBeNull();
    expect(statusUpdate.data[0].status).toBe('done');
    expect(db.tasks.update).toHaveBeenCalledWith('task-1', { status: 'done' });

    // Valid title update
    const titleUpdate = await offlineUpdate('tasks', { id: 'task-1' }, { title: 'Updated Task Name' });
    expect(titleUpdate.error).toBeNull();
    expect(titleUpdate.data[0].title).toBe('Updated Task Name');
    expect(db.tasks.update).toHaveBeenCalledWith('task-1', { title: 'Updated Task Name' });
  });
});

describe('offlineApi - offlineSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(db).forEach(table => {
      if (table._setItems) table._setItems([]);
    });
  });

  it('purges and filters out ghost items from Dexie for tables requiring title', async () => {
    const initialItems = [
      { id: 'f-valid-1', title: 'Valid Item 1', status: 'active', user_id: 'u1' },
      { id: 'f-ghost-1', title: '', status: 'active', user_id: 'u1' },
      { id: 'f-ghost-2', title: '   ', status: 'active', user_id: 'u1' },
      { id: 'f-valid-2', title: 'Valid Item 2', status: 'active', user_id: 'u1' },
      { id: 'f-ghost-3', title: null, status: 'active', user_id: 'u1' }
    ];

    db.focus_items._setItems(initialItems);

    const { data, error } = await offlineSelect('focus_items');

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data.map(d => d.id)).toEqual(['f-valid-1', 'f-valid-2']);

    // Asynchronous Dexie cleanup should be triggered for ghost items
    expect(db.focus_items.bulkDelete).toHaveBeenCalledWith(['f-ghost-1', 'f-ghost-2', 'f-ghost-3']);
  });

  it('filters out ghost items when match filter is provided', async () => {
    const initialTasks = [
      { id: 't1', title: 'Valid Task User 1', user_id: 'u1' },
      { id: 't2', title: '   ', user_id: 'u1' },
      { id: 't3', title: 'Valid Task User 2', user_id: 'u2' }
    ];

    db.tasks._setItems(initialTasks);

    const { data, error } = await offlineSelect('tasks', { user_id: 'u1' });

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('t1');
    expect(db.tasks.bulkDelete).toHaveBeenCalledWith(['t2']);
  });

  it('filters out ghost items for daily_tasks', async () => {
    const initialDailyTasks = [
      { id: 'dt1', title: 'Valid by title', user_id: 'u1' },
      { id: 'dt2', task_name: 'Valid by task_name', user_id: 'u1' },
      { id: 'dt3', title: '', task_name: '   ', user_id: 'u1' }
    ];

    db.daily_tasks._setItems(initialDailyTasks);

    const { data, error } = await offlineSelect('daily_tasks');

    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data.map(d => d.id)).toEqual(['dt1', 'dt2']);
    expect(db.daily_tasks.bulkDelete).toHaveBeenCalledWith(['dt3']);
  });
});
