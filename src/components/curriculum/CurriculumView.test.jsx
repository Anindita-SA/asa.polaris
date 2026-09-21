// @vitest-environment jsdom
import React from 'react'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CurriculumView from './CurriculumView'

const mockUser = { id: 'user-ielts-456' }

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: vi.fn(),
  })
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }))
  }
}))

describe('CurriculumView - IELTS 2026 Preparation Sprint View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Recovered IELTS Mock Practice Tests & Score Reports section with 6 recovered tests', async () => {
    const curriculum = {
      id: 'ielts-2026-sprint',
      title: 'IELTS 2026 Preparation Sprint',
      description: '4-Week front-loaded weekday-only IELTS preparation plan.',
      estimated_hours: 22,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#3B82F6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Recovered IELTS Mock Practice Tests & Score Reports')).toBeTruthy()
    })

    expect(screen.getByText('6 Tests Recovered')).toBeTruthy()
    expect(screen.getAllByText('IELTS Online Tests: Mock Test 2026 January Listening Test 1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IELTS Listening Practice Test 201').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IELTS Reading Practice Test 313').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IELTS Reading Practice Test 312').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IELTS Reading Practice Test 311').length).toBeGreaterThan(0)
    expect(screen.getAllByText('IELTS Reading Practice Test 310').length).toBeGreaterThan(0)

    // Check external links
    const reportLink = screen.getByRole('link', { name: /Score Report ->/i })
    expect(reportLink).toBeTruthy()
    expect(reportLink.getAttribute('href')).toBe('https://ieltsonlinetests.com/score/60136001')
    expect(reportLink.getAttribute('target')).toBe('_blank')
    expect(reportLink.getAttribute('rel')).toBe('noopener noreferrer')

    const qbLinks = screen.getAllByRole('link', { name: /Question Bank ->/i })
    expect(qbLinks.length).toBe(4)
    expect(qbLinks[0].getAttribute('href')).toBe('https://practicepteonline.com/official-ielts-tests-book-20/')
    expect(qbLinks[0].getAttribute('target')).toBe('_blank')
    expect(qbLinks[0].getAttribute('rel')).toBe('noopener noreferrer')
  })
})
