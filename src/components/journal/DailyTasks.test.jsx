// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DailyTasks from './DailyTasks'
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../../lib/offlineApi'

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

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn(),
  offlineDelete: vi.fn()
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('DailyTasks component', () => {
  const initialTasks = [
    { id: 'task-1', title: 'Write unit tests', completed: false, recurring: false, date: '2026-09-19', created_at: '2026-09-19T08:00:00Z' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    offlineSelect.mockResolvedValue({ data: initialTasks, error: null })
    offlineInsert.mockImplementation(async (table, payload) => ({
      data: [{ ...payload, id: payload.id || 'task-2' }],
      error: null
    }))
    offlineUpdate.mockResolvedValue({ data: [], error: null })
    offlineDelete.mockResolvedValue({ data: [], error: null })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders tasks fetched from database', async () => {
    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })
    expect(offlineSelect).toHaveBeenCalledWith('daily_tasks', { user_id: 'user-456', date: '2026-09-19' })
  })

  it('toggles task completion and grants XP on success', async () => {
    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })

    const buttons = screen.getAllByRole('button')
    // buttons[0] is plus/add, buttons[1] is checkmark toggle for task-1
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(offlineUpdate).toHaveBeenCalledWith('daily_tasks', { id: 'task-1' }, { completed: true })
      expect(mockCelebrate).toHaveBeenCalled()
      expect(mockTrackXP).toHaveBeenCalled()
    })
  })

  it('does NOT update local state or grant XP if toggleTask encounters database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    offlineUpdate.mockResolvedValueOnce({ data: null, error: { message: 'Database failure' } })

    render(<DailyTasks dateStr="2026-09-19" />)

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeDefined()
    })

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[1])

    await waitFor(() => {
      expect(offlineUpdate).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to update daily task:', { message: 'Database failure' })
      expect(mockCelebrate).not.toHaveBeenCalled()
      expect(mockTrackXP).not.toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })

  it('does not add task to local list if createTask encounters database error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    offlineSelect.mockResolvedValue({ data: [], error: null })
    offlineInsert.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

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
