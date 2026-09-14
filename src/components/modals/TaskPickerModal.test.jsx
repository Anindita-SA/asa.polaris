// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import TaskPickerModal from './TaskPickerModal'

describe('TaskPickerModal', () => {
  afterEach(() => {
    cleanup()
  })

  const mockTasks = [
    { id: 't1', title: 'Deep Work Session', quadrant: 'urgent_important', estimated_minutes: 45, status: 'active', mental_load: 'high' },
    { id: 't2', title: 'Review Paper', quadrant: 'important_not_urgent', estimated_minutes: 30, status: 'active', mental_load: 'medium' },
    { id: 't3', title: 'Quick Email', quadrant: 'urgent_not_important', estimated_minutes: 10, status: 'active', mental_load: 'low' },
    { id: 't4', title: 'Clean Desktop', quadrant: 'neither', estimated_minutes: 15, status: 'active' },
    { id: 't5', title: 'Random Idea Dump', quadrant: null, status: 'inbox' },
    { id: 't6', title: 'Completed Old Task', quadrant: 'urgent_important', status: 'done' }
  ]

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <TaskPickerModal isOpen={false} onClose={vi.fn()} tasks={mockTasks} onSelectTask={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders active tasks and filters by quadrant chips', () => {
    render(
      <TaskPickerModal isOpen={true} onClose={vi.fn()} tasks={mockTasks} onSelectTask={vi.fn()} />
    )

    expect(screen.getByText('Choose Focus Task')).toBeDefined()
    expect(screen.getByText('Deep Work Session')).toBeDefined()
    expect(screen.getByText('Review Paper')).toBeDefined()
    expect(screen.getByText('Quick Email')).toBeDefined()
    expect(screen.getByText('Clean Desktop')).toBeDefined()
    expect(screen.getByText('Random Idea Dump')).toBeDefined()
    expect(screen.queryByText('Completed Old Task')).toBeNull() // Done tasks are excluded

    // Click Q1 filter chip
    const q1Chip = screen.getByRole('button', { name: 'Q1' })
    fireEvent.click(q1Chip)

    expect(screen.getByText('Deep Work Session')).toBeDefined()
    expect(screen.queryByText('Review Paper')).toBeNull()
    expect(screen.queryByText('Random Idea Dump')).toBeNull()

    // Click Backlog filter chip
    const backlogChip = screen.getByRole('button', { name: 'Backlog' })
    fireEvent.click(backlogChip)

    expect(screen.getByText('Random Idea Dump')).toBeDefined()
    expect(screen.queryByText('Deep Work Session')).toBeNull()
  })

  it('filters tasks by search input query', () => {
    render(
      <TaskPickerModal isOpen={true} onClose={vi.fn()} tasks={mockTasks} onSelectTask={vi.fn()} />
    )

    const searchInput = screen.getByPlaceholderText('Search active tasks...')
    fireEvent.change(searchInput, { target: { value: 'email' } })

    expect(screen.getByText('Quick Email')).toBeDefined()
    expect(screen.queryByText('Deep Work Session')).toBeNull()
    expect(screen.queryByText('Review Paper')).toBeNull()
  })

  it('calls onSelectTask and onClose when Start Focus button is clicked', () => {
    const mockSelect = vi.fn()
    const mockClose = vi.fn()

    render(
      <TaskPickerModal isOpen={true} onClose={mockClose} tasks={mockTasks} onSelectTask={mockSelect} />
    )

    const startBtns = screen.getAllByRole('button', { name: /Start Focus/i })
    fireEvent.click(startBtns[0])

    expect(mockSelect).toHaveBeenCalledWith(mockTasks[0])
    expect(mockClose).toHaveBeenCalled()
  })
})
