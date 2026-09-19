// @vitest-environment jsdom
import React from 'react'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MediaLog from './MediaLog'
import { supabase } from '../../lib/supabase'
import * as linkFetcher from '../../lib/linkMetadataFetcher'

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
      title: 'Opportunities for decentralised solar power to improve reliability',
      author_or_creator: 'Philip Sandwell, Benedict Winchester, et al.',
      media_type: 'paper',
      status: 'want_to',
      recommended_by: 'Nature Communications (2025)',
      rating: null,
      one_line_takeaway: 'Decentralised solar PV mini-grids improve reliability and prevent stranded assets.',
      full_review: 'Abstract of the research paper.\n\nURL: https://doi.org/10.1038/s41467-025-62948-8',
      tags: ['solar-power', 'research-paper'],
      cover_url: null,
      created_at: '2026-09-14T07:00:00Z'
    },
    {
      id: 'media-2',
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
      created_at: '2026-09-13T07:00:00Z'
    },
    {
      id: 'media-3',
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
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
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

  it('renders all media items including research papers with citation details', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Opportunities for decentralised solar power to improve reliability')).toBeTruthy()
    })

    expect(screen.getByText('Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.')).toBeTruthy()
    expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    expect(screen.getByText('Philip Sandwell, Benedict Winchester, et al.')).toBeTruthy()
    expect(screen.getByText('Nature Communications (2025)')).toBeTruthy()
  })

  it('renders direct Read Paper and Read Article links', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText(/Read Paper/)).toBeTruthy()
      expect(screen.getByText(/Read Article/)).toBeTruthy()
    })

    const paperLink = screen.getByText(/Read Paper/).closest('a')
    expect(paperLink.getAttribute('href')).toBe('https://doi.org/10.1038/s41467-025-62948-8')
    expect(paperLink.getAttribute('target')).toBe('_blank')

    const articleLink = screen.getByText(/Read Article/).closest('a')
    expect(articleLink.getAttribute('href')).toBe('https://cleantechnica.com/2026/09/12/dense-fluid-pumped-hydro-duration-scaling/')
  })

  it('filters by sub-view categories when clicking sub-view tabs', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    })

    // Click Research Papers sub-view
    const papersTab = screen.getByRole('button', { name: /Research Papers/ })
    fireEvent.click(papersTab)

    expect(screen.getByText('Opportunities for decentralised solar power to improve reliability')).toBeTruthy()
    expect(screen.queryByText('Thinking in Systems')).toBeNull()
    expect(screen.queryByText('Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.')).toBeNull()

    // Click Books sub-view
    const booksTab = screen.getByRole('button', { name: /Books/ })
    fireEvent.click(booksTab)

    expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    expect(screen.queryByText('Opportunities for decentralised solar power to improve reliability')).toBeNull()
  })

  it('filters by tag when clicking tag badges', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    })

    const tagBtn = screen.getByTitle('Filter by #solar-power')
    fireEvent.click(tagBtn)

    expect(screen.getByText('Opportunities for decentralised solar power to improve reliability')).toBeTruthy()
    expect(screen.queryByText('Thinking in Systems')).toBeNull()
  })

  it('triggers quick drop auto-fetch and opens modal pre-filled', async () => {
    const spy = vi.spyOn(linkFetcher, 'autoFetchLinkMetadata').mockResolvedValue({
      metadata: {
        title: 'New Solar Research Paper',
        author_or_creator: 'A. Saha',
        media_type: 'paper',
        one_line_takeaway: 'Quick summary',
        full_review: 'URL: https://example.com/paper',
        tags: ['solar', 'paper'],
        status: 'want_to'
      },
      source: 'Crossref'
    })

    render(<MediaLog />)

    const input = screen.getByPlaceholderText(/Paste paper, article, or video URL/)
    fireEvent.change(input, { target: { value: 'https://doi.org/10.1234/test' } })

    const fetchBtn = screen.getByRole('button', { name: /Auto-Fetch & Add/ })
    fireEvent.click(fetchBtn)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('https://doi.org/10.1234/test')
      expect(screen.getByText('Log Literature or Media')).toBeTruthy()
      expect(screen.getByDisplayValue('New Solar Research Paper')).toBeTruthy()
      expect(screen.getByDisplayValue('A. Saha')).toBeTruthy()
    })
  })

  it('opens edit modal when clicking edit button and populates existing data', async () => {
    render(<MediaLog />)

    await waitFor(() => {
      expect(screen.getByText('Thinking in Systems')).toBeTruthy()
    })

    const editBtns = screen.getAllByTitle('Edit entry')
    fireEvent.click(editBtns[0])

    await waitFor(() => {
      expect(screen.getByText('Edit Literature / Media Entry')).toBeTruthy()
      expect(screen.getByDisplayValue('Opportunities for decentralised solar power to improve reliability')).toBeTruthy()
    })
  })
})
