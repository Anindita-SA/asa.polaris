// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DailyTasks from './DailyTasks'
import { supabase } from '../../lib/supabase'

const mockUser = { id: 'user-456' }
const mockTrackXP = vi.fn()
const mockCelebrate = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, trackXP: mockTrackXP })
}))

vi.mock('../../hooks/useCelebration', () => ({
  useCelebration: () => ({ celebrate: mockCelebrate })
}))

vi.mock('../../lib/sound', () => ({
  playChime: vi.fn()
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

const createChainableBuilder = (resolvedValue = { data: null, error: null }) => {
  const builder = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'order', 'limit']
  methods.forEach(m => {
    builder[m] = vi.fn(() => builder)
  })
  builder.single = vi.fn(() => Promise.resolve(resolvedValue))
  builder.maybeSingle = vi.fn(() => Promise.resolve(resolvedValue))
  builder.then = (onFulfilled, onRejected) => Promise.resolve(resolvedValue).then(onFulfilled, onRejected)
  return builder
}

describe('DailyTasks component', () => {
  const initialTasks = [
    { id: 'task-1', title: 'Write unit tests', completed: false, recurring: false, date: '2026-09-19' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    supabase.from.mockImplementation((table) => {
      if (table === 'daily_tasks') {
        const selectBuilder = createChainableBuilder({ data: initialTasks, error: null })
        const updateBuilder = createChainableBuilder({ data: null, error: null })
        const insertBuilder = createChainableBuilder({
          data: { id: 'task-2', title: 'New target task', completed: false, recurring: false, date: '2026-09-19' },
          error: null
        })
        const deleteBuilder = createChainableBuilder({ data: null, error: null })

        return {
          select: selectBuilder.select,
          update: updateBuilder.update,
          insert: insertBuilder.insert,
          delete: deleteBuilder.delete
        }
      }
      return createChainableBuilder()
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders tasks fetched from database', async () => {
    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })
  })

  it('toggles task completion and grants XP on success', async () => {
    const updateBuilder = createChainableBuilder({ data: null, error: null })
    const selectBuilder = createChainableBuilder({ data: initialTasks, error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'daily_tasks') {
        return {
          select: selectBuilder.select,
          update: updateBuilder.update
        }
      }
      return createChainableBuilder()
    })

    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })

    const buttons = screen.getAllByRole('button')
    // buttons[0] is plus/add, buttons[1] is checkmark toggle for task-1
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(updateBuilder.update).toHaveBeenCalledWith({ completed: true })
      expect(mockCelebrate).toHaveBeenCalled()
      expect(mockTrackXP).toHaveBeenCalled()
    })
  })

  it('does NOT update local state or grant XP if toggleTask encounters database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const updateBuilder = createChainableBuilder({ data: null, error: { message: 'Database failure' } })
    const selectBuilder = createChainableBuilder({ data: initialTasks, error: null })

    supabase.from.mockImplementation((table) => {
      if (table === 'daily_tasks') {
        return {
          select: selectBuilder.select,
          update: updateBuilder.update
        }
      }
      return createChainableBuilder()
    })

    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(updateBuilder.update).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update daily task:', { message: 'Database failure' })
      expect(mockCelebrate).not.toHaveBeenCalled()
      expect(mockTrackXP).not.toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('does not add task to local list if createTask encounters database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const selectBuilder = createChainableBuilder({ data: [], error: null })
    const insertBuilder = createChainableBuilder({ data: null, error: { message: 'Insert failed' } })

    supabase.from.mockImplementation((table) => {
      if (table === 'daily_tasks') {
        return {
          select: selectBuilder.select,
          insert: insertBuilder.insert,
          update: createChainableBuilder().update
        }
      }
      return createChainableBuilder()
    })

    render(<DailyTasks dateStr="2026-09-19" />)

    const addButton = screen.getByRole('button')
    fireEvent.click(addButton)

    const input = screen.getByPlaceholderText('What must be done today?')
    fireEvent.change(input, { target: { value: 'Failed task' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to create daily task:', { message: 'Insert failed' })
      expect(screen.queryByText('Failed task')).toBeNull()
    })

    consoleSpy.mockRestore()
  })
})
