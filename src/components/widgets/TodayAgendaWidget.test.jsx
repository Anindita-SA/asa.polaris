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
const mockAddSubtask = vi.fn()
const mockAttachSubtask = vi.fn()
const mockUpdateSortOrder = vi.fn()

let mockTasks = []
let mockAllBacklogTasks = []

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: mockTrackXP
  })
}))

vi.mock('../../hooks/useTodaysTasks', () => ({
  useTodaysTasks: () => ({
    tasks: mockTasks,
    allBacklogTasks: mockAllBacklogTasks,
    isLoading: false,
    toggleComplete: mockToggleComplete,
    addTask: mockAddTask,
    addSubtask: mockAddSubtask,
    attachSubtask: mockAttachSubtask,
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

  it('renders visual Day Completion Progress Bar with ratio, percentage, and secondary summary', () => {
    render(<TodayAgendaWidget />)

    // Progress bar label: 0 of 3 Primaries Cleared • 0%
    expect(screen.getByText(/0 of 3 Primaries Cleared • 0%/i)).toBeDefined()

    // Secondary summary: 0/5 total agenda items done • 0m logged
    expect(screen.getByText(/0\/5 total agenda items done/i)).toBeDefined()
    expect(screen.getAllByText(/0m logged/i).length).toBe(2)

    // Progress bar element
    const progressBar = screen.getByRole('progressbar', { name: /Day Completion Progress/i })
    expect(progressBar).toBeDefined()
    expect(progressBar.getAttribute('aria-valuenow')).toBe('0')
  })

  it('updates Day Completion Progress Bar ratio and percentage when primary tasks are completed', () => {
    localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(['task-1', 'task-2', 'task-3']))
    mockTasks[0].completed = true // 1 of 3 primaries completed

    render(<TodayAgendaWidget />)

    expect(screen.getByText(/1 of 3 Primaries Cleared • 33%/i)).toBeDefined()
    expect(screen.getByText(/1\/5 total agenda items done/i)).toBeDefined()

    const progressBar = screen.getByRole('progressbar', { name: /Day Completion Progress/i })
    expect(progressBar.getAttribute('aria-valuenow')).toBe('33')
  })

  it('renders dedicated visual Subtask Bar directly on parent task cards', () => {
    render(<TodayAgendaWidget />)

    // Subtask progress bar with aria-label="Subtask progress" and aria-valuenow="25"
    const subtaskBars = screen.getAllByRole('progressbar', { name: /Subtask progress/i })
    expect(subtaskBars.length).toBeGreaterThan(0)
    expect(subtaskBars[0].getAttribute('aria-valuenow')).toBe('25')

    // Parent badge is preserved
    expect(screen.getByText('Parent (1/4 done)')).toBeDefined()
  })

  it('default auto-alignment prioritizes matching Daily Task Audit P0 primaries even when overdue', () => {
    mockTasks = [
      {
        id: 'random-task-1',
        title: 'Random Routine Item Due Today',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'audit-dab',
        title: 'DAB Converter & Power Electronics EMC Research (Dr. Vignesh Kumar)',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: '2026-10-18',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'audit-portfolio',
        title: 'Portfolio: Replace AI Product Sketches with Real ID Sketches',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: '2026-10-23',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'audit-agri',
        title: 'Agri Solar Survey Paper: Phase 2 (Reading & Synthesis)',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'important_not_urgent',
        deadline: '2026-10-18',
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    // All 3 audit primaries must be rendered in primaries list
    expect(screen.getByText('Portfolio: Replace AI Product Sketches with Real ID Sketches')).toBeDefined()
    expect(screen.getByText('Agri Solar Survey Paper: Phase 2 (Reading & Synthesis)')).toBeDefined()
    expect(screen.getByText('DAB Converter & Power Electronics EMC Research (Dr. Vignesh Kumar)')).toBeDefined()

    // Random task due today must be displaced beyond the 3-primary cap
    expect(screen.queryByText('Random Routine Item Due Today')).toBeNull()
  })

  it('clicking Align Audit button matches audit primaries and saves order to localStorage', async () => {
    mockTasks = [
      {
        id: 't-random',
        title: 'Unrelated Routine Work',
        completed: false,
        estimated_minutes: 45,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 't-agri',
        title: 'Agri Solar Survey Paper: Phase 2 (Reading & Synthesis)',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'important_not_urgent',
        deadline: '2026-10-18',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 't-port',
        title: 'Portfolio: Replace AI Product Sketches with Real ID Sketches',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: '2026-10-23',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 't-dab',
        title: 'DAB Converter & Power Electronics EMC Research (Dr. Vignesh Kumar)',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: '2026-10-18',
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    const alignBtn = screen.getByRole('button', { name: /align audit/i })
    expect(alignBtn).toBeDefined()

    fireEvent.click(alignBtn)

    // Order saved to localStorage: Portfolio, Agri, DAB
    const savedOrder = JSON.parse(localStorage.getItem(`polaris_today_order_${todayStr}`))
    expect(savedOrder).toEqual(['t-port', 't-agri', 't-dab'])

    // UI shows aligned state
    expect(screen.getByText('Aligned!')).toBeDefined()
  })

  it('recognizes custom directives in polaris_audit_directives_<date>', () => {
    localStorage.setItem(
      `polaris_audit_directives_${todayStr}`,
      JSON.stringify([
        'Custom Priority Task One',
        'Custom Priority Task Two',
        'Custom Priority Task Three'
      ])
    )

    mockTasks = [
      {
        id: 'custom-3',
        title: 'Custom Priority Task Three',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: null,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'custom-1',
        title: 'Custom Priority Task One',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'important_not_urgent',
        deadline: null,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'custom-2',
        title: 'Custom Priority Task Two',
        completed: false,
        estimated_minutes: 45,
        quadrant: 'urgent_important',
        deadline: null,
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'random-ignored',
        title: 'Random Ignored Task',
        completed: false,
        estimated_minutes: 20,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    expect(screen.getByText('Custom Priority Task One')).toBeDefined()
    expect(screen.getByText('Custom Priority Task Two')).toBeDefined()
    expect(screen.getByText('Custom Priority Task Three')).toBeDefined()
    expect(screen.queryByText('Random Ignored Task')).toBeNull()
  })

  it('locking primaries into polaris_today_order on completion toggle preserves daily primaries', async () => {
    render(<TodayAgendaWidget />)

    expect(localStorage.getItem(`polaris_today_order_${todayStr}`)).toBeNull()

    const toggleBtns = screen.getAllByTitle('Mark completed')
    fireEvent.click(toggleBtns[0])

    const saved = localStorage.getItem(`polaris_today_order_${todayStr}`)
    expect(saved).toBeDefined()
    expect(JSON.parse(saved)).toEqual(['task-1', 'task-2', 'task-3'])
    expect(mockToggleComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1' }),
      expect.anything()
    )
  })

  it('renders analog notebook header and legend [each box is 15min or 1 count]', () => {
    render(<TodayAgendaWidget />)

    expect(screen.getByText('what would I like to do today?')).toBeDefined()
    expect(screen.getByText('[each box is 15min or 1 count]')).toBeDefined()
  })

  it('renders default multi-tracks for cold mail and outreach tasks', () => {
    mockTasks = [
      {
        id: 'task-outreach',
        title: 'Cold mail outreach to professors',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    // Should render split tracks 'draft:' and 'sche:'
    expect(screen.getByText('draft:')).toBeDefined()
    expect(screen.getByText('sche:')).toBeDefined()
  })

  it('toggles quick subtask search popover and triggers addSubtask', async () => {
    mockTasks = [
      {
        id: 'parent-1',
        title: 'Master Thesis Project',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 2,
        subtasks_completed: 1
      }
    ]

    render(<TodayAgendaWidget />)

    const subtaskBtn = screen.getByTitle('Quick search backlog or add subtask under this parent')
    expect(subtaskBtn).toBeDefined()
    fireEvent.click(subtaskBtn)

    // Popover opens
    expect(screen.getByText(/Quick Subtask for:/i)).toBeDefined()
    const input = screen.getByPlaceholderText('Search backlog or type new subtask...')
    fireEvent.change(input, { target: { value: 'Write Methodology Section' } })

    const createBtn = screen.getByRole('button', { name: 'Create' })
    fireEvent.click(createBtn)

    expect(mockAddSubtask).toHaveBeenCalledWith('parent-1', 'Write Methodology Section')
  })

  it('clicking checked tally box unchecks it and adjusts logged focus minutes', async () => {
    mockTasks = [
      {
        id: 'task-1',
        title: 'Agri Solar Survey Paper',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    const firstBox = screen.getAllByTitle(/Click to log completed 15m focus block/i)[0]
    expect(firstBox).toBeDefined()

    // Check box
    fireEvent.click(firstBox)
    expect(screen.getAllByText('15m logged').length).toBeGreaterThanOrEqual(1)

    // Uncheck box
    const checkedBox = screen.getByTitle(/Completed 15m focus session \(click to uncheck\)/i)
    fireEvent.click(checkedBox)
    expect(screen.getAllByText('0m logged').length).toBeGreaterThanOrEqual(1)
  })

  it('sorts child subtasks with position != null first, then by created_at, then by id', () => {
    mockTasks = [
      {
        id: 'parent-1',
        title: 'Master Thesis Project',
        completed: false,
        estimated_minutes: 60,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 5,
        subtasks_completed: 0
      },
      {
        id: 'parent-2',
        title: 'Secondary Project Alpha',
        completed: false,
        estimated_minutes: 45,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0,
        subtasks_completed: 0
      },
      {
        id: 'parent-3',
        title: 'Secondary Project Beta',
        completed: false,
        estimated_minutes: 45,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0,
        subtasks_completed: 0
      },
      {
        id: 'child-d',
        title: 'Subtask D (null pos, later date)',
        completed: false,
        parent_task_id: 'parent-1',
        position: null,
        created_at: '2026-10-04T12:00:00Z'
      },
      {
        id: 'child-a',
        title: 'Subtask A (position 2)',
        completed: false,
        parent_task_id: 'parent-1',
        position: 2,
        created_at: '2026-10-01T12:00:00Z'
      },
      {
        id: 'child-b',
        title: 'Subtask B (position 1)',
        completed: false,
        parent_task_id: 'parent-1',
        position: 1,
        created_at: '2026-10-05T12:00:00Z'
      },
      {
        id: 'child-c',
        title: 'Subtask C (null pos, earlier date)',
        completed: false,
        parent_task_id: 'parent-1',
        position: null,
        created_at: '2026-10-02T12:00:00Z'
      },
      {
        id: 'child-e',
        title: 'Subtask E (null pos, same date as C, later id)',
        completed: false,
        parent_task_id: 'parent-1',
        position: null,
        created_at: '2026-10-02T12:00:00Z'
      }
    ]

    render(<TodayAgendaWidget />)

    const subtaskTitles = screen.getAllByText(/Subtask [A-E]/i).map(el => el.textContent)
    expect(subtaskTitles).toEqual([
      'Subtask B (position 1)',
      'Subtask A (position 2)',
      'Subtask C (null pos, earlier date)',
      'Subtask E (null pos, same date as C, later id)',
      'Subtask D (null pos, later date)'
    ])
  })
})
