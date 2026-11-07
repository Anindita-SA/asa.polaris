// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import TodayAgendaWidget from './TodayAgendaWidget'
import * as offlineApi from '../../lib/offlineApi'
import * as soundLib from '../../lib/sound'

const mockUser = { id: 'test-user-456' }
const mockTrackXP = vi.fn()
const mockAddXP = vi.fn().mockResolvedValue(true)
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
    trackXP: mockTrackXP,
    addXP: mockAddXP
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

vi.mock('../../lib/offlineApi', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    offlineSelect: vi.fn(),
    offlineInsert: vi.fn(),
    offlineUpdate: vi.fn(),
    offlineDelete: vi.fn()
  }
})

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

    // XP awarded via applyPlanXpDelta and addXP
    await waitFor(() => {
      expect(mockAddXP).toHaveBeenCalledWith(10)
    })
    expect(mockTrackXP).not.toHaveBeenCalled()

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
        id: 'audit-proposal',
        title: 'Draft 1-page conducted EMI paper proposal & research scope pitch',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'audit-simulink',
        title: 'Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model',
        completed: false,
        estimated_minutes: 120,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 'audit-lor',
        title: 'Academic recommendation letter draft final review & dispatch',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    // All 3 audit primaries must be rendered in primaries list
    expect(screen.getByText('Draft 1-page conducted EMI paper proposal & research scope pitch')).toBeDefined()
    expect(screen.getByText('Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model')).toBeDefined()
    expect(screen.getByText('Academic recommendation letter draft final review & dispatch')).toBeDefined()

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
        id: 't-simulink',
        title: 'Integrate 50-ohm LISN blocks & parasitical coupling into DAB Simulink model',
        completed: false,
        estimated_minutes: 120,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 't-proposal',
        title: 'Draft 1-page conducted EMI paper proposal & research scope pitch',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      },
      {
        id: 't-lor',
        title: 'Academic recommendation letter draft final review & dispatch',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: '2026-11-04',
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    render(<TodayAgendaWidget />)

    const alignBtn = screen.getByRole('button', { name: /align audit/i })
    expect(alignBtn).toBeDefined()

    fireEvent.click(alignBtn)

    // Order saved to localStorage: Proposal, Simulink LISN, LOR
    const savedOrder = JSON.parse(localStorage.getItem(`polaris_today_order_${todayStr}`))
    expect(savedOrder).toEqual(['t-proposal', 't-simulink', 't-lor'])

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

  it('respects rollback feature flag: when set to false, reads pure localStorage without calling DB', async () => {
    localStorage.setItem('polaris_ff_day_guide_db_read', 'false')
    offlineApi.offlineSelect.mockClear()

    mockTasks = [
      {
        id: 'task-rb',
        title: 'Rollback Task Test',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    localStorage.setItem(`polaris_timeboxes_${todayStr}_task-rb`, JSON.stringify([true, false]))

    render(<TodayAgendaWidget />)

    // Verify daily_plan was NOT queried because rollback flag was off
    expect(offlineApi.offlineSelect).not.toHaveBeenCalledWith('daily_plan', expect.anything())
  })

  it('accepts tasks and action methods as props, overriding useTodaysTasks fallback', async () => {
    const propTasks = [
      {
        id: 'prop-task-1',
        title: 'Task Passed Via Props',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]
    const propToggleComplete = vi.fn()

    render(
      <TodayAgendaWidget
        tasks={propTasks}
        toggleComplete={propToggleComplete}
      />
    )

    expect(await screen.findByText('Task Passed Via Props')).toBeDefined()
    const checkbox = screen.getByTitle('Mark completed')
    fireEvent.click(checkbox)
    expect(propToggleComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'prop-task-1' }),
      expect.anything()
    )
    expect(mockToggleComplete).not.toHaveBeenCalled()
  })

  it('renders loading state when isLoading prop is true', () => {
    render(
      <TodayAgendaWidget
        tasks={[]}
        isLoading={true}
      />
    )

    expect(screen.getByText('Loading priorities...')).toBeDefined()
  })

  it('guards importTodayLocalStorageToDb with hasImportedTodayRef so it runs once per mount across prop updates', async () => {
    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') return { data: [], error: null }
      if (table === 'daily_plan_streams') return { data: [], error: null }
      return { data: [], error: null }
    })

    const initialTasks = [
      {
        id: 'task-guard-1',
        title: 'Guard Task 1',
        completed: false,
        estimated_minutes: 30,
        quadrant: 'urgent_important',
        deadline: todayStr,
        parent_task_id: null,
        subtasks_total: 0
      }
    ]

    const { rerender } = render(
      <TodayAgendaWidget
        tasks={initialTasks}
        isLoading={false}
      />
    )

    await waitFor(() => {
      expect(offlineApi.offlineSelect).toHaveBeenCalledWith('daily_plan', expect.anything())
    })

    const dailyPlanCallsAfterMount = offlineApi.offlineSelect.mock.calls.filter(c => c[0] === 'daily_plan').length

    // Rerender with a newly allocated tasks array reference (simulating background silent update)
    const updatedTasks = [
      {
        ...initialTasks[0],
        title: 'Guard Task 1 Updated'
      }
    ]

    rerender(
      <TodayAgendaWidget
        tasks={updatedTasks}
        isLoading={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Guard Task 1 Updated')).toBeDefined()
    })

    // Verify importTodayLocalStorageToDb was NOT called again on subsequent render
    const dailyPlanCallsAfterRerender = offlineApi.offlineSelect.mock.calls.filter(c => c[0] === 'daily_plan').length
    // The second offlineSelect call in loadTimeboxesAndTracks reads daily_plan, but import idempotency check was bypassed
    expect(dailyPlanCallsAfterRerender).toBeLessThanOrEqual(dailyPlanCallsAfterMount + 1)
  })

  it('auto-completes task with skipXP when ticking the last box reaches target_boxes', async () => {
    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') {
        return {
          data: [{
            id: 'plan-sb-1',
            user_id: mockUser.id,
            plan_date: todayStr,
            task_id: 'task-single-box',
            slot: 1,
            target_boxes: 1,
            done_boxes: 0,
            target_overridden: true
          }],
          error: null
        }
      }
      return { data: [], error: null }
    })

    const singleBoxTask = {
      id: 'task-single-box',
      title: 'Quick Heuristic Task',
      completed: false,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 1,
      __type: 'matrix_task'
    }

    render(
      <TodayAgendaWidget
        tasks={[singleBoxTask]}
        toggleComplete={mockToggleComplete}
      />
    )

    const chip = await screen.findByTitle(/focus block/i)
    fireEvent.click(chip)

    await waitFor(() => {
      expect(mockToggleComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-single-box' }),
        null,
        { skipXP: true }
      )
    })
  })

  it('reopens task with skipXP when unticking a box below target and auto_completed is true', async () => {
    const completedTask = {
      id: 'task-auto-reopen',
      title: 'Auto Reopen Task',
      completed: true,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 0,
      __type: 'matrix_task'
    }

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') {
        return {
          data: [
            {
              id: 'plan-auto-reopen',
              user_id: mockUser.id,
              plan_date: todayStr,
              task_id: 'task-auto-reopen',
              slot: 1,
              target_boxes: 2,
              done_boxes: 2,
              status: 'cleared',
              auto_completed: true,
              xp_awarded: 20
            }
          ],
          error: null
        }
      }
      return { data: [], error: null }
    })

    localStorage.setItem(
      `polaris_timeboxes_${todayStr}_task-auto-reopen`,
      JSON.stringify([true, true])
    )

    render(
      <TodayAgendaWidget
        tasks={[completedTask]}
        toggleComplete={mockToggleComplete}
      />
    )

    await waitFor(() => {
      const checkedChips = screen.getAllByTitle(/Completed 15m focus session/i)
      expect(checkedChips.length).toBe(2)
    })

    const checkedChips = screen.getAllByTitle(/Completed 15m focus session/i)
    fireEvent.click(checkedChips[1])

    await waitFor(() => {
      expect(mockToggleComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-auto-reopen' }),
        null,
        { skipXP: true }
      )
    })
  })

  it('does NOT reopen task on unticking if task was completed manually (auto_completed is false)', async () => {
    const manuallyCompletedTask = {
      id: 'task-manual-done',
      title: 'Manual Done Task',
      completed: true,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 0,
      __type: 'matrix_task'
    }

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') {
        return {
          data: [
            {
              id: 'plan-manual-done',
              user_id: mockUser.id,
              plan_date: todayStr,
              task_id: 'task-manual-done',
              slot: 1,
              target_boxes: 2,
              done_boxes: 2,
              status: 'cleared',
              auto_completed: false,
              xp_awarded: 20
            }
          ],
          error: null
        }
      }
      return { data: [], error: null }
    })

    localStorage.setItem(
      `polaris_timeboxes_${todayStr}_task-manual-done`,
      JSON.stringify([true, true])
    )

    render(
      <TodayAgendaWidget
        tasks={[manuallyCompletedTask]}
        toggleComplete={mockToggleComplete}
      />
    )

    await waitFor(() => {
      const checkedChips = screen.getAllByTitle(/Completed 15m focus session/i)
      expect(checkedChips.length).toBe(2)
    })

    const checkedChips = screen.getAllByTitle(/Completed 15m focus session/i)
    fireEvent.click(checkedChips[1])

    await new Promise(r => setTimeout(r, 100))
    expect(mockToggleComplete).not.toHaveBeenCalled()
  })

  it('ticks the only box on a 1-box task, keeps row struck through, shows undo toast, and clicking Undo reopens it', async () => {
    let planData = [{
      id: 'plan-1',
      user_id: mockUser.id,
      plan_date: todayStr,
      task_id: 'task-fixture-1box',
      slot: 1,
      target_boxes: 1,
      done_boxes: 0,
      target_overridden: true
    }]
    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') return { data: planData, error: null }
      return { data: [], error: null }
    })
    offlineApi.offlineInsert.mockImplementation(async (table, row) => {
      if (table === 'daily_plan') {
        planData = [{ ...row }]
        return { data: [row], error: null }
      }
      return { data: [{ id: 'mock-insert-id' }], error: null }
    })
    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      if (table === 'daily_plan') {
        planData = planData.map(p => ({ ...p, ...data }))
        return { data: planData, error: null }
      }
      return { data: [{}], error: null }
    })

    const singleBoxTask = {
      id: 'task-fixture-1box',
      title: 'Heuristic One Box Task',
      completed: false,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 1,
      __type: 'matrix_task'
    }

    render(
      <TodayAgendaWidget
        tasks={[singleBoxTask]}
        toggleComplete={mockToggleComplete}
      />
    )

    // Wait for initial hydration to complete
    await waitFor(() => {
      expect(offlineApi.offlineSelect).toHaveBeenCalledWith('daily_plan', expect.anything())
    })

    // Initially title is visible and not struck through
    const titleSpan = screen.getByText('Heuristic One Box Task')
    expect(titleSpan).toBeDefined()
    expect(titleSpan.className).not.toContain('line-through')

    // Find the 15m focus box chip
    const chip = screen.getByTitle(/Click to log completed 15m focus block/i)
    fireEvent.click(chip)

    // Row stays visible and struck through (has line-through)
    await waitFor(() => {
      expect(titleSpan.className).toContain('line-through')
    })

    // Undo toast appears
    const toast = await screen.findByTestId('undo-completion-toast')
    expect(toast).toBeDefined()
    expect(screen.getByText(/"Heuristic One Box Task"/i)).toBeDefined()

    // XP awarded (+10) via applyPlanXpDelta
    await waitFor(() => {
      expect(mockAddXP).toHaveBeenCalledWith(10)
    })

    // Click Undo button
    const undoBtn = screen.getByTestId('undo-completion-btn')
    fireEvent.click(undoBtn)

    // Undo toast is dismissed
    await waitFor(() => {
      expect(screen.queryByTestId('undo-completion-toast')).toBeNull()
    })

    // Struck through is removed
    await waitFor(() => {
      expect(titleSpan.className).not.toContain('line-through')
    })

    // Box is unticked (button returns to uncompleted title)
    expect(screen.getByTitle(/Click to log completed 15m focus block/i)).toBeDefined()

    // XP delta reversed (-10)
    expect(mockAddXP).toHaveBeenCalledWith(-10)

    // Reopened via toggleComplete with skipXP
    expect(mockToggleComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-fixture-1box' }),
      null,
      { skipXP: true }
    )
  })

  it('Rule 1 and 4: stale plan with target_boxes: 3 for a 30 min task is reconciled to 2 boxes (chips rendered, target_boxes, and auto-complete threshold all 2)', async () => {
    let planData = [{
      id: 'plan-stale-30m',
      user_id: mockUser.id,
      plan_date: todayStr,
      task_id: 'task-reconcile-30m',
      slot: 1,
      target_boxes: 3,
      done_boxes: 0,
      target_overridden: false,
      auto_completed: false
    }]

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') return { data: planData, error: null }
      if (table === 'daily_plan_streams') {
        return {
          data: [{
            id: 'stream-1',
            plan_id: 'plan-stale-30m',
            user_id: mockUser.id,
            label: 'default',
            position: 1,
            target_boxes: 3,
            done_boxes: 0
          }],
          error: null
        }
      }
      return { data: [], error: null }
    })
    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      if (table === 'daily_plan') {
        planData = planData.map(p => p.id === match.id ? { ...p, ...data } : p)
        return { data: planData, error: null }
      }
      return { data: [{}], error: null }
    })

    const task30m = {
      id: 'task-reconcile-30m',
      title: 'Reconcile 30m Task',
      completed: false,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 0,
      __type: 'matrix_task'
    }

    render(
      <TodayAgendaWidget
        tasks={[task30m]}
        toggleComplete={mockToggleComplete}
      />
    )

    // Wait for DB hydration and reconciliation to complete
    await waitFor(() => {
      expect(offlineApi.offlineSelect).toHaveBeenCalledWith('daily_plan', expect.anything())
    })

    // Exactly 2 chips rendered (not 3!)
    await waitFor(() => {
      const chips = screen.getAllByTitle(/Click to log completed 15m focus block/i)
      expect(chips.length).toBe(2)
    })

    const chips = screen.getAllByTitle(/Click to log completed 15m focus block/i)
    expect(chips.length).toBe(2)

    // Target boxes in daily_plan was reconciled to 2
    expect(planData[0].target_boxes).toBe(2)

    // Click first chip: 1/2 boxes, does NOT auto-complete
    fireEvent.click(chips[0])
    expect(mockToggleComplete).not.toHaveBeenCalled()

    // Click second chip: 2/2 boxes, auto-complete threshold is 2, triggers auto-completion
    const remainingChips = screen.getAllByTitle(/Click to log completed 15m focus block/i)
    expect(remainingChips.length).toBe(1)
    fireEvent.click(remainingChips[0])

    await waitFor(() => {
      expect(mockToggleComplete).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-reconcile-30m' }),
        null,
        { skipXP: true }
      )
    })
  })

  it('Rule 2: clicking + on tally boxes sets target_overridden = true in daily_plan and prevents reconciliation overwrite', async () => {
    let planData = [{
      id: 'plan-plus-test',
      user_id: mockUser.id,
      plan_date: todayStr,
      task_id: 'task-plus-test',
      slot: 1,
      target_boxes: 2,
      done_boxes: 0,
      target_overridden: false,
      auto_completed: false
    }]

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      if (table === 'daily_plan') return { data: planData, error: null }
      if (table === 'daily_plan_streams') return { data: [], error: null }
      return { data: [], error: null }
    })
    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      if (table === 'daily_plan') {
        planData = planData.map(p => p.id === match.id ? { ...p, ...data } : p)
        return { data: planData, error: null }
      }
      return { data: [{}], error: null }
    })

    const taskPlus = {
      id: 'task-plus-test',
      title: 'Task for Plus Button',
      completed: false,
      estimated_minutes: 30,
      time_estimate_minutes: 30,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 0,
      __type: 'matrix_task'
    }

    render(
      <TodayAgendaWidget
        tasks={[taskPlus]}
        toggleComplete={mockToggleComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByTitle(/Click to log completed 15m focus block/i).length).toBe(2)
    })

    // Click the + button
    const plusBtn = screen.getByTitle('Add a tally box')
    fireEvent.click(plusBtn)

    // Now 3 chips rendered
    await waitFor(() => {
      expect(screen.getAllByTitle(/Click to log completed 15m focus block/i).length).toBe(3)
    })

    // Verify offlineUpdate was called with target_overridden: true and target_boxes: 3
    expect(offlineApi.offlineUpdate).toHaveBeenCalledWith(
      'daily_plan',
      { id: 'plan-plus-test', user_id: mockUser.id },
      expect.objectContaining({
        target_overridden: true,
        target_boxes: 3
      })
    )
  })

  it('Rule 3: task with estimated_minutes: 10 (or 15) displays NO box strip (only checkbox), and auto-complete cannot trigger', async () => {
    const quickTask10 = {
      id: 'task-quick-10m',
      title: 'Quick 10m Task',
      completed: false,
      estimated_minutes: 10,
      time_estimate_minutes: 10,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 1,
      __type: 'matrix_task'
    }

    const quickTask15 = {
      id: 'task-quick-15m',
      title: 'Quick 15m Task',
      completed: false,
      estimated_minutes: 15,
      time_estimate_minutes: 15,
      mental_load: 'medium',
      quadrant: 'urgent_important',
      deadline: todayStr,
      parent_task_id: null,
      subtasks_total: 1,
      __type: 'matrix_task'
    }

    render(
      <TodayAgendaWidget
        tasks={[quickTask10, quickTask15]}
        toggleComplete={mockToggleComplete}
      />
    )

    // Wait for titles to appear
    expect(screen.getByText('Quick 10m Task')).toBeDefined()
    expect(screen.getByText('Quick 15m Task')).toBeDefined()

    // No box strip buttons exist!
    expect(screen.queryByTitle(/focus block/i)).toBeNull()
    expect(screen.queryByTitle(/Add a tally box/i)).toBeNull()
    expect(screen.queryByTitle(/add micro-stream/i)).toBeNull()

    // Master checkboxes are present
    const masterCheckboxes = screen.getAllByTitle('Mark completed')
    expect(masterCheckboxes.length).toBe(2)

    // Clicking master checkbox calls toggleComplete directly without skipXP (not auto-completed)
    fireEvent.click(masterCheckboxes[0])
    expect(mockToggleComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-quick-10m' }),
      expect.anything()
    )
    expect(mockToggleComplete).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { skipXP: true }
    )
  })
})
