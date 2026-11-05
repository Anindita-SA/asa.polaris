// @vitest-environment jsdom
import React from 'react'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CurriculumView from './CurriculumView'

const mockUser = { id: 'user-ielts-456' }

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: vi.fn(),
  })
}))

const mockTopics = [
  {
    id: 'top-1',
    curriculum_id: 'foundational-curr-123',
    title: "Track 1: Reading: Read Bertrand Russell's The Problems of Philosophy",
    estimated_hours: 3.0,
    status: 'not_started',
    position: 0,
  },
  {
    id: 'top-2',
    curriculum_id: 'foundational-curr-123',
    title: 'Track 2: Reading: Read The Undercover Economist',
    estimated_hours: 3.0,
    status: 'not_started',
    position: 1,
  },
  {
    id: 'top-app-1',
    curriculum_id: 'applied-curr-456',
    title: 'Track A: Digital Logic: Build a 555-timer astable multivibrator clock module',
    estimated_hours: 3.0,
    status: 'not_started',
    position: 0,
    module: 1,
  },
  {
    id: 'top-app-2',
    curriculum_id: 'applied-curr-456',
    title: 'Track B: Kali Linux Environment: Set up Kali Linux VM',
    estimated_hours: 2.5,
    status: 'not_started',
    position: 1,
    module: 2,
  },
]

vi.mock('../../lib/offlineApi', () => ({
  offlineSelect: vi.fn(async (table, query) => {
    if (table === 'curriculum_topics') {
      if (query?.curriculum_id) {
        return { data: mockTopics.filter(t => t.curriculum_id === query.curriculum_id), error: null }
      }
      return { data: mockTopics, error: null }
    }
    if (table === 'curriculum_resources') {
      return { data: [], error: null }
    }
    if (table === 'pomodoro_logs') {
      return { data: [], error: null }
    }
    return { data: [], error: null }
  }),
  offlineInsert: vi.fn(),
  offlineUpdate: vi.fn(),
  offlineDelete: vi.fn(),
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

  it('renders Foundational Disciplines dashboard with 8 tracks and filter bar', async () => {
    const curriculum = {
      id: 'foundational-curr-123',
      title: 'Foundational Disciplines: Intellectual Frameworks',
      description: 'Synthesizing 8 core foundational disciplines into a trackable intellectual framework.',
      estimated_hours: 200,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#8B5CF6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getAllByText('Foundational Disciplines: Intellectual Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('8 Foundational Tracks')).toBeTruthy()
    expect(screen.getByText('Track Filter')).toBeTruthy()
    expect(screen.getByText('Philosophy')).toBeTruthy()
    expect(screen.getByText('Economics')).toBeTruthy()
    expect(screen.getByText('Art History')).toBeTruthy()
    expect(screen.getByText('Physics')).toBeTruthy()
    expect(screen.getByText('History')).toBeTruthy()
    expect(screen.getByText('Mathematics')).toBeTruthy()
    expect(screen.getByText('Politics')).toBeTruthy()
    expect(screen.getByText('Linguistics')).toBeTruthy()

    // Verify filter buttons with exact labels
    expect(screen.getByRole('button', { name: /T1 Philosophy \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T2 Economics \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T3 Art History \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T4 Physics \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T5 History \(9\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T6 Mathematics \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T7 Politics \(7\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /T8 Linguistics \(7\)/i })).toBeTruthy()
  })

  it('filters foundational topics when clicking track filter buttons and resets filter', async () => {
    const curriculum = {
      id: 'foundational-curr-123',
      title: 'Foundational Disciplines: Intellectual Frameworks',
      description: 'Synthesizing 8 core foundational disciplines into a trackable intellectual framework.',
      estimated_hours: 200,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#8B5CF6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Bertrand Russell's The Problems of Philosophy/)).toBeTruthy()
      expect(screen.getByText(/The Undercover Economist/)).toBeTruthy()
    })

    // Click T1 Philosophy
    const t1Button = screen.getByRole('button', { name: /T1 Philosophy \(8\)/i })
    fireEvent.click(t1Button)

    expect(screen.getByText(/Bertrand Russell's The Problems of Philosophy/)).toBeTruthy()
    expect(screen.queryByText(/The Undercover Economist/)).toBeNull()
    expect(screen.getByText('1 of 2 shown')).toBeTruthy()

    // Click T2 Economics
    const t2Button = screen.getByRole('button', { name: /T2 Economics \(8\)/i })
    fireEvent.click(t2Button)

    expect(screen.queryByText(/Bertrand Russell's The Problems of Philosophy/)).toBeNull()
    expect(screen.getByText(/The Undercover Economist/)).toBeTruthy()
    expect(screen.getByText('1 of 2 shown')).toBeTruthy()

    // Click T6 Mathematics (empty in mockTopics)
    const t6Button = screen.getByRole('button', { name: /T6 Mathematics \(8\)/i })
    fireEvent.click(t6Button)

    expect(screen.queryByText(/Bertrand Russell's The Problems of Philosophy/)).toBeNull()
    expect(screen.queryByText(/The Undercover Economist/)).toBeNull()
    expect(screen.getByText('No topics match the selected track filter.')).toBeTruthy()

    // Click Reset Filter
    const resetButton = screen.getByRole('button', { name: /Reset Filter/i })
    fireEvent.click(resetButton)

    expect(screen.getByText(/Bertrand Russell's The Problems of Philosophy/)).toBeTruthy()
    expect(screen.getByText(/The Undercover Economist/)).toBeTruthy()
  })

  it('renders Applied Skills dashboard with 4 tracks and filter bar', async () => {
    const curriculum = {
      id: 'applied-curr-456',
      title: 'Applied Skills: Engineering, Security, Design & Rhetoric',
      description: 'Practical engineering, cybersecurity, rhetorical writing, and industrial design sketching.',
      estimated_hours: 68,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#3B82F6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getAllByText('Applied Skills: Engineering, Security, Design & Rhetoric').length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getByText('4 Applied Tracks')).toBeTruthy()
    expect(screen.getByText('Track Filter')).toBeTruthy()
    expect(screen.getByText('EE & Digital Logic')).toBeTruthy()
    expect(screen.getByText('Cybersecurity & Defense')).toBeTruthy()
    expect(screen.getByText('Rhetoric & Narrative Craft')).toBeTruthy()
    expect(screen.getByText('Industrial Design Sketching')).toBeTruthy()

    // Verify exact filter buttons
    expect(screen.getByRole('button', { name: /Track A: EE & Digital Logic \(8\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Track B: Cybersecurity \(7\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Track C: Rhetoric & Writing \(6\)/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Track D: Design Sketching \(7\)/i })).toBeTruthy()
  })

  it('filters applied topics when clicking track filter buttons and resets filter', async () => {
    const curriculum = {
      id: 'applied-curr-456',
      title: 'Applied Skills: Engineering, Security, Design & Rhetoric',
      description: 'Practical engineering, cybersecurity, rhetorical writing, and industrial design sketching.',
      estimated_hours: 68,
    }

    render(<CurriculumView curriculum={curriculum} accentColor="#3B82F6" onBack={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText(/Digital Logic: Build a 555-timer astable multivibrator/)).toBeTruthy()
      expect(screen.getByText(/Kali Linux Environment: Set up Kali Linux VM/)).toBeTruthy()
    })

    // Click Track A
    const trackAButton = screen.getByRole('button', { name: /Track A: EE & Digital Logic \(8\)/i })
    fireEvent.click(trackAButton)

    expect(screen.getByText(/Digital Logic: Build a 555-timer astable multivibrator/)).toBeTruthy()
    expect(screen.queryByText(/Kali Linux Environment: Set up Kali Linux VM/)).toBeNull()
    expect(screen.getByText('1 of 2 shown')).toBeTruthy()

    // Click Track B
    const trackBButton = screen.getByRole('button', { name: /Track B: Cybersecurity \(7\)/i })
    fireEvent.click(trackBButton)

    expect(screen.queryByText(/Digital Logic: Build a 555-timer astable multivibrator/)).toBeNull()
    expect(screen.getByText(/Kali Linux Environment: Set up Kali Linux VM/)).toBeTruthy()
    expect(screen.getByText('1 of 2 shown')).toBeTruthy()

    // Click Track D (empty in mockTopics)
    const trackDButton = screen.getByRole('button', { name: /Track D: Design Sketching \(7\)/i })
    fireEvent.click(trackDButton)

    expect(screen.queryByText(/Digital Logic: Build a 555-timer astable multivibrator/)).toBeNull()
    expect(screen.queryByText(/Kali Linux Environment: Set up Kali Linux VM/)).toBeNull()
    expect(screen.getByText('No topics match the selected track filter.')).toBeTruthy()

    // Click Reset Filter
    const resetButton = screen.getByRole('button', { name: /Reset Filter/i })
    fireEvent.click(resetButton)

    expect(screen.getByText(/Digital Logic: Build a 555-timer astable multivibrator/)).toBeTruthy()
    expect(screen.getByText(/Kali Linux Environment: Set up Kali Linux VM/)).toBeTruthy()
  })
})
