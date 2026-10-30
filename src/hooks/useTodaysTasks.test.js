// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTodaysTasks } from './useTodaysTasks'
import { offlineSelect, offlineUpdate, offlineInsert } from '../lib/offlineApi'

const mockUser = { id: 'test-user-123' }

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: vi.fn()
  })
}))

vi.mock('./useGoalCompletion', () => ({
  useGoalCompletion: () => ({
    toggleGoal: vi.fn()
  })
}))

vi.mock('../lib/sound', () => ({
  playChime: vi.fn()
}))

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis()
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => mockChannel,
    removeChannel: vi.fn()
  }
}))

vi.mock('../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn()
}))

describe('useTodaysTasks hook', () => {
  const todayStr = new Date().toLocaleDateString('en-CA')

  beforeEach(() => {
    vi.clearAllMocks()
    offlineInsert.mockResolvedValue({ data: [{}], error: null })
    offlineUpdate.mockResolvedValue({ data: [{}], error: null })
  })

  it('exposes sort_order, parent_task_id, deadline, and mental_load on mapped task objects', async () => {
    const mockAllTasks = [
      {
        id: 'task-parent',
        user_id: mockUser.id,
        title: 'Master Thesis Project',
        status: 'active',
        sort_order: 1,
        parent_task_id: null,
        deadline: todayStr,
        mental_load: 'high',
        estimated_minutes: 90,
        time_estimate_minutes: 90,
        created_at: '2026-10-25T01:00:00Z'
      },
      {
        id: 'task-child',
        user_id: mockUser.id,
        title: 'Literature Review Section',
        status: 'active',
        sort_order: 2,
        parent_task_id: 'task-parent',
        deadline: todayStr,
        mental_load: 'medium',
        estimated_minutes: 45,
        time_estimate_minutes: 45,
        created_at: '2026-10-25T02:00:00Z'
      }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_tasks') return { data: [], error: null }
      if (table === 'goals') return { data: [], error: null }
      if (table === 'tasks') return { data: mockAllTasks, error: null }
      return { data: [], error: null }
    })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.tasks.length).toBe(2)
    })

    const parent = result.current.tasks.find(t => t.id === 'task-parent')
    expect(parent).toBeDefined()
    expect(parent.sort_order).toBe(1)
    expect(parent.parent_task_id).toBeNull()
    expect(parent.deadline).toBe(todayStr)
    expect(parent.mental_load).toBe('high')
    expect(parent.subtasks_total).toBe(1)
    expect(parent.subtasks_completed).toBe(0)

    const child = result.current.tasks.find(t => t.id === 'task-child')
    expect(child).toBeDefined()
    expect(child.sort_order).toBe(2)
    expect(child.parent_task_id).toBe('task-parent')
    expect(child.parent_title).toBe('Master Thesis Project')
    expect(child.deadline).toBe(todayStr)
    expect(child.mental_load).toBe('medium')
  })

  it('sorts active matrix tasks primarily by sort_order ASC, falling back to created_at ASC', async () => {
    const mockAllTasks = [
      {
        id: 'task-b',
        user_id: mockUser.id,
        title: 'Task B created earlier without sort_order',
        status: 'active',
        sort_order: null,
        created_at: '2026-10-25T01:00:00Z'
      },
      {
        id: 'task-c',
        user_id: mockUser.id,
        title: 'Task C created later without sort_order',
        status: 'active',
        sort_order: null,
        created_at: '2026-10-25T02:00:00Z'
      },
      {
        id: 'task-a',
        user_id: mockUser.id,
        title: 'Task A with explicit sort_order 0',
        status: 'active',
        sort_order: 0,
        created_at: '2026-10-25T03:00:00Z'
      }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_tasks') return { data: [], error: null }
      if (table === 'goals') return { data: [], error: null }
      if (table === 'tasks') return { data: mockAllTasks, error: null }
      return { data: [], error: null }
    })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.tasks.length).toBe(3)
    })

    // Task A has sort_order 0 (first)
    // Task B has sort_order null and earlier created_at (second)
    // Task C has sort_order null and later created_at (third)
    expect(result.current.tasks[0].id).toBe('task-a')
    expect(result.current.tasks[1].id).toBe('task-b')
    expect(result.current.tasks[2].id).toBe('task-c')
  })

  it('updateSortOrder updates task in offline store and fires polaris-tasks-changed event', async () => {
    let mockTasksList = [
      { id: 'task-1', user_id: mockUser.id, title: 'Test Task', status: 'active', sort_order: 5 }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') {
        return { data: mockTasksList, error: null }
      }
      return { data: [], error: null }
    })

    offlineUpdate.mockImplementation(async (table, match, data) => {
      if (table === 'tasks') {
        mockTasksList = mockTasksList.map(t => t.id === match.id ? { ...t, ...data } : t)
      }
      return { data: [{}], error: null }
    })

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.tasks.length).toBe(1)
    })

    await act(async () => {
      await result.current.updateSortOrder('task-1', 0)
    })

    expect(offlineUpdate).toHaveBeenCalledWith('tasks', { id: 'task-1' }, { sort_order: 0 })
    expect(result.current.tasks[0].sort_order).toBe(0)
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'polaris-tasks-changed'
      })
    )
    dispatchSpy.mockRestore()
  })

  it('includes tasks marked done today when their deadline matches today', async () => {
    const mockTasks = [
      {
        id: 'done-today',
        user_id: mockUser.id,
        title: 'Completed Today Task',
        status: 'done',
        deadline: todayStr,
        created_at: '2026-10-25T01:00:00Z'
      },
      {
        id: 'done-yesterday',
        user_id: mockUser.id,
        title: 'Completed Yesterday Task',
        status: 'done',
        deadline: '2026-10-24',
        created_at: '2026-10-24T01:00:00Z'
      }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') return { data: mockTasks, error: null }
      return { data: [], error: null }
    })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.tasks.length).toBe(1)
    })

    expect(result.current.tasks[0].id).toBe('done-today')
    expect(result.current.tasks[0].completed).toBe(true)
  })

  it('excludes archived tasks from today tasks and excludes archived children from subtaskStats denominator', async () => {
    const mockTasks = [
      {
        id: 'parent-project',
        user_id: mockUser.id,
        title: 'Survey Paper Sprint',
        status: 'active',
        deadline: todayStr,
        created_at: '2026-10-25T01:00:00Z'
      },
      {
        id: 'child-done',
        user_id: mockUser.id,
        title: 'Done Subtask',
        parent_task_id: 'parent-project',
        status: 'done',
        created_at: '2026-10-25T02:00:00Z'
      },
      {
        id: 'child-active',
        user_id: mockUser.id,
        title: 'Active Subtask',
        parent_task_id: 'parent-project',
        status: 'active',
        created_at: '2026-10-25T03:00:00Z'
      },
      {
        id: 'child-archived',
        user_id: mockUser.id,
        title: 'Archived Subtask',
        parent_task_id: 'parent-project',
        status: 'archived',
        created_at: '2026-10-25T04:00:00Z'
      },
      {
        id: 'root-archived',
        user_id: mockUser.id,
        title: 'Archived Standalone Task',
        status: 'archived',
        deadline: todayStr,
        created_at: '2026-10-25T05:00:00Z'
      }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') return { data: mockTasks, error: null }
      return { data: [], error: null }
    })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const taskIds = result.current.tasks.map(t => t.id)
    expect(taskIds).not.toContain('root-archived')
    expect(taskIds).not.toContain('child-archived')

    const parent = result.current.tasks.find(t => t.id === 'parent-project')
    expect(parent).toBeDefined()
    // Total should only count active + done (2), NOT archived (which would make 3)
    expect(parent.subtasks_total).toBe(2)
    expect(parent.subtasks_completed).toBe(1)
  })

  it('supports silent = true in fetchTasks without flipping isLoading to true', async () => {
    offlineSelect.mockResolvedValue({ data: [], error: null })
    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let observedLoadingState = null
    await act(async () => {
      const fetchPromise = result.current.fetchTasks(true)
      observedLoadingState = result.current.isLoading
      await fetchPromise
    })

    expect(observedLoadingState).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('filters polaris-tasks-changed by table: ignores non-task tables and triggers on task tables silently', async () => {
    offlineSelect.mockClear()
    offlineSelect.mockResolvedValue({ data: [], error: null })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialSelectCalls = offlineSelect.mock.calls.length

    // Dispatch non-task table event (e.g. daily_plan, milestones)
    await act(async () => {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table: 'daily_plan' }
      }))
    })

    // Should NOT have triggered any new selects
    expect(offlineSelect.mock.calls.length).toBe(initialSelectCalls)

    // Dispatch empty detail object (should NOT trigger)
    await act(async () => {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: {}
      }))
    })

    expect(offlineSelect.mock.calls.length).toBe(initialSelectCalls)

    // Dispatch task table event (e.g. tasks)
    await act(async () => {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table: 'tasks' }
      }))
    })

    await waitFor(() => {
      expect(offlineSelect.mock.calls.length).toBeGreaterThan(initialSelectCalls)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('toggleComplete executes optimistic update and refreshes silently without setting isLoading to true', async () => {
    const mockTasks = [
      { id: 'task-toggle-1', user_id: mockUser.id, title: 'Toggle Test Task', status: 'active' }
    ]

    offlineSelect.mockImplementation(async (table) => {
      if (table === 'tasks') return { data: mockTasks, error: null }
      return { data: [], error: null }
    })
    offlineUpdate.mockResolvedValue({ data: [{}], error: null })

    const { result } = renderHook(() => useTodaysTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.tasks.length).toBe(1)
    })

    let observedLoadingStateDuringToggle = null
    await act(async () => {
      const togglePromise = result.current.toggleComplete(result.current.tasks[0])
      observedLoadingStateDuringToggle = result.current.isLoading
      await togglePromise
    })

    expect(observedLoadingStateDuringToggle).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })
})
