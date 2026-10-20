// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useMorningSequence } from './useMorningSequence'
import { offlineSelect, offlineUpdate } from '../lib/offlineApi'
import { supabase } from '../lib/supabase'
import db from '../lib/offlineStore'

const mockUser = { id: 'user-brief-test' }

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}))

vi.mock('../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineUpdate: vi.fn()
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

vi.mock('../lib/offlineStore', () => ({
  default: {
    morning_briefs: {
      put: vi.fn()
    }
  }
}))

describe('useMorningSequence hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    offlineUpdate.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('sets stage to spark when brief exists and has not been seen', async () => {
    const mockBrief = {
      id: 'brief-1',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Solar breakthrough' }],
      seen: false
    }

    offlineSelect.mockResolvedValue({ data: [mockBrief], error: null })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(mockBrief.items)
    })
  })

  it('sets stage to brief when brief exists and has already been seen', async () => {
    const mockBrief = {
      id: 'brief-1',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Solar breakthrough' }],
      seen: true
    }

    offlineSelect.mockResolvedValue({ data: [mockBrief], error: null })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('brief')
    })
  })

  it('sets stage to done if ignite was fired today', async () => {
    const today = new Date().toLocaleDateString('en-CA')
    localStorage.setItem('polaris_ignite_date', today)

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('done')
    })
  })

  it('updates stage and briefItems when polaris-morning-brief-updated window event fires', async () => {
    // Initially empty
    offlineSelect.mockResolvedValueOnce({ data: [], error: null })

    // When Supabase fallback is queried, it returns null
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('loading')
      expect(result.current.briefItems).toEqual([])
    })

    // Brief is generated and Dexie now has it
    const updatedBrief = {
      id: 'brief-new',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Solid State Battery Announcement' }],
      seen: false
    }
    offlineSelect.mockResolvedValue({ data: [updatedBrief], error: null })

    // Fire the window event
    act(() => {
      window.dispatchEvent(new CustomEvent('polaris-morning-brief-updated', { detail: updatedBrief }))
    })

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(updatedBrief.items)
    })
  })

  it('falls back to Supabase if not in Dexie and caches to Dexie', async () => {
    offlineSelect.mockResolvedValue({ data: [], error: null })

    const remoteBrief = {
      id: 'brief-remote',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Remote Brief Found' }],
      seen: false
    }

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: remoteBrief, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(remoteBrief.items)
      expect(db.morning_briefs.put).toHaveBeenCalledWith(remoteBrief)
    })
  })

  it('transitions to brief when markSparkSeen is invoked', async () => {
    const mockBrief = {
      id: 'brief-1',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Solar breakthrough' }],
      seen: false
    }

    offlineSelect.mockResolvedValue({ data: [mockBrief], error: null })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
    })

    await act(async () => {
      await result.current.markSparkSeen()
    })

    expect(offlineUpdate).toHaveBeenCalledWith(
      'morning_briefs',
      { id: 'brief-1', user_id: 'user-brief-test' },
      { seen: true }
    )
    expect(result.current.stage).toBe('brief')
  })

  it('ignores polaris-tasks-changed events for other tables but updates for morning_briefs table', async () => {
    offlineSelect.mockResolvedValueOnce({ data: [], error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('loading')
    })

    // Fire event for 'tasks' table -> should NOT re-query morning_briefs
    act(() => {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table: 'tasks', operation: 'insert' }
      }))
    })

    expect(result.current.stage).toBe('loading')

    // Now mock Dexie returning a brief
    const mockBrief = {
      id: 'brief-from-event',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Battery storage breakthrough' }],
      seen: false
    }
    offlineSelect.mockResolvedValue({ data: [mockBrief], error: null })

    // Fire event for 'morning_briefs' table -> SHOULD re-query
    act(() => {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', {
        detail: { table: 'morning_briefs', operation: 'upsert', data: mockBrief }
      }))
    })

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(mockBrief.items)
    })
  })

  it('stays in loading when brief only has opportunities, and transitions to spark when news is added', async () => {
    const oppBrief = {
      id: 'brief-opp-only',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'opportunity', title: 'Hardware Fellowship', hardware_opportunity_id: 'opp-1' }],
      seen: false
    }
    offlineSelect.mockResolvedValueOnce({ data: [oppBrief], error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: oppBrief, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('loading')
    })

    const updatedBrief = {
      ...oppBrief,
      items: [
        ...oppBrief.items,
        { type: 'news', title: 'New Grid Battery Record' }
      ]
    }
    offlineSelect.mockResolvedValue({ data: [updatedBrief], error: null })

    act(() => {
      window.dispatchEvent(new CustomEvent('polaris-morning-brief-updated', { detail: updatedBrief }))
    })

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(updatedBrief.items)
    })
  })

  it('falls back to Supabase if local Dexie brief has only opportunities but Supabase has news', async () => {
    const localOppBrief = {
      id: 'brief-local',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'opportunity', title: 'Hardware Fellowship', hardware_opportunity_id: 'opp-1' }],
      seen: false
    }
    offlineSelect.mockResolvedValue({ data: [localOppBrief], error: null })

    const remoteBriefWithNews = {
      id: 'brief-remote',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [
        { type: 'opportunity', title: 'Hardware Fellowship', hardware_opportunity_id: 'opp-1' },
        { type: 'news', title: 'Next-Gen Solar Cell Announced' }
      ],
      seen: false
    }

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: remoteBriefWithNews, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('spark')
      expect(result.current.briefItems).toEqual(remoteBriefWithNews.items)
      expect(db.morning_briefs.put).toHaveBeenCalledWith(remoteBriefWithNews)
    })
  })

  it('transitions from loading to brief if polaris-morning-brief-failed event fires', async () => {
    offlineSelect.mockResolvedValueOnce({ data: [], error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })

    const { result } = renderHook(() => useMorningSequence())

    await waitFor(() => {
      expect(result.current.stage).toBe('loading')
    })

    act(() => {
      window.dispatchEvent(new CustomEvent('polaris-morning-brief-failed'))
    })

    await waitFor(() => {
      expect(result.current.stage).toBe('brief')
    })
  })
})
