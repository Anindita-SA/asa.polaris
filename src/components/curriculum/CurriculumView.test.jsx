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

  it('renders IELTS preparation dashboard with PracticeScoreTracker and verified resources', async () => {
    const curriculum = {
      id: 'ielts-2026-sprint',
      title: 'IELTS 2026 Preparation Sprint',
      description: '4-Week front-loaded weekday-only IELTS preparation plan.',
      estimated_hours: 22,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#3B82F6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('IELTS Module Average Bands & Score Predictor')).toBeTruthy()
    })

    expect(screen.getByText('IELTS 2026 Preparation Sprint - Sub-Calendar & GCal Links')).toBeTruthy()
    expect(screen.getByText(/Current Verified 2026 Resources/)).toBeTruthy()
    expect(screen.getByText(/Graded Mock Test Collections/)).toBeTruthy()
    expect(screen.getByText(/28-Day De-Rusting/)).toBeTruthy()
  })
})
