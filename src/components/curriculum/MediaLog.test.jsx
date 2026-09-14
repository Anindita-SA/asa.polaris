// @vitest-environment jsdom
import React from 'react'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MediaLog from './MediaLog'
import { supabase } from '../../lib/supabase'

const mockUser = { id: 'user-abc-123' }
const mockAddXP = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, addXP: mockAddXP })
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('MediaLog', () => {
  const sampleData = [
    {
      id: 'media-1',
      user_id: 'user-abc-123',
      title: 'Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.',
      author_or_creator: 'CleanTechnica',
      media_type: 'article',
      status: 'want_to',
      recommended_by: 'Morning Brief',
      rating: null,
      one_line_takeaway: 'RheEnergise constructed a dense-fluid pumped hydro storage system in Devon.',
      full_review: 'URL: https://cleantechnica.com/2026/09/12/dense-fluid-pumped-hydro-duration-scaling/',
      tags: ['morning-brief', 'article'],
      cover_url: null,
      created_at: '2026-09-14T07:00:00Z'
    },
    {
      id: 'media-2',
      user_id: 'user-abc-123',
      title: 'Thinking in Systems',
      author_or_creator: 'Donella Meadows',
      media_type: 'book',
      status: 'in_progress',
      recommended_by: null,
      rating: 5,
      one_line_takeaway: 'Mental model for complex systems and feedback loops.',
      full_review: 'Foundational reading for system architects.',
      tags: ['systems-thinking', 'academic'],
      cover_url: null,
      created_at: '2026-09-10T07:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: sampleData, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }))
  })

  afterEach(() => {
    cleanup()
  })

  it('renders all media items with their metadata correctly', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.')).toBeTruthy()
    })

    expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    expect(screen.getByText('CleanTechnica')).toBeTruthy()
    expect(screen.getByText('Donella Meadows')).toBeTruthy()
  })

  it('extracts URL and renders a direct Read Article link', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText(/Read Article/)).toBeTruthy()
    })

    const link = screen.getByText(/Read Article/).closest('a')
    expect(link.getAttribute('href')).toBe('https://cleantechnica.com/2026/09/12/dense-fluid-pumped-hydro-duration-scaling/')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('filters by media type when clicking type filters', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    })

    const articleFilterBtn = screen.getByRole('button', { name: 'Article' })
    fireEvent.click(articleFilterBtn)

    expect(screen.getByText('Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.')).toBeTruthy()
    expect(screen.queryByText('Thinking in Systems')).toBeNull()
  })

  it('filters by tag when clicking tag badges', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    })

    const tagBtn = screen.getByTitle('Filter by #morning-brief')
    fireEvent.click(tagBtn)

    expect(screen.getByText('Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.')).toBeTruthy()
    expect(screen.queryByText('Thinking in Systems')).toBeNull()
  })
})
