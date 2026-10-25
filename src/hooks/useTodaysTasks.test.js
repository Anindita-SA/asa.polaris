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
})
