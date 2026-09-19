// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRecurringTasks } from './useRecurringTasks';
import { offlineSelect, offlineInsert, offlineUpdate } from '../lib/offlineApi';

const mockUser = { id: 'test-user-123' };

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

vi.mock('../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn()
}));

describe('useRecurringTasks hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    offlineInsert.mockResolvedValue({ data: [{}], error: null });
    offlineUpdate.mockResolvedValue({ data: [{}], error: null });
  });

  it('does not create a duplicate when an active task exists and links missing source_template_id', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-1',
        user_id: 'test-user-123',
        title: 'Morning Run',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-active-1',
        user_id: 'test-user-123',
        title: 'morning run',
        status: 'active',
        source_template_id: null,
        created_at: '2026-09-01T08:00:00Z'
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).not.toBeNull();
    });

    // No duplicate task should be inserted
    expect(offlineInsert).not.toHaveBeenCalled();

    // The active task should be updated with source_template_id
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'task-active-1' },
      { source_template_id: 'tpl-1' }
    );

    // The template last_generated_date should be updated to today
    expect(offlineUpdate).toHaveBeenCalledWith(
      'recurring_task_templates',
      { id: 'tpl-1' },
      { last_generated_date: today }
    );

    expect(result.current.generated).toBe(0);
  });

  it('does not create a duplicate when a scheduled task exists with source_template_id already set', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-2',
        user_id: 'test-user-123',
        title: 'IELTS Practice',
        is_active: true,
        last_generated_date: null,
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-scheduled-1',
        user_id: 'test-user-123',
        title: 'IELTS Practice',
        status: 'scheduled',
        source_template_id: 'tpl-2',
        created_at: '2026-09-05T08:00:00Z'
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).not.toBeNull();
    });

    // No insert
    expect(offlineInsert).not.toHaveBeenCalled();

    // No update on tasks table because source_template_id is already populated
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', expect.anything(), expect.anything());

    // Template last_generated_date updated to today
    expect(offlineUpdate).toHaveBeenCalledWith(
      'recurring_task_templates',
      { id: 'tpl-2' },
      { last_generated_date: today }
    );

    expect(result.current.generated).toBe(0);
  });

  it('recycles the MOST RECENT completed task when no active or scheduled task exists', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-3',
        user_id: 'test-user-123',
        title: 'Daily Meditation',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily',
        is_habit: true
      }
    ];

    const tasks = [
      {
        id: 'task-done-old',
        user_id: 'test-user-123',
        title: 'Daily Meditation',
        status: 'done',
        source_template_id: 'tpl-3',
        created_at: '2026-09-01T07:00:00Z',
        completion_count: 1,
        completion_dates: ['2026-09-01']
      },
      {
        id: 'task-done-newest',
        user_id: 'test-user-123',
        title: 'daily meditation',
        status: 'done',
        source_template_id: 'tpl-3',
        created_at: '2026-09-08T07:00:00Z',
        completion_count: 4,
        completion_dates: ['2026-09-01', '2026-09-04', '2026-09-06', '2026-09-08']
      },
      {
        id: 'task-done-middle',
        user_id: 'test-user-123',
        title: 'Daily Meditation',
        status: 'done',
        source_template_id: 'tpl-3',
        created_at: '2026-09-04T07:00:00Z',
        completion_count: 2,
        completion_dates: ['2026-09-01', '2026-09-04']
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(1);
    });

    // Should NOT insert a new task
    expect(offlineInsert).not.toHaveBeenCalled();

    // Must recycle specifically the most recent row: task-done-newest
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'task-done-newest' },
      expect.objectContaining({
        status: 'active',
        source_template_id: 'tpl-3',
        completion_count: 5,
        skip_count: 0,
        category: 'habits',
        quadrant: 'important_not_urgent'
      })
    );

    // Old and middle completed tasks should not be recycled
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-done-old' }, expect.anything());
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-done-middle' }, expect.anything());

    // Template last_generated_date updated to today
    expect(offlineUpdate).toHaveBeenCalledWith(
      'recurring_task_templates',
      { id: 'tpl-3' },
      { last_generated_date: today }
    );
  });

  it('inserts a new task when neither active nor completed tasks exist', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-4',
        user_id: 'test-user-123',
        title: 'Learn Rust',
        notes: 'Chapter 1 to 3',
        quadrant: 'important_not_urgent',
        estimated_minutes: 45,
        is_active: true,
        last_generated_date: null,
        frequency: 'daily',
        is_habit: false
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: [], error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(1);
    });

    expect(offlineInsert).toHaveBeenCalledWith('tasks', expect.objectContaining({
      user_id: 'test-user-123',
      title: 'Learn Rust',
      notes: 'Chapter 1 to 3',
      quadrant: 'important_not_urgent',
      estimated_minutes: 45,
      status: 'active',
      source_template_id: 'tpl-4',
      completion_count: 0,
      completion_dates: [],
      skip_count: 0
    }));

    expect(offlineUpdate).toHaveBeenCalledWith(
      'recurring_task_templates',
      { id: 'tpl-4' },
      { last_generated_date: today }
    );
  });

  it('skips weekly template if less than 7 days have passed', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const lastGen = threeDaysAgo.toLocaleDateString('en-CA');

    const templates = [
      {
        id: 'tpl-weekly',
        user_id: 'test-user-123',
        title: 'Weekly Review',
        is_active: true,
        last_generated_date: lastGen,
        frequency: 'weekly'
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: [], error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(0);
    });

    expect(offlineInsert).not.toHaveBeenCalled();
    expect(offlineUpdate).not.toHaveBeenCalled();
  });

  it('only matches and recycles root tasks and ignores child subtasks with matching titles', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-subtask-test',
        user_id: 'test-user-123',
        title: 'IELTS Writing Practice',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-sub-active',
        user_id: 'test-user-123',
        title: 'IELTS Writing Practice',
        status: 'active',
        parent_task_id: 'parent-ielts-sprint',
        source_template_id: null,
        created_at: '2026-09-10T08:00:00Z'
      },
      {
        id: 'task-sub-done',
        user_id: 'test-user-123',
        title: 'IELTS Writing Practice',
        status: 'done',
        parent_task_id: 'parent-ielts-sprint',
        source_template_id: null,
        created_at: '2026-09-09T08:00:00Z'
      },
      {
        id: 'task-root-done',
        user_id: 'test-user-123',
        title: 'IELTS Writing Practice',
        status: 'done',
        parent_task_id: null,
        source_template_id: 'tpl-subtask-test',
        created_at: '2026-09-08T08:00:00Z',
        completion_count: 2,
        completion_dates: ['2026-09-01', '2026-09-08']
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(1);
    });

    // Subtasks should not be modified
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-sub-active' }, expect.anything());
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-sub-done' }, expect.anything());

    // Root completed task must be recycled
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'task-root-done' },
      expect.objectContaining({
        status: 'active',
        source_template_id: 'tpl-subtask-test',
        completion_count: 3
      })
    );
  });

  it('does not insert or recycle when an inbox or in_progress task exists', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-inbox-check',
        user_id: 'test-user-123',
        title: 'Draft Morning Journal',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-inbox-1',
        user_id: 'test-user-123',
        title: 'Draft Morning Journal',
        status: 'inbox',
        source_template_id: null,
        created_at: '2026-09-01T08:00:00Z'
      },
      {
        id: 'task-done-old',
        user_id: 'test-user-123',
        title: 'Draft Morning Journal',
        status: 'done',
        source_template_id: 'tpl-inbox-check',
        created_at: '2026-08-30T08:00:00Z',
        completion_count: 5
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(0);
    });

    // No duplicate insert
    expect(offlineInsert).not.toHaveBeenCalled();

    // The open inbox task should have source_template_id linked
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'task-inbox-1' },
      { source_template_id: 'tpl-inbox-check' }
    );

    // The old done task should NOT be recycled because an open task exists
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-done-old' }, expect.anything());
  });

  it('resets all child subtasks to active and updates their deadline when recycling a completed canonical task', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-daily-routine',
        user_id: 'test-user-123',
        title: 'Morning Launch Sequence',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-root-completed',
        user_id: 'test-user-123',
        title: 'Morning Launch Sequence',
        status: 'done',
        parent_task_id: null,
        source_template_id: 'tpl-daily-routine',
        created_at: '2026-09-01T06:00:00Z',
        completion_count: 3,
        completion_dates: ['2026-09-01']
      },
      {
        id: 'subtask-1',
        user_id: 'test-user-123',
        title: 'Hydrate 500ml',
        status: 'done',
        parent_task_id: 'task-root-completed',
        deadline: '2026-09-01'
      },
      {
        id: 'subtask-2',
        user_id: 'test-user-123',
        title: '10 min Stretching',
        status: 'done',
        parent_task_id: 'task-root-completed',
        deadline: '2026-09-01'
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(1);
    });

    // Root completed task must be recycled
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'task-root-completed' },
      expect.objectContaining({
        status: 'active',
        deadline: today,
        source_template_id: 'tpl-daily-routine'
      })
    );

    // All child subtasks must be reset to active with deadline today and completion history recorded
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'subtask-1' },
      { status: 'active', deadline: today, completion_count: 1, completion_dates: ['2026-09-01'] }
    );
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'subtask-2' },
      { status: 'active', deadline: today, completion_count: 1, completion_dates: ['2026-09-01'] }
    );
  });

  it('resets completed child subtasks to active when an open parent task exists and template last_generated_date is before today', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    const templates = [
      {
        id: 'tpl-ielts-sprint',
        user_id: 'test-user-123',
        title: 'IELTS Sprint',
        is_active: true,
        last_generated_date: '2026-09-01',
        frequency: 'daily'
      }
    ];

    const tasks = [
      {
        id: 'task-parent-active',
        user_id: 'test-user-123',
        title: 'IELTS Sprint',
        status: 'active',
        parent_task_id: null,
        source_template_id: 'tpl-ielts-sprint',
        created_at: '2026-09-01T06:00:00Z',
        deadline: '2026-09-01'
      },
      {
        id: 'subtask-done-1',
        user_id: 'test-user-123',
        title: 'Reading Section Practice',
        status: 'done',
        parent_task_id: 'task-parent-active',
        deadline: '2026-09-01',
        completion_count: 2,
        completion_dates: ['2026-08-31', '2026-09-01']
      },
      {
        id: 'subtask-active-2',
        user_id: 'test-user-123',
        title: 'Speaking Section Practice',
        status: 'active',
        parent_task_id: 'task-parent-active',
        deadline: '2026-09-01',
        completion_count: 1,
        completion_dates: ['2026-08-31']
      },
      {
        id: 'subtask-done-3',
        user_id: 'test-user-123',
        title: 'Writing Section Practice',
        status: 'done',
        parent_task_id: 'task-parent-active',
        deadline: null,
        completion_count: 0,
        completion_dates: []
      }
    ];

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'recurring_task_templates') return { data: templates, error: null };
      if (table === 'tasks') return { data: tasks, error: null };
      return { data: [], error: null };
    });

    const { result } = renderHook(() => useRecurringTasks());

    await waitFor(() => {
      expect(result.current.generated).toBe(2);
    });

    // No duplicate tasks should be inserted
    expect(offlineInsert).not.toHaveBeenCalled();

    // Already active subtask should NOT be modified
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'subtask-active-2' }, expect.anything());

    // Completed subtasks must be reset to active with deadline today and completion history updated
    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'subtask-done-1' },
      {
        status: 'active',
        deadline: today,
        completion_count: 3,
        completion_dates: ['2026-08-31', '2026-09-01']
      }
    );

    expect(offlineUpdate).toHaveBeenCalledWith(
      'tasks',
      { id: 'subtask-done-3' },
      {
        status: 'active',
        deadline: today,
        completion_count: 1,
        completion_dates: ['2026-09-01']
      }
    );

    // Parent task source_template_id is already set, so parent task itself should not receive a redundant update
    expect(offlineUpdate).not.toHaveBeenCalledWith('tasks', { id: 'task-parent-active' }, expect.anything());

    // Template last_generated_date must be updated to today
    expect(offlineUpdate).toHaveBeenCalledWith(
      'recurring_task_templates',
      { id: 'tpl-ielts-sprint' },
      { last_generated_date: today }
    );
  });
});
