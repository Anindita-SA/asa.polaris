// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMorningBrief } from './useMorningBrief'
import { offlineSelect, offlineUpsert } from '../lib/offlineApi'
import { supabase } from '../lib/supabase'
import db from '../lib/offlineStore'

const mockUser = { id: 'user-brief-test' }

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}))

vi.mock('../lib/offlineApi', () => ({
  offlineSelect: vi.fn(),
  offlineUpsert: vi.fn(),
  generateUUID: vi.fn(() => 'mock-uuid-1234')
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}))

vi.mock('../lib/offlineStore', () => ({
  default: {
    morning_briefs: {
      put: vi.fn()
    }
  }
}))

describe('useMorningBrief hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    offlineUpsert.mockResolvedValue({ data: [{}], error: null })
  })

  it('skips generation if brief already exists with items in Dexie', async () => {
    const existingBrief = {
      id: 'brief-existing',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Existing news' }]
    }

    offlineSelect.mockResolvedValue({ data: [existingBrief], error: null })

    const { result } = renderHook(() => useMorningBrief({ autoRun: true }))

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false)
    })

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('caches remote brief from Supabase and skips Edge Function if already present remotely', async () => {
    offlineSelect.mockResolvedValue({ data: [], error: null })

    const remoteBrief = {
      id: 'brief-remote',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Remote news article' }]
    }

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: remoteBrief, error: null })
    })

    const eventSpy = vi.fn()
    window.addEventListener('polaris-morning-brief-updated', eventSpy)

    renderHook(() => useMorningBrief({ autoRun: true }))

    await waitFor(() => {
      expect(db.morning_briefs.put).toHaveBeenCalledWith(remoteBrief)
      expect(offlineUpsert).toHaveBeenCalledWith('morning_briefs', remoteBrief)
      expect(eventSpy).toHaveBeenCalled()
    })

    expect(supabase.functions.invoke).not.toHaveBeenCalled()
    window.removeEventListener('polaris-morning-brief-updated', eventSpy)
  })

  it('invokes edge function, persists resulting brief into Dexie, and dispatches event', async () => {
    offlineSelect.mockResolvedValue({ data: [], error: null })

    // Supabase initial check: no remote brief
    const selectMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const maybeSingleMock = vi.fn()
      // First check: no brief exists
      .mockResolvedValueOnce({ data: null, error: null })
      // Second check after Edge Function: remote brief now exists
      .mockResolvedValueOnce({
        data: {
          id: 'brief-created-by-edge',
          user_id: 'user-brief-test',
          date: new Date().toLocaleDateString('en-CA'),
          items: [{ type: 'news', title: 'Fresh News from RSS' }],
          seen: false
        },
        error: null
      })

    supabase.from.mockReturnValue({
      select: selectMock,
      eq: eqMock,
      maybeSingle: maybeSingleMock
    })

    supabase.functions.invoke.mockResolvedValue({
      data: { success: true, items: [{ type: 'news', title: 'Fresh News from RSS' }] },
      error: null
    })

    const eventSpy = vi.fn()
    window.addEventListener('polaris-morning-brief-updated', eventSpy)

    const { result } = renderHook(() => useMorningBrief({ autoRun: true }))

    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-morning-brief', {
        body: { force: false }
      })
      expect(db.morning_briefs.put).toHaveBeenCalledWith(expect.objectContaining({
        id: 'brief-created-by-edge',
        items: [{ type: 'news', title: 'Fresh News from RSS' }]
      }))
      expect(offlineUpsert).toHaveBeenCalledWith('morning_briefs', expect.objectContaining({
        id: 'brief-created-by-edge'
      }))
      expect(eventSpy).toHaveBeenCalled()
    })

    window.removeEventListener('polaris-morning-brief-updated', eventSpy)
  })

  it('bypasses Dexie check and invokes edge function when force is true', async () => {
    const existingBrief = {
      id: 'brief-existing',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [{ type: 'news', title: 'Existing news' }]
    }
    offlineSelect.mockResolvedValue({ data: [existingBrief], error: null })

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'brief-regenerated',
          user_id: 'user-brief-test',
          date: new Date().toLocaleDateString('en-CA'),
          items: [{ type: 'news', title: 'Regenerated article' }],
          seen: false
        },
        error: null
      })
    })

    supabase.functions.invoke.mockResolvedValue({
      data: { success: true, items: [{ type: 'news', title: 'Regenerated article' }] },
      error: null
    })

    const { result } = renderHook(() => useMorningBrief({ autoRun: false }))

    await act(async () => {
      await result.current.generateBrief(true)
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-morning-brief', {
      body: { force: true }
    })
    expect(db.morning_briefs.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'brief-regenerated'
    }))
  })

  it('gracefully handles edge function error without throwing and resets isGenerating', async () => {
    offlineSelect.mockResolvedValue({ data: [], error: null })
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })

    supabase.functions.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge function timeout' }
    })

    const { result } = renderHook(() => useMorningBrief({ autoRun: false }))

    await act(async () => {
      await result.current.generateBrief(false)
    })

    expect(result.current.isGenerating).toBe(false)
    expect(db.morning_briefs.put).not.toHaveBeenCalled()
  })

  it('does NOT skip generation if existing brief in Dexie only has opportunities and no news', async () => {
    const oppOnlyBrief = {
      id: 'brief-with-only-opps',
      user_id: 'user-brief-test',
      date: new Date().toLocaleDateString('en-CA'),
      items: [
        { type: 'opportunity', title: 'Clean Energy Grant', hardware_opportunity_id: 'hw-1' }
      ]
    }
    offlineSelect.mockResolvedValue({ data: [oppOnlyBrief], error: null })

    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
    })

    supabase.functions.invoke.mockResolvedValue({
      data: { success: true, items: [{ type: 'news', title: 'Solid-State Battery Milestone' }] },
      error: null
    })

    const { result } = renderHook(() => useMorningBrief({ autoRun: false }))

    await act(async () => {
      await result.current.generateBrief(false)
    })

    expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-morning-brief', {
      body: { force: false }
    })
    expect(db.morning_briefs.put).toHaveBeenCalledWith(expect.objectContaining({
      id: 'brief-with-only-opps',
      items: expect.arrayContaining([
        expect.objectContaining({ title: 'Clean Energy Grant' }),
        expect.objectContaining({ title: 'Solid-State Battery Milestone' })
      ])
    }))
  })
})
