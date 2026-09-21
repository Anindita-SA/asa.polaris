// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import TopicCard from './TopicCard'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    trackXP: vi.fn(),
  })
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }))
  }
}))

describe('TopicCard component', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders standard topic title without score badges when no score info is present', () => {
    const topic = {
      id: 'top-1',
      title: 'KiCad project setup and library management',
      status: 'not_started',
      estimated_hours: 2,
    }

    render(<TopicCard topic={topic} accentColor="#3B82F6" onUpdate={() => {}} />)

    expect(screen.getByText('KiCad project setup and library management')).toBeTruthy()
    expect(screen.queryByText(/Band/i)).toBeNull()
    expect(screen.queryByText(/Score:/i)).toBeNull()
  })

  it('renders gold/emerald score badge and score report link from topic notes', () => {
    const topic = {
      id: 'top-2',
      title: 'IELTS Online Tests: Mock Test 2026 January Listening Test 1',
      notes: 'Score: 38/40, Band 8.5. Report: https://ieltsonlinetests.com/score/60136001',
      status: 'done',
    }

    render(<TopicCard topic={topic} accentColor="#3B82F6" onUpdate={() => {}} />)

    expect(screen.getByText('Band 8.5')).toBeTruthy()
    expect(screen.getByText('Score: 38/40')).toBeTruthy()

    const link = screen.getByRole('link', { name: /Score Report ->/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('https://ieltsonlinetests.com/score/60136001')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders practice link when notes contain a non-score question bank URL', () => {
    const topic = {
      id: 'top-3',
      title: 'IELTS Reading Practice Test 313',
      notes: 'Score: 36/40, Band 8.0. Question Bank: https://practicepteonline.com/official-ielts-tests-book-20/',
      status: 'done',
    }

    render(<TopicCard topic={topic} accentColor="#3B82F6" onUpdate={() => {}} />)

    expect(screen.getByText('Band 8.0')).toBeTruthy()
    expect(screen.getByText('Score: 36/40')).toBeTruthy()

    const link = screen.getByRole('link', { name: /Practice Link ->/i })
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('https://practicepteonline.com/official-ielts-tests-book-20/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })
})
