// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent, cleanup, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FocusBoard from './FocusBoard'
import * as offlineApi from '../../lib/offlineApi'
import { DEFAULT_FOCUS_ITEMS } from '../../data/defaults'

const mockUser = { id: 'test-user-123' }
const mockAddXP = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, addXP: mockAddXP })
}))

vi.mock('../../hooks/useTodaysTasks', () => ({
  useTodaysTasks: () => ({ tasks: [], toggleComplete: vi.fn() })
}))

vi.mock('../widgets/PomodoroTimer', () => ({
  default: () => <div data-testid="pomodoro-timer">PomodoroTimer</div>
}))

vi.mock('../modals/SurpriseTaskModal', () => ({
  default: () => null
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {}
}))

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn(),
  offlineDelete: vi.fn(),
  offlineUpsert: vi.fn()
}))

describe('FocusBoard', () => {
  let db = {
    focus_items: [],
    backburner: [],
    milestones: [],
    subtasks: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    db = {
      focus_items: [],
      backburner: [],
      milestones: [],
      subtasks: []
    }

    offlineApi.offlineSelect.mockImplementation(async (table) => {
      return { data: JSON.parse(JSON.stringify(db[table] || [])), error: null }
    })

    offlineApi.offlineInsert.mockImplementation(async (table, row) => {
      db[table] = db[table] || []
      const newRow = { ...row, id: row.id || `id-${Math.random()}` }
      db[table].push(newRow)
      return { data: [newRow], error: null }
    })

    offlineApi.offlineUpdate.mockImplementation(async (table, match, data) => {
      db[table] = (db[table] || []).map(item => {
        let matches = true
        for (const k in match) {
          if (item[k] !== match[k]) matches = false
        }
        return matches ? { ...item, ...data } : item
      })
      return { data: db[table], error: null }
    })

    offlineApi.offlineDelete.mockImplementation(async (table, match) => {
      db[table] = (db[table] || []).filter(item => {
        for (const k in match) {
          if (item[k] === match[k]) return false
        }
        return true
      })
      return { data: [], error: null }
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders active focus items with titles, categories, and why_now notes', async () => {
    db.focus_items = [
      {
        id: 'f1',
        user_id: mockUser.id,
        title: 'CHAARG-L Schematic',
        category: 'hardware',
        why_now: 'Finish before internship',
        status: 'active',
        position: 0,
        created_at: '2026-05-01T10:00:00Z'
      },
      {
        id: 'f2',
        user_id: mockUser.id,
        title: 'DAB Survey Paper',
        category: 'research',
        why_now: 'June 2026 deadline',
        status: 'active',
        position: 1,
        created_at: '2026-05-01T11:00:00Z'
      }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('CHAARG-L Schematic')).toBeDefined()
      expect(screen.getByText('DAB Survey Paper')).toBeDefined()
    })

    expect(screen.getByText('"Finish before internship"')).toBeDefined()
    expect(screen.getByText('"June 2026 deadline"')).toBeDefined()
    expect(screen.getByText('2/3')).toBeDefined()
    expect(screen.getByText('hardware')).toBeDefined()
    expect(screen.getByText('research')).toBeDefined()
  })

  it('seeds DEFAULT_FOCUS_ITEMS when the user has 0 focus items in the database', async () => {
    db.focus_items = []

    render(<FocusBoard />)

    await waitFor(() => {
      expect(offlineApi.offlineInsert).toHaveBeenCalledTimes(DEFAULT_FOCUS_ITEMS.length)
    })

    for (const def of DEFAULT_FOCUS_ITEMS) {
      expect(screen.getByText(def.title)).toBeDefined()
    }
    expect(screen.getByText('3/3')).toBeDefined()
  })

  it('cleans up empty and blank ghost focus items by deleting them from the database', async () => {
    db.focus_items = [
      { id: 'ghost-empty', user_id: mockUser.id, title: '', status: 'active', position: 0 },
      { id: 'ghost-spaces', user_id: mockUser.id, title: '   ', status: 'active', position: 1 },
      { id: 'valid-item', user_id: mockUser.id, title: 'Valid Focus Item', category: 'academic', status: 'active', position: 2 }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('focus_items', { id: 'ghost-empty' })
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('focus_items', { id: 'ghost-spaces' })
    })

    expect(screen.getByText('Valid Focus Item')).toBeDefined()
    expect(screen.getByText('1/3')).toBeDefined()
  })

  it('adds a new focus item and resets the form modal', async () => {
    db.focus_items = [
      { id: 'f1', user_id: mockUser.id, title: 'Existing Focus 1', category: 'academic', status: 'active', position: 0 },
      { id: 'f2', user_id: mockUser.id, title: 'Existing Focus 2', category: 'academic', status: 'active', position: 1 }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('Existing Focus 1')).toBeDefined()
    })

    // Click "Add focus item" button
    const addButton = screen.getByText('Add focus item')
    fireEvent.click(addButton)

    // Modal should be open
    expect(screen.getByText('New Focus Item')).toBeDefined()

    const titleInput = screen.getByPlaceholderText('Title')
    fireEvent.change(titleInput, { target: { value: 'Third Focus Project' } })

    const whyNowInput = screen.getByPlaceholderText('Why now? (optional)')
    fireEvent.change(whyNowInput, { target: { value: 'High impact project' } })

    const submitButton = screen.getByRole('button', { name: 'ADD TO FOCUS' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('focus_items', expect.objectContaining({
        title: 'Third Focus Project',
        why_now: 'High impact project',
        status: 'active',
        user_id: mockUser.id,
        position: 2
      }))
      expect(screen.getByText('Third Focus Project')).toBeDefined()
    })

    expect(screen.getByText('3/3')).toBeDefined()
  })

  it('defers an active focus item to backburner and promotes it back to focus', async () => {
    db.focus_items = [
      {
        id: 'f-defer',
        user_id: mockUser.id,
        title: 'Deferred Candidate',
        category: 'portfolio',
        why_now: 'Important but not urgent',
        status: 'active',
        position: 0
      },
      {
        id: 'f-keep',
        user_id: mockUser.id,
        title: 'Active Remaining',
        category: 'academic',
        why_now: 'Active focus',
        status: 'active',
        position: 1
      }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('Deferred Candidate')).toBeDefined()
    })

    // Click the Backburner button on the specific item
    const itemCard = screen.getByText('Deferred Candidate').closest('.glass')
    const backburnerButton = within(itemCard).getByTitle('Backburner')
    fireEvent.click(backburnerButton)

    await waitFor(() => {
      expect(offlineApi.offlineUpdate).toHaveBeenCalledWith('focus_items', { id: 'f-defer' }, { status: 'backburned' })
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('backburner', expect.objectContaining({
        title: 'Deferred Candidate',
        why_deferred: 'From active focus',
        context_snapshot: 'Important but not urgent',
        user_id: mockUser.id
      }))
    })

    // Now the item appears in the backburner list
    await waitFor(() => {
      expect(screen.getByText('Why deferred: From active focus')).toBeDefined()
    })

    // Promote it back to focus
    const promoteButton = screen.getByTitle('Promote to Focus')
    fireEvent.click(promoteButton)

    await waitFor(() => {
      expect(offlineApi.offlineInsert).toHaveBeenCalledWith('focus_items', expect.objectContaining({
        title: 'Deferred Candidate',
        status: 'active',
        why_now: 'Important but not urgent',
        user_id: mockUser.id
      }))
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('backburner', { id: expect.any(String) })
    })
  })

  it('renders backburner items correctly and deletes backburner items', async () => {
    db.focus_items = [
      { id: 'f1', user_id: mockUser.id, title: 'Item 1', status: 'active', position: 0 }
    ]
    db.backburner = [
      {
        id: 'b1',
        user_id: mockUser.id,
        title: 'Winter Internship Abroad',
        why_deferred: 'Applications open in August',
        context_snapshot: 'Target KAUST, NUS, TU Delft',
        revisit_after: '2026-08-01T00:00:00Z',
        created_at: '2026-05-01T10:00:00Z'
      }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('Winter Internship Abroad')).toBeDefined()
    })

    expect(screen.getByText('Why deferred: Applications open in August')).toBeDefined()
    expect(screen.getByText('"Target KAUST, NUS, TU Delft"')).toBeDefined()

    // Delete the backburner item
    const backburnerItemContainer = screen.getByText('Winter Internship Abroad').closest('.glass')
    const itemDeleteBtn = within(backburnerItemContainer).getAllByRole('button')[1] // 2nd button is delete X
    fireEvent.click(itemDeleteBtn)

    await waitFor(() => {
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('backburner', { id: 'b1' })
    })
  })

  it('deletes a focus item when the delete button with Trash2 is clicked', async () => {
    db.focus_items = [
      {
        id: 'f-delete-target',
        user_id: mockUser.id,
        title: 'Task to Delete',
        category: 'academic',
        why_now: 'No longer needed',
        status: 'active',
        position: 0
      },
      {
        id: 'f-saved-done',
        user_id: mockUser.id,
        title: 'Done Task',
        status: 'done',
        position: 1
      }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task to Delete')).toBeDefined()
    })

    const deleteButton = screen.getByTitle('Delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(offlineApi.offlineDelete).toHaveBeenCalledWith('focus_items', { id: 'f-delete-target' })
    })

    await waitFor(() => {
      expect(screen.queryByText('Task to Delete')).toBeNull()
    })
  })

  it('refetches focus, backburner, and milestones when polaris-tasks-changed event is fired', async () => {
    db.focus_items = [
      { id: 'f1', user_id: mockUser.id, title: 'Item 1', status: 'active', position: 0 }
    ]

    render(<FocusBoard />)

    await waitFor(() => {
      expect(screen.getByText('Item 1')).toBeDefined()
    })

    const callsBefore = offlineApi.offlineSelect.mock.calls.length

    // Dispatch polaris-tasks-changed event
    fireEvent(window, new CustomEvent('polaris-tasks-changed', {
      detail: { table: 'focus_items', operation: 'insert' }
    }))

    await waitFor(() => {
      expect(offlineApi.offlineSelect.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })
})
