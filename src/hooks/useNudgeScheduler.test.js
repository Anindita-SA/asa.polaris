// @vitest-environment jsdom
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNudgeScheduler } from './useNudgeScheduler';
import { supabase } from '../lib/supabase';
import { NOTIFICATION_SETTINGS_STORAGE_KEY, NOTIFICATION_SETTINGS_EVENT } from './useNotificationSettings';

const mockUser = { id: 'test-user-id' };
vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

describe('useNudgeScheduler', () => {
  const mockPostMessage = vi.fn();
  let mockUpdate;

  const setupMock = (nudgesData = [], tasksData = []) => {
    mockUpdate = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      }))
    }));

    supabase.from.mockImplementation((table) => {
      if (table === 'nudges') {
        return {
          select: vi.fn().mockImplementation((cols, opts) => {
            if (opts?.head) {
              const headBuilder = {
                eq: vi.fn().mockImplementation(() => headBuilder),
                then: (resolve) => resolve({ count: nudgesData.length, data: null, error: null })
              };
              return headBuilder;
            }
            const builder = {
              eq: vi.fn().mockImplementation(() => builder),
              then: (resolve) => resolve({ data: nudgesData, error: null })
            };
            return builder;
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        };
      }
      if (table === 'tasks') {
        return {
          select: vi.fn().mockImplementation(() => {
            const builder = {
              eq: vi.fn().mockImplementation(() => builder),
              neq: vi.fn().mockImplementation(() => builder),
              or: vi.fn().mockResolvedValue({ data: tasksData, error: null }),
              single: vi.fn().mockResolvedValue({ data: { skip_count: 2 }, error: null }),
              then: (resolve) => resolve({ data: tasksData, error: null })
            };
            return builder;
          }),
          update: mockUpdate
        };
      }
      return {};
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock Service Worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        controller: {
          postMessage: mockPostMessage
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('exposes system nudges in nudges and only top focus task in allNudges by default (focus_only mode)', async () => {
    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true },
      { id: 'nudge-2', user_id: 'test-user-id', title: 'Posture check', interval_minutes: 30, active: true }
    ];

    const mockTasksData = [
      { id: 'task-1', title: 'Overdue Project Task', deadline: '2020-01-01', skip_count: 0, category: 'work' },
      { id: 'task-2', title: 'Nagging Reminder', deadline: null, skip_count: 0, category: 'reminders' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.nudges).toHaveLength(2);
    });

    // Verify nudges represents ONLY system nudges (!n.isTask)
    expect(result.current.nudges.every(n => !n.isTask)).toBe(true);
    expect(result.current.nudges.map(n => n.id)).toEqual(['nudge-1', 'nudge-2']);

    // In focus_only mode, allNudges contains 2 system nudges + 1 highest priority task = 3 total
    expect(result.current.allNudges).toHaveLength(3);
    const systemNudgesInAll = result.current.allNudges.filter(n => !n.isTask);
    const taskNudgesInAll = result.current.allNudges.filter(n => n.isTask);
    expect(systemNudgesInAll).toHaveLength(2);
    expect(taskNudgesInAll).toHaveLength(1);
    expect(taskNudgesInAll[0].id).toBe('task-1');

    // Verify background scheduling to Service Worker receives the filtered nudges
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'UPDATE_NUDGES',
      nudges: expect.arrayContaining([
        expect.objectContaining({ id: 'nudge-1' }),
        expect.objectContaining({ id: 'nudge-2' }),
        expect.objectContaining({ id: 'task-1', isTask: true })
      ])
    });

    unmount();
  });

  it('includes all overdue tasks in allNudges when taskMode is set to all', async () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
      taskMode: 'all',
      habitNudgesEnabled: true,
      masterMuted: false
    }));

    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];

    const mockTasksData = [
      { id: 'task-1', title: 'Task 1', deadline: '2020-01-01', skip_count: 0, category: 'work' },
      { id: 'task-2', title: 'Task 2', deadline: '2020-01-02', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(3);
    });

    const taskNudges = result.current.allNudges.filter(n => n.isTask);
    expect(taskNudges).toHaveLength(2);
    expect(taskNudges.map(n => n.id)).toEqual(['task-1', 'task-2']);

    unmount();
  });

  it('creates single consolidated summary nudge when taskMode is consolidated', async () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
      taskMode: 'consolidated',
      habitNudgesEnabled: true,
      masterMuted: false
    }));

    const mockNudgesData = [];
    const mockTasksData = [
      { id: 'task-1', title: 'Important Feature', deadline: '2020-01-01', skip_count: 0, category: 'work' },
      { id: 'task-2', title: 'Write Tests', deadline: '2020-01-02', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(1);
    });

    const consolidatedNudge = result.current.allNudges[0];
    expect(consolidatedNudge.isTask).toBe(true);
    expect(consolidatedNudge.title).toBe('Polaris Focus: Important Feature (+1 more)');

    unmount();
  });

  it('excludes task notifications when taskMode is off', async () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
      taskMode: 'off',
      habitNudgesEnabled: true,
      masterMuted: false
    }));

    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];
    const mockTasksData = [
      { id: 'task-1', title: 'Important Feature', deadline: '2020-01-01', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.nudges).toHaveLength(1);
    });

    expect(result.current.allNudges.filter(n => n.isTask)).toHaveLength(0);

    unmount();
  });

  it('clears all scheduling and notifies service worker with empty nudges when masterMuted is true', async () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
      taskMode: 'focus_only',
      habitNudgesEnabled: true,
      masterMuted: true
    }));

    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];
    const mockTasksData = [
      { id: 'task-1', title: 'Task 1', deadline: '2020-01-01', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.nudges).toEqual([]);
      expect(result.current.allNudges).toEqual([]);
    });

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'UPDATE_NUDGES',
      nudges: []
    });

    unmount();
  });

  it('filters out system habit nudges when habitNudgesEnabled is false', async () => {
    localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
      taskMode: 'all',
      habitNudgesEnabled: false,
      masterMuted: false
    }));

    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];
    const mockTasksData = [
      { id: 'task-1', title: 'Task 1', deadline: '2020-01-01', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(1);
    });

    expect(result.current.nudges).toEqual([]);
    expect(result.current.allNudges[0].id).toBe('task-1');

    unmount();
  });

  it('refetches and updates nudges when polaris-notification-settings-changed event fires', async () => {
    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];
    const mockTasksData = [
      { id: 'task-1', title: 'Task 1', deadline: '2020-01-01', skip_count: 0, category: 'work' },
      { id: 'task-2', title: 'Task 2', deadline: '2020-01-02', skip_count: 0, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(2); // 1 system + 1 focus task
    });

    // Update localStorage and dispatch settings changed event to switch to 'all'
    await act(async () => {
      localStorage.setItem(NOTIFICATION_SETTINGS_STORAGE_KEY, JSON.stringify({
        taskMode: 'all',
        habitNudgesEnabled: true,
        masterMuted: false
      }));
      window.dispatchEvent(new CustomEvent(NOTIFICATION_SETTINGS_EVENT, {
        detail: { taskMode: 'all', habitNudgesEnabled: true, masterMuted: false }
      }));
    });

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(3); // 1 system + 2 tasks
    });

    unmount();
  });

  it('increments skip_count when dismissNudge is called on a task nudge', async () => {
    const mockNudgesData = [
      { id: 'nudge-1', user_id: 'test-user-id', title: 'Drink water', interval_minutes: 60, active: true }
    ];
    const mockTasksData = [
      { id: 'task-1', title: 'Overdue Task', deadline: '2020-01-01', skip_count: 2, category: 'work' }
    ];

    setupMock(mockNudgesData, mockTasksData);

    const { result, unmount } = renderHook(() => useNudgeScheduler());

    await waitFor(() => {
      expect(result.current.allNudges).toHaveLength(2);
    });

    await act(async () => {
      await result.current.dismissNudge('task-1');
    });

    expect(localStorage.getItem('nudge_last_dismissed_task-1')).toBeTruthy();
    expect(mockUpdate).toHaveBeenCalledWith({ skip_count: 3 });

    unmount();
  });
});
