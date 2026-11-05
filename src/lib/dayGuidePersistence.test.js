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
  persistOrderDual,
  classifyTaskType,
  applyPlanXpDelta,
  reconcileDailyPlanEstimates
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

    it('tick/untick the same box 5 times plus offline replay keeps net XP equal to 10 * boxes currently ticked', async () => {
      let currentPlan = {
        id: 'plan-xp-test',
        user_id: userId,
        plan_date: todayStr,
        task_id: 'task-xp',
        target_boxes: 3,
        done_boxes: 0,
        xp_awarded: 0
      };

      offlineApi.offlineSelect.mockImplementation(async (table) => {
        if (table === 'daily_plan') return { data: [currentPlan], error: null };
        return { data: [], error: null };
      });

      offlineApi.offlineUpdate.mockImplementation(async (table, filter, updates) => {
        if (table === 'daily_plan') {
          currentPlan = { ...currentPlan, ...updates };
        }
        return { data: [currentPlan], error: null };
      });

      let netXpDelta = 0;
      const mockAddXP = vi.fn(async (delta) => {
        netXpDelta += delta;
      });

      const task = { id: 'task-xp', title: 'XP Test Task' };

      // 5 alternating toggles: tick, untick, tick, untick, tick
      const toggles = [
        [true, false, false],  // 1: tick box 0
        [false, false, false], // 2: untick box 0
        [true, false, false],  // 3: tick box 0
        [false, false, false], // 4: untick box 0
        [true, false, false]   // 5: tick box 0
      ];

      for (let i = 0; i < toggles.length; i++) {
        await persistTimeboxToggleDual({
          userId,
          todayStr,
          task,
          nextList: toggles[i],
          trackId: null,
          chipIdx: 0,
          nextChecked: toggles[i][0],
          addXP: mockAddXP
        });
      }

      // Net XP after 5 toggles must be 10 (1 box ticked * 10)
      expect(netXpDelta).toBe(10);
      expect(currentPlan.xp_awarded).toBe(10);
      expect(currentPlan.done_boxes).toBe(1);

      // Offline replay: simulating re-playing the state sync
      await persistTimeboxToggleDual({
        userId,
        todayStr,
        task,
        nextList: [true, false, false],
        trackId: null,
        chipIdx: 0,
        nextChecked: true,
        addXP: mockAddXP
      });

      // No additional XP on duplicate replay
      expect(netXpDelta).toBe(10);
      expect(currentPlan.xp_awarded).toBe(10);
    });
  });

  describe('classifyTaskType', () => {
    it('returns explicit task_type if input or output', () => {
      expect(classifyTaskType({ task_type: 'input', title: 'Write code' })).toBe('input');
      expect(classifyTaskType({ task_type: 'output', title: 'Read textbook' })).toBe('output');
    });

    it('matches read, study, watch, lecture, research keywords in title as input', () => {
      expect(classifyTaskType({ title: 'Read chapter 4 of robotics' })).toBe('input');
      expect(classifyTaskType({ title: 'Study machine learning notes' })).toBe('input');
      expect(classifyTaskType({ title: 'Watch recorded seminar' })).toBe('input');
      expect(classifyTaskType({ title: 'Attend guest lecture on power electronics' })).toBe('input');
      expect(classifyTaskType({ title: 'Research quantum computing algorithms' })).toBe('input');
    });

    it('returns output for tasks not matching input keywords or without task_type', () => {
      expect(classifyTaskType({ title: 'Build circuit board prototype' })).toBe('output');
      expect(classifyTaskType({ title: 'Code API backend routes' })).toBe('output');
      expect(classifyTaskType({ title: 'Draft quarterly report' })).toBe('output');
      expect(classifyTaskType({ title: 'Solve tutorial problem 3' })).toBe('output');
      expect(classifyTaskType({})).toBe('output');
      expect(classifyTaskType(null)).toBe('output');
    });
  });

  describe('applyPlanXpDelta', () => {
    it('computes positive delta and calls addXP when boxes increase', async () => {
      const mockAddXP = vi.fn().mockResolvedValue(true);
      const plan = { xp_awarded: 10 };
      const nextDoneBoxes = 3;

      const result = await applyPlanXpDelta(plan, nextDoneBoxes, mockAddXP);

      expect(result.delta).toBe(20); // 30 - 10
      expect(result.nextXpAwarded).toBe(30);
      expect(mockAddXP).toHaveBeenCalledWith(20);
    });

    it('computes negative delta and calls addXP when boxes decrease', async () => {
      const mockAddXP = vi.fn().mockResolvedValue(true);
      const plan = { xp_awarded: 40 };
      const nextDoneBoxes = 1;

      const result = await applyPlanXpDelta(plan, nextDoneBoxes, mockAddXP);

      expect(result.delta).toBe(-30); // 10 - 40
      expect(result.nextXpAwarded).toBe(10);
      expect(mockAddXP).toHaveBeenCalledWith(-30);
    });

    it('does not call addXP when delta is zero', async () => {
      const mockAddXP = vi.fn();
      const plan = { xp_awarded: 20 };
      const nextDoneBoxes = 2;

      const result = await applyPlanXpDelta(plan, nextDoneBoxes, mockAddXP);

      expect(result.delta).toBe(0);
      expect(result.nextXpAwarded).toBe(20);
      expect(mockAddXP).not.toHaveBeenCalled();
    });

    it('handles undefined plan gracefully defaulting xp_awarded to 0', async () => {
      const mockAddXP = vi.fn().mockResolvedValue(true);
      const nextDoneBoxes = 2;

      const result = await applyPlanXpDelta(null, nextDoneBoxes, mockAddXP);

      expect(result.delta).toBe(20);
      expect(result.nextXpAwarded).toBe(20);
      expect(mockAddXP).toHaveBeenCalledWith(20);
    });
  });

  describe('Sprint B.4 Reconciliation and Overrides', () => {
    it('Rule 1: reconciles stale plan with target_boxes: 3 to 2 for a 30 min task when not target_overridden', async () => {
      offlineApi.offlineUpdate.mockResolvedValue({ data: [{}], error: null });

      const stalePlan = {
        id: 'plan-stale-1',
        task_id: 'task-30m',
        target_boxes: 3,
        target_overridden: false
      };
      const tasks = [
        { id: 'task-30m', title: 'Task 30m', estimated_minutes: 30 }
      ];

      const result = await reconcileDailyPlanEstimates({
        plans: [stalePlan],
        tasks,
        userId,
        todayStr
      });

      expect(result[0].target_boxes).toBe(2);
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-stale-1', user_id: userId },
        expect.objectContaining({ target_boxes: 2 })
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan_streams',
        { plan_id: 'plan-stale-1', user_id: userId },
        { target_boxes: 2 }
      );
    });

    it('Rule 2: persistAdjustBoxCountDual sets target_overridden: true and subsequent reconciliation preserves it', async () => {
      const task = { id: 'task-override-1', title: 'Task Override', estimated_minutes: 30 };
      const existingPlan = {
        id: 'plan-ov-1',
        user_id: userId,
        plan_date: todayStr,
        task_id: 'task-override-1',
        target_boxes: 2,
        target_overridden: false
      };

      offlineApi.offlineSelect.mockImplementation(async (table) => {
        if (table === 'daily_plan') return { data: [existingPlan], error: null };
        if (table === 'daily_plan_streams') return { data: [], error: null };
        return { data: [], error: null };
      });
      offlineApi.offlineUpdate.mockResolvedValue({ data: [{}], error: null });

      // Click + to adjust box count to 3
      const updatedTracks = [{ id: 'default', name: '15m units', count: 3 }];
      const adjustResult = await persistAdjustBoxCountDual({
        userId,
        todayStr,
        task,
        trackId: 'default',
        updatedTracks
      });

      expect(adjustResult).toEqual(expect.objectContaining({
        target_overridden: true,
        target_boxes: 3
      }));

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-ov-1', user_id: userId },
        expect.objectContaining({
          target_overridden: true,
          target_boxes: 3
        })
      );

      // Now run reconciliation on the updated plan
      const planAfterOverride = {
        ...existingPlan,
        target_boxes: 3,
        target_overridden: true
      };

      vi.clearAllMocks();
      const reconciled = await reconcileDailyPlanEstimates({
        plans: [planAfterOverride],
        tasks: [task],
        userId,
        todayStr
      });

      // target_boxes remains 3 and was NOT overwritten to 2
      expect(reconciled[0].target_boxes).toBe(3);
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalled();
    });
  });

  describe('B.5 Slot Derivation Fix', () => {
    it('derives slot from primary runway index, capped at 3, never in slot 4', async () => {
      offlineApi.offlineSelect.mockResolvedValue({ data: [] });
      offlineApi.offlineInsert.mockResolvedValue({ data: [{ id: 'plan-slot-test' }], error: null });

      const task = { id: 'task-slot-test', title: 'Test Runway Slot', estimated_minutes: 30 };

      // runwayIndex: 1 -> slot 2
      await persistTimeboxToggleDual({
        userId,
        todayStr,
        task,
        nextList: [true, false],
        trackId: 'default',
        runwayIndex: 1
      });

      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('daily_plan', expect.objectContaining({
        slot: 2,
        task_id: 'task-slot-test'
      }));

      // runwayIndex: 5 -> capped at slot 3, never slot 4
      vi.clearAllMocks();
      offlineApi.offlineSelect.mockResolvedValue({ data: [] });
      await persistAdjustBoxCountDual({
        userId,
        todayStr,
        task,
        trackId: 'default',
        updatedTracks: [{ id: 'default', name: 'units', count: 4, boxes: [] }],
        runwayIndex: 5
      });

      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('daily_plan', expect.objectContaining({
        slot: 3,
        task_id: 'task-slot-test'
      }));
    });
  });
});
