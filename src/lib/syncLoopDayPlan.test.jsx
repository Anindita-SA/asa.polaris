// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import db from './offlineStore';
import { initSyncManager, _resetSyncManagerForTesting } from './syncManager';
import { useDailyPlan } from '../hooks/useDailyPlan';
import { supabase } from './supabase';

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
const userId = '11111111-2222-3333-4444-555555555555';
const todayStr = '2026-11-03';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: userId },
    addXP: mockAddXP
  })
}));

vi.mock('../lib/sound', () => ({
  playChime: vi.fn()
}));

describe('Sprint C1 Sync Loop & Write Discipline Tests (src/lib/syncLoopDayPlan.test.jsx)', () => {
  let syncQueueWrites = [];
  let tableWrites = {};

  let mockPlans = [];
  let mockItems = [];
  let mockTasks = [];

  const setupMockDexie = () => {
    tableWrites = {
      daily_plan: 0,
      daily_plan_items: 0,
      tasks: 0,
      pomodoro_logs: 0,
      io_logs: 0
    };
    syncQueueWrites = [];

    const tables = [
      'tasks', 'daily_tasks', 'goals', 'milestones', 'day_plan_blocks',
      'focus_items', 'backburner', 'subtasks', 'recurring_task_templates',
      'hardware_opportunities', 'eulogies', 'practice_scores', 'curricula',
      'curriculum_topics', 'curriculum_resources', 'curriculum_categories',
      'media_log', 'habits', 'nodes', 'mini_games', 'calendar_events',
      'calendar_backups', 'nudges', 'contacts', 'wins', 'mood_logs',
      'highlights', 'io_logs', 'pomodoro_logs', 'morning_briefs',
      'user_settings', 'outreach_targets', 'habit_logs', 'meal_logs',
      'workout_logs', 'weight_logs', 'daily_plan', 'daily_plan_items',
      'daily_plan_streams', 'day_state', 'exam_dates', 'profiles'
    ];

    tables.forEach(t => {
      db[t] = {
        add: vi.fn().mockImplementation(async (payload) => {
          tableWrites[t] = (tableWrites[t] || 0) + 1;
          return 1;
        }),
        put: vi.fn().mockImplementation(async (payload) => {
          tableWrites[t] = (tableWrites[t] || 0) + 1;
          return 1;
        }),
        update: vi.fn().mockImplementation(async (id, data) => {
          tableWrites[t] = (tableWrites[t] || 0) + 1;
          return 1;
        }),
        delete: vi.fn().mockImplementation(async (id) => {
          tableWrites[t] = (tableWrites[t] || 0) + 1;
          return 1;
        }),
        bulkDelete: vi.fn().mockResolvedValue(true),
        toArray: vi.fn().mockResolvedValue([]),
        filter: vi.fn().mockImplementation((predicate) => ({
          toArray: vi.fn().mockImplementation(async () => {
            let list = [];
            if (t === 'daily_plan') list = mockPlans;
            else if (t === 'daily_plan_items') list = mockItems;
            else if (t === 'tasks') list = mockTasks;
            return typeof predicate === 'function' ? list.filter(predicate) : list;
          })
        })),
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockImplementation((val) => ({
            toArray: vi.fn().mockImplementation(async () => {
              if (t === 'daily_plan') return mockPlans.filter(p => p.user_id === val || p.plan_date === val);
              if (t === 'daily_plan_items') return mockItems.filter(i => i.user_id === val);
              if (t === 'tasks') return mockTasks.filter(tsk => tsk.user_id === val);
              return [];
            })
          }))
        })
      };
    });

    db._syncQueue = {
      add: vi.fn().mockImplementation(async (entry) => {
        syncQueueWrites.push(entry);
        return syncQueueWrites.length;
      }),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([])
        })
      }),
      bulkDelete: vi.fn().mockResolvedValue(true)
    };

    db.sync_errors = {
      add: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnValue({
        below: vi.fn().mockReturnValue({
          primaryKeys: vi.fn().mockResolvedValue([])
        })
      }),
      bulkDelete: vi.fn().mockResolvedValue(true)
    };
  };

  const notifyDexie = async () => {
    if (currentQueryFn && currentSubscriber) {
      const data = await currentQueryFn();
      currentSubscriber.next(data);
    }
  };

  beforeEach(() => {
    vi.useFakeTimers();
    _resetSyncManagerForTesting();

    mockPlans = [
      {
        id: 'plan-1',
        user_id: userId,
        plan_date: todayStr,
        slot: 1,
        task_id: 'parent-1',
        target_boxes: 2,
        done_boxes: 0,
        status: 'planned',
        auto_completed: false,
        xp_awarded: 0
      }
    ];

    mockItems = [
      {
        id: 'item-1',
        user_id: userId,
        plan_id: 'plan-1',
        task_id: 'sub-1',
        position: 0,
        completed_by_slot: false
      }
    ];

    mockTasks = [
      { id: 'parent-1', user_id: userId, title: 'Parent Task', parent_task_id: null, status: 'in_progress', estimated_minutes: 30 },
      { id: 'sub-1', user_id: userId, parent_task_id: 'parent-1', title: 'Subtask 1', status: 'in_progress', estimated_minutes: 15 }
    ];

    setupMockDexie();
  });

  afterEach(() => {
    vi.useRealTimers();
    _resetSyncManagerForTesting();
  });

  it('Test A (Idle & Event Storm Resilience): 5 auth + 3 online + 2 visibility events fire 0 writes and 0 pull loops', async () => {
    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null })
    });

    const { result } = renderHook(() => useDailyPlan(todayStr));
    await act(async () => {
      await notifyDexie();
    });

    // Advance 60s
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    const initialQueueCount = syncQueueWrites.length;
    const initialPlanWrites = tableWrites.daily_plan || 0;

    // Fire 5 auth events
    for (let i = 0; i < 5; i++) {
      act(() => {
        window.dispatchEvent(new CustomEvent('polaris-auth-change', { detail: { event: i % 2 === 0 ? 'TOKEN_REFRESHED' : 'SIGNED_IN', userId } }));
      });
    }

    // Fire 3 online events
    for (let i = 0; i < 3; i++) {
      act(() => {
        window.dispatchEvent(new Event('online'));
      });
    }

    // Fire 2 visibilitychange events
    for (let i = 0; i < 2; i++) {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }

    // Assert zero new local writes or queue items, and zero Supabase calls at idle
    expect(syncQueueWrites.length).toBe(initialQueueCount);
    expect((tableWrites.daily_plan || 0) - initialPlanWrites).toBe(0);
    expect(fromSpy).not.toHaveBeenCalled();

    fromSpy.mockRestore();
  });

  it('Test B (Box Tick): exactly 1 local write to db.daily_plan + exactly 1 queue item in _syncQueue', async () => {
    const { result } = renderHook(() => useDailyPlan(todayStr));
    await act(async () => {
      await notifyDexie();
    });

    const preQueue = syncQueueWrites.filter(w => w.table === 'daily_plan').length;
    const preWrites = tableWrites.daily_plan || 0;

    await act(async () => {
      await result.current.tickBox(1);
    });

    const postQueue = syncQueueWrites.filter(w => w.table === 'daily_plan').length;
    const postWrites = tableWrites.daily_plan || 0;

    // Exactly 1 local write to db.daily_plan and exactly 1 sync queue item for daily_plan
    expect(postWrites - preWrites).toBe(1);
    expect(postQueue - preQueue).toBe(1);
  });

  it('Test C (Subtask Check): exactly 1 local write to db.tasks + exactly 1 queue item in _syncQueue for tasks', async () => {
    // Add sub-2 so checking sub-1 does not complete the parent task
    mockTasks.push({ id: 'sub-2', user_id: userId, parent_task_id: 'parent-1', title: 'Subtask 2', status: 'in_progress', estimated_minutes: 15 });

    const { result } = renderHook(() => useDailyPlan(todayStr));
    await act(async () => {
      await notifyDexie();
    });

    const preTaskQueue = syncQueueWrites.filter(w => w.table === 'tasks').length;
    const preTaskWrites = tableWrites.tasks || 0;

    await act(async () => {
      await result.current.toggleSubtask(1, 'sub-1');
    });

    const postTaskQueue = syncQueueWrites.filter(w => w.table === 'tasks').length;
    const postTaskWrites = tableWrites.tasks || 0;

    // Exactly 1 write to tasks and 1 queue item
    expect(postTaskWrites - preTaskWrites).toBe(1);
    expect(postTaskQueue - preTaskQueue).toBe(1);
  });

  it('Test D (Slot Clearance): updates daily_plan, auto-completes chosen subtasks and marks daily_plan_items', async () => {
    mockPlans[0].target_boxes = 1;

    const { result } = renderHook(() => useDailyPlan(todayStr));
    await act(async () => {
      await notifyDexie();
    });

    const prePlanWrites = tableWrites.daily_plan || 0;
    const preItemWrites = tableWrites.daily_plan_items || 0;
    const preTaskWrites = tableWrites.tasks || 0;

    await act(async () => {
      await result.current.tickBox(1);
    });

    // daily_plan updated once (cleared)
    expect((tableWrites.daily_plan || 0) - prePlanWrites).toBe(1);
    // sub-1 auto-completed (1 item update + 1 subtask update + 1 parent update since sub-1 was only child)
    expect((tableWrites.daily_plan_items || 0) - preItemWrites).toBe(1);
    expect((tableWrites.tasks || 0) - preTaskWrites).toBe(2); // sub-1 + parent-1
  });

  it('Test E (Undo Action): rolls back daily_plan, daily_plan_items, and tasks', async () => {
    mockPlans[0].target_boxes = 1;

    const { result } = renderHook(() => useDailyPlan(todayStr));
    await act(async () => {
      await notifyDexie();
    });

    await act(async () => {
      await result.current.tickBox(1);
    });

    const preUndoPlanWrites = tableWrites.daily_plan || 0;
    const preUndoItemWrites = tableWrites.daily_plan_items || 0;
    const preUndoTaskWrites = tableWrites.tasks || 0;

    await act(async () => {
      await result.current.undoLastAction();
    });

    // Reverts daily_plan (1 write)
    expect((tableWrites.daily_plan || 0) - preUndoPlanWrites).toBe(1);
    // Reverts subtask item (1 write) and tasks (sub-1 + parent-1 = 2 writes)
    expect((tableWrites.daily_plan_items || 0) - preUndoItemWrites).toBe(1);
    expect((tableWrites.tasks || 0) - preUndoTaskWrites).toBe(2);
  });
});
