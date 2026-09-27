import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRowPayload, generateUUID } from './offlineApi';
import { pullData } from './syncManager';
import db from './offlineStore';
import { supabase } from './supabase';
import { deduplicateActiveTasks } from '../../scripts/task_triage.js';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('Data Integrity & Poison Pill Prevention Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  describe('1. UUID Generation & validateRowPayload Poison Pill Prevention', () => {
    it('generateUUID produces valid RFC4122 v4 UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toBeDefined();
      expect(typeof uuid).toBe('string');
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)).toBe(true);
    });

    it('validateRowPayload replaces numeric timestamp IDs with valid UUIDs', () => {
      const numericIdPayload = {
        id: '1727376000000',
        title: 'IELTS Writing Task 2 Mock',
        category: 'writing',
        score: 7.5,
        total: null,
        band: 7.5
      };

      const result = validateRowPayload('practice_scores', numericIdPayload);
      expect(result.valid).toBe(true);
      expect(result.row.id).not.toBe('1727376000000');
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.row.id)).toBe(true);
    });

    it('validateRowPayload generates a UUID if no id is provided', () => {
      const noIdPayload = {
        title: 'Complete Math Assignment',
        status: 'active'
      };

      const result = validateRowPayload('tasks', noIdPayload);
      expect(result.valid).toBe(true);
      expect(result.row.id).toBeDefined();
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.row.id)).toBe(true);
    });

    it('validateRowPayload preserves valid UUIDs without altering them', () => {
      const existingUuid = 'e4b3c2a1-0000-4000-8000-123456789abc';
      const validPayload = {
        id: existingUuid,
        title: 'Valid UUID Task',
        status: 'active'
      };

      const result = validateRowPayload('tasks', validPayload);
      expect(result.valid).toBe(true);
      expect(result.row.id).toBe(existingUuid);
    });

    it('validateRowPayload catches title-less ghost payloads for tables requiring titles', () => {
      const invalidPayload = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        title: '   '
      };

      const result = validateRowPayload('tasks', invalidPayload);
      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain('require a non-empty title string');
    });
  });

  describe('2. Non-Destructive Sync Manager pullData Behavior', () => {
    it('pullData preserves local Dexie records when remote table returns empty array', async () => {
      const bulkDeleteMock = vi.fn().mockResolvedValue(true);
      const bulkPutMock = vi.fn().mockResolvedValue(true);

      const originalTasksTable = db.tasks;
      const originalTransaction = db.transaction;
      db.tasks = {
        bulkDelete: bulkDeleteMock,
        bulkPut: bulkPutMock
      };
      db.transaction = vi.fn().mockImplementation(async (mode, table, fn) => { await fn(); });

      // Remote Supabase returns empty array
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }));

      try {
        await pullData('tasks', 'user-1');
        // Ensure bulkDelete was NOT called to prevent wiping local offline data
        expect(bulkDeleteMock).not.toHaveBeenCalled();
        expect(bulkPutMock).not.toHaveBeenCalled();
      } finally {
        db.tasks = originalTasksTable;
        db.transaction = originalTransaction;
      }
    });

    it('pullData updates Dexie using bulkPut without calling bulkDelete when remote has records', async () => {
      const remoteRecords = [
        { id: 'task-remote-1', title: 'Remote Task 1', status: 'active', user_id: 'user-1' }
      ];

      const bulkDeleteMock = vi.fn().mockResolvedValue(true);
      const bulkPutMock = vi.fn().mockResolvedValue(true);

      const originalTasksTable = db.tasks;
      const originalTransaction = db.transaction;
      db.tasks = {
        bulkDelete: bulkDeleteMock,
        bulkPut: bulkPutMock
      };
      db.transaction = vi.fn().mockImplementation(async (mode, table, fn) => { await fn(); });

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: remoteRecords, error: null })
        })
      }));

      try {
        await pullData('tasks', 'user-1');
        expect(bulkDeleteMock).not.toHaveBeenCalled();
        expect(bulkPutMock).toHaveBeenCalledWith(remoteRecords);
      } finally {
        db.tasks = originalTasksTable;
        db.transaction = originalTransaction;
      }
    });
  });

  describe('3. Task Triage Active Task Deduplication & History Union', () => {
    it('deduplicateActiveTasks merges completion_dates and completion_count across duplicates', () => {
      const duplicateActiveTasks = [
        {
          id: 'task-dup-1',
          title: 'Daily Meditation',
          source_template_id: 'tpl-meditate',
          status: 'active',
          completion_dates: ['2026-09-20', '2026-09-22'],
          completion_count: 2,
          created_at: '2026-09-22T08:00:00Z'
        },
        {
          id: 'task-dup-2',
          title: 'Daily Meditation',
          source_template_id: 'tpl-meditate',
          status: 'active',
          completion_dates: ['2026-09-21', '2026-09-23'],
          completion_count: 5,
          created_at: '2026-09-23T08:00:00Z'
        },
        {
          id: 'task-dup-3',
          title: 'Daily Meditation',
          source_template_id: 'tpl-meditate',
          status: 'active',
          completion_dates: ['2026-09-24'],
          completion_count: 1,
          created_at: '2026-09-24T08:00:00Z'
        }
      ];

      const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(duplicateActiveTasks);

      expect(keptTasks.length).toBe(1);
      expect(duplicateTaskIds.length).toBe(2);

      const keeper = keptTasks[0];
      // Keeper should be the most recent task (task-dup-3)
      expect(keeper.id).toBe('task-dup-3');

      // Keeper must contain the union of all completion dates
      expect(keeper.completion_dates).toEqual([
        '2026-09-20',
        '2026-09-21',
        '2026-09-22',
        '2026-09-23',
        '2026-09-24'
      ]);

      // Keeper must preserve the maximum recorded completion count
      expect(keeper.completion_count).toBe(5);

      // Duplicates list must contain the other two IDs
      expect(duplicateTaskIds).toContain('task-dup-1');
      expect(duplicateTaskIds).toContain('task-dup-2');
    });

    it('deduplicateActiveTasks handles empty or single item gracefully', () => {
      const single = [{ id: 'task-1', title: 'Single Task', status: 'active' }];
      const resSingle = deduplicateActiveTasks(single);
      expect(resSingle.keptTasks.length).toBe(1);
      expect(resSingle.duplicateTaskIds.length).toBe(0);

      const empty = deduplicateActiveTasks([]);
      expect(empty.keptTasks.length).toBe(0);
      expect(empty.duplicateTaskIds.length).toBe(0);
    });
  });

  describe('4. Historical Rollover & Habit Consolidation Integrity', () => {
    it('consolidates multi-row habit tasks without losing history during grid rendering', () => {
      const rawHabitRows = [
        {
          id: 'row-1',
          source_template_id: 'tpl-water',
          title: 'Drink 3L Water',
          status: 'done',
          completion_dates: ['2026-09-01', '2026-09-02'],
          completion_count: 2,
          created_at: '2026-09-02T10:00:00Z'
        },
        {
          id: 'row-2',
          source_template_id: 'tpl-water',
          title: 'Drink 3L Water',
          status: 'active',
          completion_dates: ['2026-09-03', '2026-09-04', '2026-09-05'],
          completion_count: 5,
          created_at: '2026-09-05T10:00:00Z'
        }
      ];

      // Simulate MonthlyHabitGrid consolidation logic
      const grouped = new Map();
      rawHabitRows.forEach(item => {
        const templateId = item.source_template_id;
        if (!grouped.has(templateId)) {
          grouped.set(templateId, []);
        }
        grouped.get(templateId).push(item);
      });

      const consolidated = [];
      for (const [tplId, items] of grouped.entries()) {
        const sorted = [...items].sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === 'active' ? -1 : 1;
          }
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        });

        const primary = { ...sorted[0] };
        const allDates = new Set();
        let maxCount = primary.completion_count || 0;

        for (const item of sorted) {
          if (Array.isArray(item.completion_dates)) {
            item.completion_dates.forEach(d => { if (d) allDates.add(d); });
          }
          if (typeof item.completion_count === 'number' && item.completion_count > maxCount) {
            maxCount = item.completion_count;
          }
        }

        const mergedDates = Array.from(allDates).sort();
        primary.completion_dates = mergedDates;
        primary.completion_count = Math.max(maxCount, mergedDates.length);
        consolidated.push(primary);
      }

      expect(consolidated.length).toBe(1);
      const habit = consolidated[0];
      expect(habit.id).toBe('row-2');
      expect(habit.status).toBe('active');
      expect(habit.completion_dates).toEqual([
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05'
      ]);
      expect(habit.completion_count).toBe(5);
    });
  });
});
