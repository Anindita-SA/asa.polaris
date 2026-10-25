// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TodayAgendaWidget from './TodayAgendaWidget'
import * as offlineApi from '../../lib/offlineApi'
import * as soundLib from '../../lib/sound'

const mockUser = { id: 'test-user-456' }
const mockTrackXP = vi.fn()
const mockToggleComplete = vi.fn()
const mockAddTask = vi.fn()
const mockUpdateSortOrder = vi.fn()

let mockTasks = []

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: mockTrackXP
  })
}))

vi.mock('../../hooks/useTodaysTasks', () => ({
  useTodaysTasks: () => ({
    tasks: mockTasks,
    isLoading: false,
    toggleComplete: mockToggleComplete,
    addTask: mockAddTask,
    updateSortOrder: mockUpdateSortOrder
  })
}))

vi.mock('../../lib/sound', () => ({
  playChime: vi.fn()
}))

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn()
}))

describe('TodayAgendaWidget', () => {
  const todayStr = new Date().toLocaleDateString('en-CA')

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    offlineApi.offlineSelect.mockResolvedValue({ data: [] })
    offlineApi.offlineInsert.mockResolvedValue({ data: [{ id: 'pomo-1' }], error: null })
    offlineApi.offlineUpdate.mockResolvedValue({ data: [{ id: 'task-1' }], error: null })

    mockTasks = [
      {
        id: 'task-1',
        title: 'Master Thesis Chapter 2',
        completed: false,
        estimated_minutes: 60,
        time_estimate_minutes: 60,
        mental_load: 'high',
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 4,
        subtasks_completed: 1,
        __type: 'matrix_task'
      },
      {
        id: 'task-2',
        title: 'Design Filter PCB',
        completed: false,
        estimated_minutes: 30,
        time_estimate_minutes: 30,
        mental_load: 'medium',
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: 'task-1',
        parent_title: 'Master Thesis Chapter 2',
        subtasks_total: 0,
        subtasks_completed: 0,
        __type: 'matrix_task'
      },
      {
        id: 'task-3',
        title: 'Draft Application Statement',
        completed: false,
        estimated_minutes: 45,
        time_estimate_minutes: 45,
        mental_load: 'high',
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0,
        subtasks_completed: 0,
        __type: 'matrix_task'
      },
      {
        id: 'task-4',
        title: 'Fourth Priority Exceeding Cap',
        completed: false,
        estimated_minutes: 50,
        time_estimate_minutes: 50,
        mental_load: 'high',
        quadrant: 'not_urgent_important',
        deadline: null,
        parent_task_id: null,
        subtasks_total: 0,
        subtasks_completed: 0,
        __type: 'matrix_task'
      },
      {
        id: 'task-5',
        title: 'Reply to Professor Email',
        completed: false,
        estimated_minutes: 10,
        time_estimate_minutes: 10,
        mental_load: 'low',
        quadrant: 'urgent_not_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0,
        subtasks_completed: 0,
        __type: 'matrix_task'
      }
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Primaries capped at 3 tasks and renders badges', () => {
    render(<TodayAgendaWidget />)

    // Heading
    expect(screen.getByText("Today's Agenda")).toBeDefined()

    // Top 3 primaries should be rendered
    expect(screen.getByText('Master Thesis Chapter 2')).toBeDefined()
    expect(screen.getByText('Design Filter PCB')).toBeDefined()
    expect(screen.getByText('Draft Application Statement')).toBeDefined()

    // 4th primary should NOT be in primaries list (enforcing daily cap of 3)
    expect(screen.queryByText('Fourth Priority Exceeding Cap')).toBeNull()

    // Parent badge
    expect(screen.getByText('Parent (1/4 done)')).toBeDefined()

    // Subtask badge
    expect(screen.getByText('Subtask of: Master Thesis Chapter 2')).toBeDefined()
  })

  it('supports inline cosmetic Day Slice renaming saved to localStorage without altering database', async () => {
    render(<TodayAgendaWidget />)

    // Click on task title to edit
    const titleSpan = screen.getByText('Master Thesis Chapter 2')
    fireEvent.click(titleSpan)

    // Input appears
    const input = screen.getByDisplayValue('Master Thesis Chapter 2')
    fireEvent.change(input, { target: { value: 'Just read 5 pages of Chapter 2' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    // Verify day slice alias is rendered
    expect(screen.getByText('Just read 5 pages of Chapter 2')).toBeDefined()
    expect(screen.getByText('(day slice)')).toBeDefined()

    // Verify saved to localStorage under polaris_day_alias_<date>_<taskId>
    const stored = localStorage.getItem(`polaris_day_alias_${todayStr}_task-1`)
    expect(stored).toBe('Just read 5 pages of Chapter 2')

    // Verify offlineUpdate was NOT called for title (canonical db remains untouched)
    expect(offlineApi.offlineUpdate).not.toHaveBeenCalled()
  })

  it('clicking timebox chip inserts pomodoro_logs row, plays chime, and awards XP', async () => {
    render(<TodayAgendaWidget />)

    // Find 15m chip buttons
    const chips = screen.getAllByRole('button', { name: /15m/i })
    expect(chips.length).toBeGreaterThan(0)

    // Click the first timeblock chip
    const firstChip = chips.find(b => b.getAttribute('title')?.includes('Click to log'))
    expect(firstChip).toBeDefined()
    fireEvent.click(firstChip)

    // Sound chime called
    expect(soundLib.playChime).toHaveBeenCalledWith('success')

    // XP awarded
    expect(mockTrackXP).toHaveBeenCalledWith(false, true, 10)

    // pomodoro_logs record created via offlineInsert
    expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
      'pomodoro_logs',
      expect.objectContaining({
        user_id: mockUser.id,
        date: todayStr,
        duration_minutes: 15,
        label: 'Master Thesis Chapter 2'
      })
    )

    // State saved in localStorage
    const savedChips = localStorage.getItem(`polaris_timeboxes_${todayStr}_task-1`)
    expect(savedChips).toBeDefined()
    expect(JSON.parse(savedChips)[0]).toBe(true)
  })

  it('clicking circular checkmark toggles task completion', () => {
    render(<TodayAgendaWidget />)

    const toggleButtons = screen.getAllByTitle('Mark completed')
    expect(toggleButtons.length).toBeGreaterThan(0)

    fireEvent.click(toggleButtons[0])
    expect(mockToggleComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1' }),
      expect.anything()
    )
  })

  it('collapses and expands Quick Wins section for low mental load tasks', () => {
    render(<TodayAgendaWidget />)

    // Quick Wins button
    const quickWinsToggle = screen.getByRole('button', { name: /Quick Wins/i })
    expect(quickWinsToggle).toBeDefined()

    // Initially collapsed
    expect(screen.queryByText('Reply to Professor Email')).toBeNull()

    // Expand
    fireEvent.click(quickWinsToggle)
    expect(screen.getByText('Reply to Professor Email')).toBeDefined()
  })

  it('allows adding a daily task via Quick Add input bar', async () => {
    render(<TodayAgendaWidget />)

    const quickAddBtn = screen.getByTitle('Add task for today')
    fireEvent.click(quickAddBtn)

    const input = screen.getByPlaceholderText('Add task for today...')
    fireEvent.change(input, { target: { value: 'Buy oscilloscope probes' } })

    const addSubmitBtn = screen.getByRole('button', { name: 'Add' })
    fireEvent.click(addSubmitBtn)

    expect(mockAddTask).toHaveBeenCalledWith('Buy oscilloscope probes')
  })

  it('ignores empty or whitespace input in Quick Add bar', () => {
    render(<TodayAgendaWidget />)

    const quickAddBtn = screen.getByTitle('Add task for today')
    fireEvent.click(quickAddBtn)

    const input = screen.getByPlaceholderText('Add task for today...')
    fireEvent.change(input, { target: { value: '   ' } })

    const addSubmitBtn = screen.getByRole('button', { name: 'Add' })
    fireEvent.click(addSubmitBtn)

    expect(mockAddTask).not.toHaveBeenCalled()
  })

  it('logs exactly 15m for Quick Wins even when timebox mode is set to 30m', async () => {
    localStorage.setItem('polaris_timebox_mode', '30')
    render(<TodayAgendaWidget />)

    // Expand Quick Wins
    const quickWinsToggle = screen.getByRole('button', { name: /Quick Wins/i })
    fireEvent.click(quickWinsToggle)

    // Find the 15m quick focus chip in Quick Wins
    const quickChip = screen.getByTitle('Log 15m quick focus')
    expect(quickChip).toBeDefined()
    fireEvent.click(quickChip)

    // Verify offlineInsert logged 15 minutes, NOT 30 minutes
    expect(offlineApi.offlineInsert).toHaveBeenCalledWith(
      'pomodoro_logs',
      expect.objectContaining({
        user_id: mockUser.id,
        date: todayStr,
        duration_minutes: 15,
        label: 'Reply to Professor Email'
      })
    )
  })

  it('prioritizes incomplete tasks over completed tasks when selecting top 3 primaries', () => {
    mockTasks = [
      {
        id: 'completed-p0',
        title: 'Already Completed P0',
        completed: true,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'active-1',
        title: 'Active Task 1',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'active-2',
        title: 'Active Task 2',
        completed: false,
        estimated_minutes: 45,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'active-3',
        title: 'Active Task 3',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    // Active tasks 1, 2, 3 should occupy the 3 primary slots
    expect(screen.getByText('Active Task 1')).toBeDefined()
    expect(screen.getByText('Active Task 2')).toBeDefined()
    expect(screen.getByText('Active Task 3')).toBeDefined()

    // Completed task should not displace active tasks into the cap
    expect(screen.queryByText('Already Completed P0')).toBeNull()
  })
})
