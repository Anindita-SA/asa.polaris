// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SurpriseTaskModal from './SurpriseTaskModal'

vi.mock('../../lib/sound', () => ({
  playChime: vi.fn()
}))

describe('SurpriseTaskModal', () => {
  afterEach(() => {
    cleanup()
  })

  const mockTasks = [
    { id: 't1', title: 'Write Core Algorithm', estimated_minutes: 40, status: 'active' }
  ]

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SurpriseTaskModal isOpen={false} onClose={vi.fn()} tasks={mockTasks} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders selected task and Start Focus button', async () => {
    const mockStartFocus = vi.fn()
    const mockClose = vi.fn()

    render(
      <SurpriseTaskModal
        isOpen={true}
        onClose={mockClose}
        tasks={mockTasks}
        onStartFocus={mockStartFocus}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('AI & WSJF Picked Task')).toBeDefined()
      expect(screen.getByText('Write Core Algorithm')).toBeDefined()
      expect(screen.getByText('Estimated Time: 40m')).toBeDefined()
    }, { timeout: 3000 })

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Start Focus/i })
      expect(btn.hasAttribute('disabled')).toBe(false)
    }, { timeout: 3000 })

    const startFocusBtn = screen.getByRole('button', { name: /Start Focus/i })
    fireEvent.click(startFocusBtn)

    expect(mockStartFocus).toHaveBeenCalledWith(mockTasks[0])
    expect(mockClose).toHaveBeenCalled()
  })

  it('calls toggleComplete and onClose when Let\'s Go button is clicked', async () => {
    const mockToggleComplete = vi.fn()
    const mockClose = vi.fn()

    render(
      <SurpriseTaskModal
        isOpen={true}
        onClose={mockClose}
        tasks={mockTasks}
        toggleComplete={mockToggleComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Let's Go \(Mark Done\)/i })).toBeDefined()
    }, { timeout: 3000 })

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Let's Go \(Mark Done\)/i })
      expect(btn.hasAttribute('disabled')).toBe(false)
    }, { timeout: 3000 })

    const markDoneBtn = screen.getByRole('button', { name: /Let's Go \(Mark Done\)/i })
    fireEvent.click(markDoneBtn)

    expect(mockToggleComplete).toHaveBeenCalledWith('t1')
    expect(mockClose).toHaveBeenCalled()
  })
})
