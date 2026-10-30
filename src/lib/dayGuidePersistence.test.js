// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FF_DAY_GUIDE_DB_READ,
  isDayGuideDbReadEnabled,
  setDayGuideDbReadEnabled,
  importTodayLocalStorageToDb,
  mapDbPlanToUiState,
  persistTimeboxToggleDual,
  persistAdjustBoxCountDual,
  persistOrderDual
} from './dayGuidePersistence';
import * as offlineApi from './offlineApi';

vi.mock('./offlineApi', async () => {
  const actual = await vi.importActual('./offlineApi');
  return {
    ...actual,
    offlineSelect: vi.fn(),
    offlineInsert: vi.fn(),
    offlineUpdate: vi.fn(),
    offlineDelete: vi.fn(),
    generateUUID: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 7)
  };
});

describe('dayGuidePersistence', () => {
  const todayStr = '2026-10-30';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Rollback Feature Flag', () => {
    it('defaults to true when localStorage is unset', () => {
      expect(isDayGuideDbReadEnabled()).toBe(true);
    });

    it('returns false when set to false or off', () => {
      setDayGuideDbReadEnabled(false);
      expect(localStorage.getItem(FF_DAY_GUIDE_DB_READ)).toBe('false');
      expect(isDayGuideDbReadEnabled()).toBe(false);

      localStorage.setItem(FF_DAY_GUIDE_DB_READ, 'off');
      expect(isDayGuideDbReadEnabled()).toBe(false);
    });

    it('returns true when re-enabled', () => {
      setDayGuideDbReadEnabled(false);
      expect(isDayGuideDbReadEnabled()).toBe(false);
      setDayGuideDbReadEnabled(true);
      expect(isDayGuideDbReadEnabled()).toBe(true);
    });
  });

  describe('One-Time Idempotent Import', () => {
    const candidateTasks = [
      { id: 'task-1', title: 'Agri Solar Survey', estimated_minutes: 60 },
      { id: 'task-2', title: 'DAB Converter', estimated_minutes: 45 },
      { id: 'task-3', title: 'Portfolio Review', estimated_minutes: 30 }
    ];

    it('imports localStorage values on first run when DB has no rows for today', async () => {
      offlineApi.offlineSelect.mockResolvedValueOnce({ data: [] });
      offlineApi.offlineInsert.mockResolvedValue({ data: [{ id: 'plan-1' }], error: null });

      // Setup localStorage keys
      localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(['task-1', 'task-2', 'task-3']));
      localStorage.setItem(`polaris_timeboxes_${todayStr}_task-1`, JSON.stringify([true, true, false, false]));
      localStorage.setItem(`polaris_tracks_${todayStr}_task-1`, JSON.stringify([
        { id: 'default', name: '15m units', count: 4, boxes: [true, true, false, false] }
      ]));

      const result = await importTodayLocalStorageToDb({
        userId,
        todayStr,
        candidateTasks,
        boxMins: 15
      });

      expect(result.imported).toBe(true);
      expect(result.count).toBe(3);
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('daily_plan', expect.objectContaining({
        user_id: userId,
        plan_date: todayStr,
        slot: 1,
        task_id: 'task-1',
        done_boxes: 2
      }));
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('daily_plan_streams', expect.objectContaining({
        user_id: userId,
        label: '15m units',
        done_boxes: 2
      }));
    });

    it('is strictly idempotent and skips insertion when DB already has rows for today', async () => {
      const existingRows = [
        { id: 'plan-1', user_id: userId, plan_date: todayStr, slot: 1, task_id: 'task-1' }
      ];
      offlineApi.offlineSelect.mockResolvedValueOnce({ data: existingRows });

      const result = await importTodayLocalStorageToDb({
        userId,
        todayStr,
        candidateTasks,
        boxMins: 15
      });

      expect(result.imported).toBe(false);
      expect(result.reason).toBe('already_exists');
      expect(offlineApi.offlineInsert).not.toHaveBeenCalled();
    });
  });

  describe('mapDbPlanToUiState', () => {
    it('correctly maps DB plan rows and streams to UI orderedTasks, timeboxesMap, and taskTracksMap', () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1' },
        { id: 'task-2', title: 'Task 2' }
      ];
      const plans = [
        { id: 'p2', slot: 2, task_id: 'task-2', target_boxes: 3, done_boxes: 1, unit: 'min' },
        { id: 'p1', slot: 1, task_id: 'task-1', target_boxes: 4, done_boxes: 2, unit: 'min' }
      ];
      const streams = [
        { id: 's1', plan_id: 'p1', label: 'draft', target_boxes: 2, done_boxes: 2, position: 1 },
        { id: 's2', plan_id: 'p1', label: 'sche', target_boxes: 2, done_boxes: 0, position: 2 }
      ];

      const { orderedTasks, timeboxesMap, taskTracksMap } = mapDbPlanToUiState({
        plans,
        streams,
        tasks,
        boxMins: 15
      });

      // Slot 1 should be first, then Slot 2
      expect(orderedTasks.map(t => t.id)).toEqual(['task-1', 'task-2']);
      expect(timeboxesMap['task-1']).toEqual([true, true, false, false]);
      expect(taskTracksMap['task-1']).toHaveLength(2);
      expect(taskTracksMap['task-1'][0].name).toBe('draft');
      expect(taskTracksMap['task-1'][0].boxes).toEqual([true, true]);
      expect(taskTracksMap['task-1'][1].name).toBe('sche');
      expect(taskTracksMap['task-1'][1].boxes).toEqual([false, false]);
    });
  });

  describe('Dual-Write Operations', () => {
    it('persistTimeboxToggleDual writes to both localStorage and database', async () => {
      offlineApi.offlineSelect.mockResolvedValueOnce({
        data: [{ id: 'plan-1', user_id: userId, plan_date: todayStr, task_id: 'task-1', target_boxes: 4 }]
      });
      offlineApi.offlineUpdate.mockResolvedValue({ data: [], error: null });

      const task = { id: 'task-1', title: 'Task 1' };
      const nextList = [true, true, false, false];

      await persistTimeboxToggleDual({
        userId,
        todayStr,
        task,
        nextList,
        trackId: null
      });

      // LocalStorage updated
      const stored = localStorage.getItem(`polaris_timeboxes_${todayStr}_task-1`);
      expect(stored).toBe(JSON.stringify(nextList));

      // DB updated
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1', user_id: userId },
        expect.objectContaining({ done_boxes: 2, status: 'planned' })
      );
    });

    it('persistOrderDual writes to both localStorage and database slots', async () => {
      offlineApi.offlineSelect.mockResolvedValueOnce({
        data: [
          { id: 'plan-1', user_id: userId, plan_date: todayStr, task_id: 'task-1', slot: 1 },
          { id: 'plan-2', user_id: userId, plan_date: todayStr, task_id: 'task-2', slot: 2 }
        ]
      });
      offlineApi.offlineUpdate.mockResolvedValue({ data: [], error: null });

      const newOrder = ['task-2', 'task-1'];
      await persistOrderDual({
        userId,
        todayStr,
        taskIds: newOrder
      });

      // LocalStorage updated
      expect(localStorage.getItem(`polaris_today_order_${todayStr}`)).toBe(JSON.stringify(newOrder));

      // DB updated with swapped slots
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-2', user_id: userId },
        expect.objectContaining({ slot: 1 })
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1', user_id: userId },
        expect.objectContaining({ slot: 2 })
      );
    });
  });
});
