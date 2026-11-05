// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDailyPlan, logFocusSession, removeFocusSession } from './useDailyPlan';
import * as offlineApi from '../lib/offlineApi';
import * as soundLib from '../lib/sound';
import db from '../lib/offlineStore';

let currentQueryFn = null;
let currentSubscriber = null;

vi.mock('dexie', async () => {
  const actual = await vi.importActual('dexie');
  return {
    ...actual,
    liveQuery: (fn) => {
      currentQueryFn = fn;
      return {
        subscribe: (subscriber) => {
          currentSubscriber = subscriber;
          fn()
            .then(data => subscriber.next && subscriber.next(data))
            .catch(err => subscriber.error && subscriber.error(err));
          return {
            unsubscribe: () => {
              if (currentSubscriber === subscriber) {
                currentSubscriber = null;
              }
            }
          };
        }
      };
    }
  };
});

const mockAddXP = vi.fn();
const mockUser = { id: 'user-c1-tester' };

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    addXP: mockAddXP
  })
}));

vi.mock('../lib/sound', () => ({
  playChime: vi.fn()
}));

vi.mock('../lib/offlineApi', async () => {
  const actual = await vi.importActual('../lib/offlineApi');
  return {
    ...actual,
    offlineSelect: vi.fn(),
    offlineInsert: vi.fn().mockImplementation(async (table, row) => ({ data: [row], error: null })),
    offlineUpdate: vi.fn().mockImplementation(async (table, match, data) => ({ data: [{ ...match, ...data }], error: null })),
    offlineDelete: vi.fn().mockImplementation(async (table, match) => ({ data: [match], error: null })),
    generateUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9)
  };
});

describe('useDailyPlan Hook (Sprint C1 Reactive Engine)', () => {
  const todayStr = '2026-11-03';

  let mockPlans = [];
  let mockItems = [];
  let mockTasks = [];

  const setupMockDexie = () => {
    db.daily_plan = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => [...mockPlans])
        })
      })
    };

    db.daily_plan_items = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => [...mockItems])
        })
      })
    };

    db.tasks = {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(async () => [...mockTasks])
        })
      }),
      get: vi.fn().mockImplementation(async (id) => mockTasks.find(t => t.id === id) || null)
    };
  };

  const notifyDexieChanged = async () => {
    if (currentQueryFn && currentSubscriber) {
      const data = await currentQueryFn();
      currentSubscriber.next(data);
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockPlans = [
      {
        id: 'plan-1',
        user_id: mockUser.id,
        plan_date: todayStr,
        slot: 1,
        task_id: 'parent-1',
        target_boxes: 2,
        done_boxes: 0,
        manual_boxes: 0,
        status: 'planned',
        auto_completed: false,
        xp_awarded: 0
      },
      {
        id: 'plan-2',
        user_id: mockUser.id,
        plan_date: todayStr,
        slot: 2,
        task_id: 'parent-2',
        target_boxes: 2,
        done_boxes: 0,
        manual_boxes: 0,
        status: 'planned',
        auto_completed: false,
        xp_awarded: 0
      }
    ];

    mockItems = [
      {
        id: 'item-1',
        user_id: mockUser.id,
        plan_id: 'plan-1',
        task_id: 'sub-1',
        position: 0,
        completed_by_slot: false
      },
      {
        id: 'item-2',
        user_id: mockUser.id,
        plan_id: 'plan-1',
        task_id: 'sub-2',
        position: 1,
        completed_by_slot: false
      }
    ];

    mockTasks = [
      { id: 'parent-1', user_id: mockUser.id, title: 'Parent 1', parent_task_id: null, status: 'in_progress', estimated_minutes: 60 },
      { id: 'sub-1', user_id: mockUser.id, parent_task_id: 'parent-1', title: 'Subtask 1', estimated_minutes: 15, status: 'in_progress' },
      { id: 'sub-2', user_id: mockUser.id, parent_task_id: 'parent-1', title: 'Subtask 2', estimated_minutes: 15, status: 'in_progress' },
      { id: 'sub-3-unselected', user_id: mockUser.id, parent_task_id: 'parent-1', title: 'Subtask 3', estimated_minutes: 15, status: 'in_progress' },
      { id: 'parent-2', user_id: mockUser.id, title: 'Parent 2', parent_task_id: null, status: 'in_progress', estimated_minutes: 30 }
    ];

    setupMockDexie();
  });

  describe('Rule 1: Reactive Dexie Query (No LocalStorage)', () => {
    it('populates slots exclusively from Dexie and never reads localStorage plan keys', async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      expect(result.current.slots.length).toBe(2);
      expect(result.current.slots[0].slot).toBe(1);
      expect(result.current.slots[0].parentTask.id).toBe('parent-1');
      expect(result.current.slots[0].items.length).toBe(2);

      // Verify localStorage was never queried for legacy keys
      const calledKeys = getItemSpy.mock.calls.map(call => call[0]);
      expect(calledKeys.some(k => k.startsWith('polaris_timeboxes_'))).toBe(false);
      expect(calledKeys.some(k => k.startsWith('polaris_tracks_'))).toBe(false);
      expect(calledKeys.some(k => k.startsWith('polaris_today_order_'))).toBe(false);
      expect(calledKeys.some(k => k.startsWith('polaris_primary_candidates_'))).toBe(false);

      getItemSpy.mockRestore();
    });
  });

  describe('Rule 7: Done Boxes as Single Source of Truth & Independent Untick', () => {
    it('sets done_boxes directly on tick (+1) and untick (-1) with zero manual_boxes writes', async () => {
      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      // 1. Tick box 1
      await act(async () => {
        await result.current.tickBox(1, { source: 'manual' });
      });

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          done_boxes: 1,
          xp_awarded: 10
        })
      );
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalledWith(
        'daily_plan',
        expect.anything(),
        expect.objectContaining({ manual_boxes: expect.anything() })
      );
      expect(mockAddXP).toHaveBeenCalledWith(10);

      // Simulate Dexie state updated
      mockPlans[0].done_boxes = 1;
      mockPlans[0].xp_awarded = 10;
      await act(async () => {
        await notifyDexieChanged();
      });

      // 2. Untick box 1
      await act(async () => {
        await result.current.untickBox(1);
      });

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          done_boxes: 0,
          xp_awarded: 0
        })
      );
      expect(mockAddXP).toHaveBeenCalledWith(-10);
    });

    it('asserts bug fix: two 15m subtasks both checked, untick box 2, asserts done_boxes is 1 and box 2 renders empty', async () => {
      // Slot 1 has two 15m subtasks (sub-1: 15m, sub-2: 15m = 30m total across 2 target_boxes)
      mockPlans[0].target_boxes = 2;
      mockPlans[0].done_boxes = 0;
      mockTasks[1].estimated_minutes = 15;
      mockTasks[2].estimated_minutes = 15;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      // Check subtask 1 -> sets done_boxes = max(0, ceil(15/15)) = 1
      await act(async () => {
        await result.current.toggleSubtask(1, 'sub-1');
      });
      mockTasks[1].status = 'done';
      mockTasks[1].completed = true;
      mockPlans[0].done_boxes = 1;
      await act(async () => {
        await notifyDexieChanged();
      });

      // Check subtask 2 -> sets done_boxes = max(1, ceil(30/15)) = 2
      await act(async () => {
        await result.current.toggleSubtask(1, 'sub-2');
      });
      mockTasks[2].status = 'done';
      mockTasks[2].completed = true;
      mockPlans[0].done_boxes = 2;
      await act(async () => {
        await notifyDexieChanged();
      });

      expect(result.current.slots[0].doneBoxes).toBe(2);

      // Now untick box 2 via untickBox(1)
      await act(async () => {
        await result.current.untickBox(1);
      });

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          done_boxes: 1
        })
      );

      // Simulate Dexie updated with done_boxes: 1
      mockPlans[0].done_boxes = 1;
      await act(async () => {
        await notifyDexieChanged();
      });

      // Assert slot doneBoxes is 1 and box 2 renders empty even though both subtasks are checked!
      const slot = result.current.slots[0];
      expect(slot.doneBoxes).toBe(1);
      expect(slot.targetBoxes).toBe(2);
      expect(slot.isCleared).toBe(false);
    });
  });

  describe('Rule 8: Slot Clearance Auto-Completes Chosen Subtasks', () => {
    it('marks slot cleared, plays chime, and auto-completes open chosen subtasks with completed_by_slot: true', async () => {
      // Set plan target_boxes = 1 so 1 tick clears the slot
      mockPlans[0].target_boxes = 1;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      await act(async () => {
        await result.current.tickBox(1, { source: 'manual' });
      });

      // Slot cleared
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          status: 'cleared',
          auto_completed: true,
          done_boxes: 1
        })
      );

      // Sound chime played
      expect(soundLib.playChime).toHaveBeenCalledWith('success');

      // Chosen subtasks auto-completed with completed_by_slot: true
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan_items',
        { id: 'item-1' },
        { completed_by_slot: true }
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'sub-1' },
        { status: 'done', completed: true }
      );

      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan_items',
        { id: 'item-2' },
        { completed_by_slot: true }
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'sub-2' },
        { status: 'done', completed: true }
      );
    });
  });

  describe('Rule 9: Parent Task Completion Condition', () => {
    it('does NOT complete parent task if unselected child subtasks remain open', async () => {
      mockPlans[0].target_boxes = 1;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      await act(async () => {
        await result.current.tickBox(1);
      });

      // parent-1 has sub-1 and sub-2 chosen, but sub-3-unselected is still open!
      // Therefore, parent-1 must NOT be marked done
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalledWith(
        'tasks',
        { id: 'parent-1' },
        { status: 'done', completed: true }
      );
    });

    it('completes parent task when ALL of its child subtasks become completed', async () => {
      // Mark sub-3-unselected done beforehand
      mockTasks[3].status = 'done';
      mockTasks[3].completed = true;
      mockPlans[0].target_boxes = 1;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      await act(async () => {
        await result.current.tickBox(1);
      });

      // Now all 3 child subtasks are done, so parent task completes!
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'parent-1' },
        { status: 'done', completed: true }
      );
    });
  });

  describe('Rule 10: Selective Reversible Untick', () => {
    it('reopens only subtasks with completed_by_slot: true and leaves manually completed subtasks done', async () => {
      // Slot 1 was cleared via manual_boxes = 2, with target_boxes = 2
      mockPlans[0].status = 'cleared';
      mockPlans[0].auto_completed = true;
      mockPlans[0].manual_boxes = 2;
      mockPlans[0].done_boxes = 2;
      mockPlans[0].target_boxes = 2;

      // item-1 was completed by slot; item-2 was completed manually (15m done, so subtaskBoxes = 1)
      mockItems[0].completed_by_slot = true;
      mockTasks[1].status = 'in_progress';
      mockTasks[1].completed = false;

      mockItems[1].completed_by_slot = false; // manually done
      mockTasks[2].status = 'done';
      mockTasks[2].completed = true;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      // Untick to drop done_boxes to 1 (below target_boxes 2)
      await act(async () => {
        await result.current.untickBox(1);
      });

      // Assert slot reverts to planned
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          status: 'planned',
          auto_completed: false,
          done_boxes: 1
        })
      );

      // Assert item-1 (auto-completed) is reopened
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan_items',
        { id: 'item-1' },
        { completed_by_slot: false }
      );
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'tasks',
        { id: 'sub-1' },
        { status: 'in_progress', completed: false }
      );

      // Assert item-2 (manual) was NEVER reopened
      expect(offlineApi.offlineUpdate).not.toHaveBeenCalledWith(
        'tasks',
        { id: 'sub-2' },
        { status: 'in_progress', completed: false }
      );
    });
  });

  describe('Rule 13: In-Place Slot Swap', () => {
    it('updates same daily_plan row in place with swapped_from = oldTaskId and replaces daily_plan_items', async () => {
      const newParent = {
        id: 'new-parent-99',
        user_id: mockUser.id,
        title: 'New Replacement Parent',
        parent_task_id: null,
        status: 'in_progress',
        estimated_minutes: 45
      };
      mockTasks.push(newParent);

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      await act(async () => {
        await result.current.swapSlot(1, 'new-parent-99');
      });

      // 1. Assert old daily_plan_items were deleted
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('daily_plan_items', { id: 'item-1', user_id: mockUser.id });
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('daily_plan_items', { id: 'item-2', user_id: mockUser.id });

      // 2. Assert daily_plan updated in place with swapped_from = 'parent-1' (old task_id)
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          task_id: 'new-parent-99',
          swapped_from: 'parent-1',
          done_boxes: 0,
          status: 'planned',
          auto_completed: false,
          xp_awarded: 0
        })
      );
    });
  });

  describe('Rule 14: Centralized Focus Session Logging', () => {
    it('logs focus session to pomodoro_logs and io_logs on tick and removes on untick', async () => {
      offlineApi.offlineSelect.mockResolvedValue({
        data: [{ id: 'pomo-log-1', plan_id: 'plan-1', created_at: new Date().toISOString() }],
        error: null
      });

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      // Tick box
      await act(async () => {
        await result.current.tickBox(1, { source: 'timer' });
      });

      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'pomodoro_logs',
        expect.objectContaining({
          user_id: mockUser.id,
          task_id: 'parent-1',
          plan_id: 'plan-1',
          source: 'timer',
          duration_minutes: 15
        })
      );

      expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
        'io_logs',
        expect.objectContaining({
          user_id: mockUser.id,
          plan_id: 'plan-1',
          minutes: 15
        })
      );

      // Untick box
      await act(async () => {
        await result.current.untickBox(1);
      });

      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('pomodoro_logs', { id: 'pomo-log-1', user_id: mockUser.id });
    });
  });

  describe('Rule 15: Midnight and Visibility Rollover', () => {
    it('recalculates date when visibility changes to visible on a new calendar day', async () => {
      const { result } = renderHook(() => useDailyPlan(todayStr));

      // Advance system time to tomorrow
      const tomorrowStr = '2026-11-04';
      const origToLocaleDateString = Date.prototype.toLocaleDateString;
      Date.prototype.toLocaleDateString = vi.fn().mockReturnValue(tomorrowStr);

      await act(async () => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(result.current.todayStr).toBe(tomorrowStr);

      Date.prototype.toLocaleDateString = origToLocaleDateString;
    });
  });

  describe('Undo Toast Action', () => {
    it('undoLastAction cleanly rolls back cleared status, manual_boxes, and auto-completed subtasks', async () => {
      mockPlans[0].target_boxes = 1;

      const { result } = renderHook(() => useDailyPlan(todayStr));
      await act(async () => {
        await notifyDexieChanged();
      });

      // Tick to clear
      await act(async () => {
        await result.current.tickBox(1);
      });

      expect(result.current.undoState).not.toBeNull();
      expect(result.current.undoState.planId).toBe('plan-1');

      // Trigger undo
      await act(async () => {
        await result.current.undoLastAction();
      });

      expect(result.current.undoState).toBeNull();
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
        'daily_plan',
        { id: 'plan-1' },
        expect.objectContaining({
          done_boxes: 0,
          status: 'planned',
          auto_completed: false
        })
      );
    });
  });
});
