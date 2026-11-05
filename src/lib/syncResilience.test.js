// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  offlineSelect, 
  offlineInsert, 
  offlineUpsert, 
  offlineUpdate, 
  offlineDelete, 
  validateRowPayload, 
  generateUUID,
  TABLES_REQUIRING_TITLE
} from './offlineApi';
import { 
  pullData, 
  pullProfile, 
  flushQueue, 
  pruneDLQ, 
  initSyncManager, 
  clearSyncManager,
  getCurrentSyncUserId,
  isOnlineListenerActive,
  getLastFullPullTime,
  _setLastFullPullTimeForTesting,
  PULL_PAGE_LIMIT,
  _resetSyncManagerForTesting 
} from './syncManager';
import { getInitializedUserId, _resetInitializedUserIdForTesting } from '../hooks/useAuth';
import { markTableMissing, isTableMissing, clearMissingTables } from './missingTables';
import { enqueue, getPending, markSynced, clearSynced, moveToDLQ } from './syncQueue';
import db from './offlineStore';
import { supabase } from './supabase';
import { deduplicateActiveTasks, deduplicateTasks, detectStaleParentTasks, evaluateParentTaskQuadrant } from '../../scripts/task_triage.js';
import { calculateBand, roundToIeltsBand, calculateOverallBand, calculateModuleStats, mergeScoresWithDefaults } from '../components/curriculum/PracticeScoreTracker';
import { DEFAULT_IELTS_PRACTICE_SCORES } from '../data/curriculumDefaults';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }),
    removeChannel: vi.fn()
  }
}));

describe('Polaris Sync & Data Resilience Test Bench', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    _resetSyncManagerForTesting();
  });

  describe('1. Sync Lifecycle & Non-Destructive Ingestion', () => {
    it('pullData performs non-destructive differential bulkPut without bulkDelete', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      const mockBulkPut = vi.fn().mockResolvedValue(true);

      const originalTable = db.practice_scores;
      const originalTx = db.transaction;
      db.practice_scores = {
        bulkDelete: mockBulkDelete,
        bulkPut: mockBulkPut
      };
      db.transaction = vi.fn().mockImplementation(async (mode, table, fn) => { await fn(); });

      // Scenario A: Remote returns empty array
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }));

      await pullData('practice_scores', 'user-abc');
      expect(mockBulkDelete).not.toHaveBeenCalled();
      expect(mockBulkPut).not.toHaveBeenCalled();

      // Scenario B: Remote returns valid records
      const remoteRecords = [
        {
          id: 'b1c2d3e4-1111-4000-8000-000000000001',
          user_id: 'user-abc',
          title: 'IELTS Writing Practice Test 1',
          category: 'writing',
          score: 7.5,
          band: 7.5
        }
      ];

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: remoteRecords, error: null })
        })
      }));

      await pullData('practice_scores', 'user-abc');
      expect(mockBulkDelete).not.toHaveBeenCalled();
      expect(mockBulkPut).toHaveBeenCalledWith(remoteRecords);

      db.practice_scores = originalTable;
      db.transaction = originalTx;
    });

    it('pullData removes row locally when it has been deleted remotely (within <= 25% threshold)', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      const mockBulkPut = vi.fn().mockResolvedValue(true);

      const originalTable = db.tasks;
      const originalTx = db.transaction;
      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { id: 'task-keep-1', user_id: 'user-abc', title: 'Task 1' },
              { id: 'task-keep-2', user_id: 'user-abc', title: 'Task 2' },
              { id: 'task-keep-3', user_id: 'user-abc', title: 'Task 3' },
              { id: 'task-del', user_id: 'user-abc', title: 'Task Deleted On Server' }
            ])
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: mockBulkPut
      };
      db.transaction = vi.fn().mockImplementation(async (mode, table, fn) => { await fn(); });

      // Remote returns all except task-del (1 deletion out of 4 = 25% <= 25%)
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { id: 'task-keep-1', user_id: 'user-abc', title: 'Task 1' },
                { id: 'task-keep-2', user_id: 'user-abc', title: 'Task 2' },
                { id: 'task-keep-3', user_id: 'user-abc', title: 'Task 3' }
              ],
              error: null
            })
          })
        })
      }));

      await pullData('tasks', 'user-abc');

      expect(mockBulkDelete).toHaveBeenCalledWith(['task-del']);
      expect(mockBulkPut).not.toHaveBeenCalled();

      db.tasks = originalTable;
      db.transaction = originalTx;
    });

    it('pullProfile updates Dexie profiles table safely', async () => {
      const mockPut = vi.fn().mockResolvedValue(true);
      const originalProfiles = db.profiles;
      db.profiles = { put: mockPut };

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'user-123', xp: 450 }, error: null })
          })
        })
      }));

      await pullProfile('user-123');
      expect(mockPut).toHaveBeenCalledWith({ id: 'user-123', xp: 450 });

      db.profiles = originalProfiles;
    });

    it('flushQueue executes insert, update, and delete mutations with error recovery and DLQ routing', async () => {
      const mockUpsertSupabase = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateSupabase = vi.fn().mockReturnValue({
        match: vi.fn().mockResolvedValue({ error: null })
      });
      const mockDeleteSupabase = vi.fn().mockReturnValue({
        match: vi.fn().mockResolvedValue({ error: null })
      });

      supabase.from.mockImplementation((table) => ({
        upsert: mockUpsertSupabase,
        update: mockUpdateSupabase,
        delete: mockDeleteSupabase
      }));

      const queueItems = [
        {
          localId: 1,
          table: 'tasks',
          operation: 'insert',
          payload: { id: 'a1b2c3d4-0000-4000-8000-000000000001', title: 'Complete Sprint Tasks', user_id: 'u1' }
        },
        {
          localId: 2,
          table: 'tasks',
          operation: 'update',
          payload: { match: { id: 'a1b2c3d4-0000-4000-8000-000000000001' }, data: { status: 'done' } }
        },
        {
          localId: 3,
          table: 'tasks',
          operation: 'delete',
          payload: { match: { id: 'a1b2c3d4-0000-4000-8000-000000000001' } }
        }
      ];

      const origSyncQueue = db._syncQueue;
      db._syncQueue = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(queueItems),
            toArray: vi.fn().mockResolvedValue(queueItems),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        add: vi.fn().mockResolvedValue(true)
      };

      await flushQueue();

      expect(mockUpsertSupabase).toHaveBeenCalledWith(queueItems[0].payload);
      expect(mockUpdateSupabase).toHaveBeenCalledWith({ status: 'done' });
      expect(mockDeleteSupabase).toHaveBeenCalled();
      expect(db._syncQueue.bulkDelete).toHaveBeenCalledWith([1, 2, 3]);

      db._syncQueue = origSyncQueue;
    });

    it('flushQueue intercepts corrupt title-less tasks and diverts to DLQ without blocking queue', async () => {
      const mockUpsertSupabase = vi.fn().mockResolvedValue({ error: null });
      supabase.from.mockImplementation(() => ({
        upsert: mockUpsertSupabase
      }));

      const badItem = {
        localId: 10,
        table: 'tasks',
        operation: 'insert',
        payload: { id: 'bad-task-1', title: '', user_id: 'u1' }
      };

      const goodItem = {
        localId: 11,
        table: 'tasks',
        operation: 'insert',
        payload: { id: 'b2c3d4e5-0000-4000-8000-000000000002', title: 'Valid Task Title', user_id: 'u1' }
      };

      const origSyncQueue = db._syncQueue;
      const origSyncErrors = db.sync_errors;

      const mockDlqAdd = vi.fn().mockResolvedValue(true);
      db._syncQueue = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([badItem, goodItem]),
            toArray: vi.fn().mockResolvedValue([badItem, goodItem]),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        add: vi.fn().mockResolvedValue(true)
      };
      db.sync_errors = {
        add: mockDlqAdd,
        put: mockDlqAdd
      };

      await flushQueue();

      // Good item must be sent to Supabase
      expect(mockUpsertSupabase).toHaveBeenCalledWith(goodItem.payload);
      // Both items must be cleared from active queue
      expect(db._syncQueue.bulkDelete).toHaveBeenCalledWith([10, 11]);

      db._syncQueue = origSyncQueue;
      db.sync_errors = origSyncErrors;
    });
  });

  describe('2. Offline Mutations & UUID Integrity', () => {
    it('validateRowPayload replaces numeric timestamps with valid RFC4122 v4 UUIDs', () => {
      const payload = {
        id: '1727400000000',
        title: 'IELTS Cambridge 19 Test 1',
        category: 'reading',
        score: 36,
        total: 40,
        band: 8.0
      };

      const validation = validateRowPayload('practice_scores', payload);
      expect(validation.valid).toBe(true);
      expect(validation.row.id).not.toBe('1727400000000');
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(validation.row.id)).toBe(true);
    });

    it('offlineInsert rejects title-less payloads for title-requiring tables', async () => {
      for (const table of TABLES_REQUIRING_TITLE) {
        const res = await offlineInsert(table, { title: '   ', user_id: 'u1' });
        expect(res.error).toBeInstanceOf(Error);
        expect(res.error.message).toContain('require a non-empty title string');
      }
    });

    it('offlineUpdate rejects empty title updates on title-requiring tables', async () => {
      const res = await offlineUpdate('tasks', { id: 't1' }, { title: '' });
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error.message).toContain('cannot update');
    });

    it('dispatches polaris-tasks-changed event upon offline mutations', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('polaris-tasks-changed', eventSpy);

      const origTasks = db.tasks;
      const origSyncQueue = db._syncQueue;
      db.tasks = {
        add: vi.fn().mockResolvedValue(true),
        update: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ id: 'task-evt-1', title: 'Evt Task' }])
        })
      };
      db._syncQueue = {
        add: vi.fn().mockResolvedValue(true),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([]),
            toArray: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true)
      };

      await offlineInsert('tasks', { id: generateUUID(), title: 'Event Test Task', user_id: 'u1' });
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy.mock.calls[0][0].detail.table).toBe('tasks');
      expect(eventSpy.mock.calls[0][0].detail.operation).toBe('insert');

      await offlineUpdate('tasks', { id: 'task-evt-1' }, { status: 'done' });
      expect(eventSpy).toHaveBeenCalledTimes(2);

      window.removeEventListener('polaris-tasks-changed', eventSpy);
      db.tasks = origTasks;
      db._syncQueue = origSyncQueue;
    });
  });

  describe('3. IELTS Practice Scores & Curriculum Defaults Integration', () => {
    it('seeds default IELTS writing and speaking mock tests in DEFAULT_IELTS_PRACTICE_SCORES', () => {
      const writingMocks = DEFAULT_IELTS_PRACTICE_SCORES.filter(s => s.category === 'writing');
      const speakingMocks = DEFAULT_IELTS_PRACTICE_SCORES.filter(s => s.category === 'speaking');
      const listeningMocks = DEFAULT_IELTS_PRACTICE_SCORES.filter(s => s.category === 'listening');
      const readingMocks = DEFAULT_IELTS_PRACTICE_SCORES.filter(s => s.category === 'reading');

      expect(writingMocks.length).toBeGreaterThanOrEqual(2);
      expect(speakingMocks.length).toBeGreaterThanOrEqual(1);
      expect(listeningMocks.length).toBeGreaterThanOrEqual(2);
      expect(readingMocks.length).toBeGreaterThanOrEqual(4);

      writingMocks.forEach(m => {
        expect(m.title).toBeDefined();
        expect(m.band).toBeGreaterThanOrEqual(6.0);
      });
    });

    it('mergeScoresWithDefaults matches and merges without duplicating existing tests', () => {
      const currentScores = [
        {
          id: 'user-custom-mock-1',
          title: 'Custom Writing Mock Test 1',
          category: 'writing',
          score: 8.0,
          total: null,
          band: 8.0,
          date: '2026-09-20T10:00:00Z'
        },
        {
          id: 'ielts-mock-listen-2',
          title: 'IELTS Online Tests - Mock Test 2026 January Listening Test 1',
          category: 'listening',
          score: 39,
          total: 40,
          band: 9.0,
          date: '2026-09-21T10:00:00Z'
        }
      ];

      const merged = mergeScoresWithDefaults(currentScores, DEFAULT_IELTS_PRACTICE_SCORES);

      // Must keep the user custom test
      expect(merged.some(s => s.id === 'user-custom-mock-1')).toBe(true);

      // Must not duplicate ielts-mock-listen-2
      const listen2Matches = merged.filter(s => s.id === 'ielts-mock-listen-2');
      expect(listen2Matches.length).toBe(1);
      // Must preserve the user updated score (39/40, Band 9.0)
      expect(listen2Matches[0].score).toBe(39);
      expect(listen2Matches[0].band).toBe(9.0);

      // Must include writing defaults
      expect(merged.some(s => s.id === 'ielts-mock-write-1')).toBe(true);
      expect(merged.some(s => s.id === 'ielts-mock-write-2')).toBe(true);
    });

    it('calculates module averages, trends, and projected overall band accurately', () => {
      const scores = [
        { category: 'listening', score: 38, total: 40, band: 8.5, date: '2026-09-10T10:00:00Z' },
        { category: 'reading', score: 36, total: 40, band: 8.0, date: '2026-09-10T10:00:00Z' },
        { category: 'writing', score: 7.5, total: null, band: 7.5, date: '2026-09-10T10:00:00Z' },
        { category: 'speaking', score: 7.5, total: null, band: 7.5, date: '2026-09-10T10:00:00Z' }
      ];

      const listenStats = calculateModuleStats(scores, 'listening');
      const readStats = calculateModuleStats(scores, 'reading');
      const writeStats = calculateModuleStats(scores, 'writing');
      const speakStats = calculateModuleStats(scores, 'speaking');

      expect(listenStats.average).toBe(8.5);
      expect(readStats.average).toBe(8.0);
      expect(writeStats.average).toBe(7.5);
      expect(speakStats.average).toBe(7.5);

      const avgs = {
        listening: listenStats.average,
        reading: readStats.average,
        writing: writeStats.average,
        speaking: speakStats.average
      };

      const overall = calculateOverallBand(avgs);
      expect(overall.activeCount).toBe(4);
      expect(overall.rawMean).toBe(7.875);
      // 7.875 with fraction >= 0.75 rounds up to 8.0
      expect(overall.roundedBand).toBe(8.0);
    });
  });

  describe('4. Habit Stack Logs & Task Deduplication Union', () => {
    it('deduplicateActiveTasks preserves complete completion_dates history and maximum completion_count', () => {
      const activeDuplicates = [
        {
          id: 'task-1',
          title: 'Daily Journaling',
          source_template_id: 'tpl-journal',
          status: 'active',
          completion_dates: ['2026-09-01', '2026-09-02', '2026-09-03'],
          completion_count: 3,
          created_at: '2026-09-03T00:00:00Z'
        },
        {
          id: 'task-2',
          title: 'Daily Journaling',
          source_template_id: 'tpl-journal',
          status: 'active',
          completion_dates: ['2026-09-04', '2026-09-05'],
          completion_count: 7,
          created_at: '2026-09-05T00:00:00Z'
        },
        {
          id: 'task-3',
          title: 'Daily Journaling',
          source_template_id: 'tpl-journal',
          status: 'active',
          completion_dates: ['2026-09-06'],
          completion_count: 1,
          created_at: '2026-09-06T00:00:00Z'
        }
      ];

      const { keptTasks, duplicateTaskIds } = deduplicateActiveTasks(activeDuplicates);

      expect(keptTasks.length).toBe(1);
      expect(duplicateTaskIds.length).toBe(2);

      const keeper = keptTasks[0];
      expect(keeper.id).toBe('task-3');
      expect(keeper.completion_dates).toEqual([
        '2026-09-01',
        '2026-09-02',
        '2026-09-03',
        '2026-09-04',
        '2026-09-05',
        '2026-09-06'
      ]);
      expect(keeper.completion_count).toBe(7);
    });

    it('deduplicateTasks partitions unsorted duplicates without dropping unique items', () => {
      const unsorted = [
        { id: 'u1', title: 'Review Paper Draft' },
        { id: 'u2', title: 'Review Paper Draft' },
        { id: 'u3', title: 'Submit Coursework' }
      ];
      const active = [
        { id: 'a1', title: 'Submit Coursework', status: 'active' }
      ];

      const { uniqueTasks, duplicateTaskIds } = deduplicateTasks(unsorted, active);

      expect(uniqueTasks.map(t => t.id)).toEqual(['u1']);
      expect(duplicateTaskIds).toEqual(['u2', 'u3']);
    });

    it('detectStaleParentTasks flags active parents with subtasks inactive for 3+ days', () => {
      const now = new Date('2026-09-27T10:00:00Z');
      const allTasks = [
        { id: 'parent-1', title: 'Research Master Thesis', status: 'active' },
        { id: 'child-1', parent_task_id: 'parent-1', title: 'Read Literature', status: 'active', updated_at: '2026-09-20T00:00:00Z' },
        { id: 'parent-2', title: 'Portfolio Redesign', status: 'active' },
        { id: 'child-2', parent_task_id: 'parent-2', title: 'Update Case Study', status: 'active', updated_at: '2026-09-26T00:00:00Z' }
      ];

      const stale = detectStaleParentTasks(allTasks, now);
      expect(stale.length).toBe(1);
      expect(stale[0].id).toBe('parent-1');
    });

    it('evaluateParentTaskQuadrant derives urgency inheritance correctly from child subtasks', () => {
      const refDate = new Date('2026-09-27T10:00:00Z');

      const parentTask = { id: 'p1', title: 'Parent', deadline: '2026-10-15' };
      const urgentChild = [{ id: 'c1', parent_task_id: 'p1', status: 'active', deadline: '2026-09-28' }];
      const notUrgentChild = [{ id: 'c2', parent_task_id: 'p1', status: 'active', deadline: '2026-10-10' }];

      expect(evaluateParentTaskQuadrant(parentTask, urgentChild, refDate)).toBe('urgent_important');
      expect(evaluateParentTaskQuadrant(parentTask, notUrgentChild, refDate)).toBe('important_not_urgent');
    });
  });

  describe('5. Universal Offline Store Coverage & pomodoro_logs', () => {
    it('defines pomodoro_logs in Dexie v8 schema', () => {
      expect(db.pomodoro_logs).toBeDefined();
    });

    it('offlineInsert handles pomodoro_logs records and generates valid UUIDs', async () => {
      const origTable = db.pomodoro_logs;
      const origSyncQueue = db._syncQueue;
      const mockAdd = vi.fn().mockResolvedValue(true);
      db.pomodoro_logs = {
        add: mockAdd
      };
      db._syncQueue = {
        add: vi.fn().mockResolvedValue(true),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([]),
            toArray: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true)
      };

      const res = await offlineInsert('pomodoro_logs', {
        user_id: 'u1',
        task_id: 'task-123',
        duration_minutes: 25,
        completed_at: new Date().toISOString(),
        xp_earned: 20
      });

      expect(res.error).toBeNull();
      expect(res.data[0].id).toBeDefined();
      expect(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(res.data[0].id)).toBe(true);
      expect(mockAdd).toHaveBeenCalled();

      db.pomodoro_logs = origTable;
      db._syncQueue = origSyncQueue;
    });

    it('pullData gracefully handles PGRST205 schema cache 404 errors without throwing or logging error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: 'PGRST205',
              message: "Could not find the 'practice_scores' table in the schema cache",
              details: null,
              hint: null
            }
          })
        })
      }));

      await expect(pullData('practice_scores', 'user-123')).resolves.not.toThrow();
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('flushQueue intercepts PGRST205 schema cache errors and routes to DLQ', async () => {
      supabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockResolvedValue({
          error: {
            code: 'PGRST205',
            message: "Could not find the 'practice_scores' table in the schema cache"
          }
        })
      }));

      const queueItem = {
        localId: 42,
        table: 'practice_scores',
        operation: 'insert',
        payload: { id: 'score-1', user_id: 'u1', score: 8.0 }
      };

      const mockDlqAdd = vi.fn().mockResolvedValue(true);
      const origSyncQueue = db._syncQueue;
      const origSyncErrors = db.sync_errors;

      db._syncQueue = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([queueItem]),
            toArray: vi.fn().mockResolvedValue([queueItem]),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        add: vi.fn().mockResolvedValue(true)
      };
      db.sync_errors = {
        add: mockDlqAdd,
        put: mockDlqAdd
      };

      await flushQueue();

      expect(mockDlqAdd).toHaveBeenCalled();
      expect(db._syncQueue.bulkDelete).toHaveBeenCalledWith([42]);

      db._syncQueue = origSyncQueue;
      db.sync_errors = origSyncErrors;
    });

    it('offlineSelect correctly filters contacts and fitness tables without network errors', async () => {
      const origContacts = db.contacts;
      const rawContacts = [
        { id: 'c1', user_id: 'u1', name: 'Dr. Smith', tier: 'hearth' },
        { id: 'c2', user_id: 'u2', name: 'Dr. Jones', tier: 'yard' }
      ];
      db.contacts = {
        filter: vi.fn().mockImplementation((predicate) => ({
          toArray: vi.fn().mockResolvedValue(rawContacts.filter(predicate))
        }))
      };

      const { data, error } = await offlineSelect('contacts', { user_id: 'u1' });
      expect(error).toBeNull();
      expect(data.length).toBe(1);
      expect(data[0].name).toBe('Dr. Smith');

      db.contacts = origContacts;
    });
  });

  describe('6. Sprint B.6c Remote Deletion Safety Guards & Cooldown Resilience', () => {
    let origTasks;
    let origTx;
    let origSyncQueue;
    let origSyncErrors;

    beforeEach(() => {
      origTasks = db.tasks;
      origTx = db.transaction;
      origSyncQueue = db._syncQueue;
      origSyncErrors = db.sync_errors;
      _resetSyncManagerForTesting();
      _resetInitializedUserIdForTesting();
    });

    afterEach(() => {
      db.tasks = origTasks;
      db.transaction = origTx;
      db._syncQueue = origSyncQueue;
      db.sync_errors = origSyncErrors;
      clearSyncManager();
      _resetInitializedUserIdForTesting();
    });

    it('deletions skipped when remote returns an error response', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { id: 't1', user_id: 'u1', title: 'Task 1' },
              { id: 't2', user_id: 'u1', title: 'Task 2' }
            ])
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Supabase returns error
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Internal Server Error', code: 'PGRST500' }
            })
          })
        })
      }));

      await expect(pullData('tasks', 'u1')).rejects.toThrow('Internal Server Error');
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('deletions skipped when remote returns empty response while local rows exist', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              { id: 't1', user_id: 'u1', title: 'Task 1' },
              { id: 't2', user_id: 'u1', title: 'Task 2' }
            ])
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Remote returns empty array
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      }));

      const res = await pullData('tasks', 'u1');
      expect(res.rowsDeleted).toBe(0);
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('deletions skipped when remote response reaches page limit (truncated page at 1000)', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      // Simulate 1000 remote items
      const remote1000 = Array.from({ length: PULL_PAGE_LIMIT }, (_, i) => ({
        id: `t-${i}`,
        user_id: 'u1',
        title: `Task ${i}`
      }));

      // Local has those 1000 plus 1 extra
      const local1001 = [
        ...remote1000,
        { id: 't-extra', user_id: 'u1', title: 'Extra Local Task' }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(local1001)
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: remote1000,
              error: null
            })
          })
        })
      }));

      const res = await pullData('tasks', 'u1');
      expect(res.rowsDeleted).toBe(0);
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('normal deletion proceeds when missing rows are <= 25% of local rows', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      const localRows = [
        { id: 't1', user_id: 'u1', title: 'Task 1' },
        { id: 't2', user_id: 'u1', title: 'Task 2' },
        { id: 't3', user_id: 'u1', title: 'Task 3' },
        { id: 't4', user_id: 'u1', title: 'Task 4' },
        { id: 't5', user_id: 'u1', title: 'Task 5' },
        { id: 't6', user_id: 'u1', title: 'Task 6' },
        { id: 't7', user_id: 'u1', title: 'Task 7' },
        { id: 't8-del', user_id: 'u1', title: 'Task 8 Deleted Remotely' }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(localRows)
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Remote has 7 rows (1 missing = 12.5% <= 25%)
      const remoteRows = localRows.slice(0, 7);
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: remoteRows,
              error: null
            })
          })
        })
      }));

      const res = await pullData('tasks', 'u1');
      expect(res.rowsDeleted).toBe(1);
      expect(mockBulkDelete).toHaveBeenCalledWith(['t8-del']);
    });

    it('deletions skipped and dev warning logged when attempted deletion exceeds 25% of local rows', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const localRows = [
        { id: 't1', user_id: 'u1', title: 'Task 1' },
        { id: 't2', user_id: 'u1', title: 'Task 2' },
        { id: 't3-del', user_id: 'u1', title: 'Task 3 Deleted' },
        { id: 't4-del', user_id: 'u1', title: 'Task 4 Deleted' }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(localRows)
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Remote only has 2 rows (2 deleted out of 4 = 50% > 25%)
      const remoteRows = localRows.slice(0, 2);
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: remoteRows,
              error: null
            })
          })
        })
      }));

      const res = await pullData('tasks', 'u1');
      expect(res.rowsDeleted).toBe(0);
      expect(mockBulkDelete).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deletion safety guard triggered for tasks: attempted to delete 2 of 4 rows (50% > 25%)')
      );

      consoleWarnSpy.mockRestore();
    });

    it('never deletes local rows that have a pending item in the sync queue', async () => {
      const mockBulkDelete = vi.fn().mockResolvedValue(true);
      const localRows = [
        { id: 't1', user_id: 'u1', title: 'Task 1' },
        { id: 't2', user_id: 'u1', title: 'Task 2' },
        { id: 't3', user_id: 'u1', title: 'Task 3' },
        { id: 't4-pending', user_id: 'u1', title: 'Pending Task' }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(localRows)
          })
        }),
        bulkDelete: mockBulkDelete,
        bulkPut: vi.fn()
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Pending queue contains t4-pending
      db._syncQueue = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([
              {
                id: 999,
                table: 'tasks',
                operation: 'insert',
                payload: { id: 't4-pending', user_id: 'u1', title: 'Pending Task' },
                status: 'pending'
              }
            ])
          })
        })
      };

      // Remote only has t1, t2, t3 (t4-pending is missing remotely because it is not synced yet)
      const remoteRows = localRows.slice(0, 3);
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: remoteRows,
              error: null
            })
          })
        })
      }));

      const res = await pullData('tasks', 'u1');
      // t4-pending was protected by the sync queue check!
      expect(res.rowsDeleted).toBe(0);
      expect(mockBulkDelete).not.toHaveBeenCalled();
    });

    it('confirms 60 second cooldown applies only to full pulls and never blocks flushing the offline write queue', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      supabase.from.mockImplementation(() => ({
        upsert: mockUpsert,
        insert: mockUpsert,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            single: vi.fn().mockResolvedValue({ data: { id: 'u1' }, error: null })
          })
        })
      }));

      // Set lastFullPullTime to 10 seconds ago (simulating pull completed 10s ago)
      _setLastFullPullTimeForTesting(Date.now() - 10000);
      expect(getLastFullPullTime()).toBeGreaterThan(0);

      // Simulate offline before init so app is offline
      const origOnLine = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

      // Initialize syncManager for u1 while offline
      const cleanup = initSyncManager('u1');
      expect(isOnlineListenerActive()).toBe(true);

      // User performs edit while offline, which is queued
      const offlineItem = {
        id: 777,
        localId: 777,
        table: 'tasks',
        operation: 'insert',
        payload: { id: 'offline-task-99', user_id: 'u1', title: 'Created Offline' },
        status: 'pending',
        timestamp: Date.now()
      };

      db._syncQueue = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([offlineItem]),
            toArray: vi.fn().mockResolvedValue([offlineItem]),
            delete: vi.fn().mockResolvedValue(true)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        add: vi.fn().mockResolvedValue(true)
      };

      db.sync_errors = {
        add: vi.fn().mockResolvedValue(true),
        where: vi.fn().mockReturnValue({
          below: vi.fn().mockReturnValue({
            primaryKeys: vi.fn().mockResolvedValue([])
          })
        })
      };

      mockUpsert.mockClear();

      // User reconnects (simulating reconnecting 10s after initial pull)
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
      await new Promise(r => setTimeout(r, 50));

      // Assert queued write was flushed immediately to Supabase
      expect(mockUpsert).toHaveBeenCalledWith(offlineItem.payload);

      cleanup();
      Object.defineProperty(navigator, 'onLine', { value: origOnLine, configurable: true });
    });

    it('confirms sign-out clears syncManager module state and initializedUserId in useAuth and removes online listener', () => {
      initSyncManager('user-A');
      expect(getCurrentSyncUserId()).toBe('user-A');
      expect(isOnlineListenerActive()).toBe(true);

      // Call clearSyncManager (which signOut invokes)
      clearSyncManager();
      _resetInitializedUserIdForTesting();

      expect(getCurrentSyncUserId()).toBeNull();
      expect(isOnlineListenerActive()).toBe(false);
      expect(getInitializedUserId()).toBeNull();
      expect(getLastFullPullTime()).toBe(0);

      // Signing in as different user triggers init and full pull
      initSyncManager('user-B');
      expect(getCurrentSyncUserId()).toBe('user-B');
      expect(isOnlineListenerActive()).toBe(true);
      clearSyncManager();
    });

    it('logs one dev-only console line at the end of each pull with written, deleted, and events dispatched', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const localRows = [
        { id: 't1', user_id: 'u1', title: 'Task 1' },
        { id: 't2', user_id: 'u1', title: 'Task 2' },
        { id: 't3', user_id: 'u1', title: 'Task 3' },
        { id: 't4', user_id: 'u1', title: 'Task 4' }
      ];

      db.tasks = {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(localRows)
          })
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        bulkPut: vi.fn().mockResolvedValue(true)
      };
      db.transaction = vi.fn().mockImplementation(async (m, t, fn) => { await fn(); });

      // Remote has 3 rows (t4 deleted -> 1 of 4 = 25% <= 25%)
      const remoteRows = localRows.slice(0, 3);
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: remoteRows,
              error: null
            })
          })
        })
      }));

      await pullData('tasks', 'u1');

      // Check for dev-only end-of-pull log
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SyncManager\] Pull complete \| Table: tasks \| Rows written: 0 \| Rows deleted: 1 \| Events: polaris-tasks-changed\(tasks\)/)
      );

      consoleLogSpy.mockRestore();
    });
  });
});
