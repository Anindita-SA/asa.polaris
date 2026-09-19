// @vitest-environment jsdom
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SettingsPanel from './SettingsPanel'
import { supabase } from '../../lib/supabase'

const mockUser = { id: 'test-user-123', email: 'pilot@polaris.app' }
const mockProfile = { current_chapter: 'Deep Work Exploration', clarity_anchor: 'Stay true to North Star' }
const mockSignOut = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    signOut: mockSignOut
  })
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('SettingsPanel', () => {
  let mockTemplates = []

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()

    mockTemplates = [
      {
        id: 'tpl-1',
        user_id: mockUser.id,
        title: 'Daily Research Reading',
        frequency: 'daily',
        estimated_minutes: 30,
        quadrant: 'important_not_urgent',
        is_active: true
      }
    ]

    supabase.from.mockImplementation((table) => {
      const createChain = () => {
        const chain = {
          select: vi.fn().mockImplementation(() => chain),
          eq: vi.fn().mockImplementation(() => chain),
          order: vi.fn().mockImplementation(() => Promise.resolve({
            data: table === 'recurring_task_templates' ? mockTemplates : [],
            error: null
          })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockImplementation((payload) => {
            if (table === 'recurring_task_templates') {
              mockTemplates = mockTemplates.map(t => ({ ...t, ...payload }))
            }
            return chain
          }),
          delete: vi.fn().mockImplementation(() => {
            return chain
          }),
          then: (resolve) => resolve({
            data: table === 'recurring_task_templates' ? mockTemplates : [],
            error: null
          })
        }
        return chain
      }

      return createChain()
    })
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('renders nothing when open is false', () => {
    const { container } = render(<SettingsPanel open={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders unified settings surface with section navigation tabs', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />)

    expect(screen.getByText('Settings & Preferences')).toBeDefined()
    expect(screen.getByRole('button', { name: 'All Settings' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Triage & Matrix' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Reminders & Nudges' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Focus & Audio' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Data & Account' })).toBeDefined()
  })

  it('toggles Auto Quadrant Suggestions switch', async () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} initialSection="matrix" />)

    const toggleBtn = screen.getByRole('switch', { name: /Auto Quadrant Suggestions/i })
    expect(toggleBtn.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(toggleBtn)

    expect(toggleBtn.getAttribute('aria-checked')).toBe('true')
    const stored = JSON.parse(localStorage.getItem('polaris_user_settings') || '{}')
    expect(stored.featureFlags.auto_quadrant_suggest).toBe(true)
  })

  it('toggles matrix view filter memory', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} initialSection="matrix" />)

    const farScheduledToggle = screen.getByRole('switch', { name: /Hide Far Scheduled Tasks/i })
    fireEvent.click(farScheduledToggle)

    expect(localStorage.getItem('polaris_matrix_hide_far_scheduled')).toBe('false')

    const remindersToggle = screen.getByRole('switch', { name: /Hide Nagging Reminders/i })
    fireEvent.click(remindersToggle)

    expect(localStorage.getItem('polaris_matrix_hide_reminders')).toBe('true')
  })

  it('renders and manages Recurring Tasks & Routines subsection', async () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} initialSection="matrix" />)

    await waitFor(() => {
      expect(screen.getByText('Recurring Tasks & Routines')).toBeDefined()
      expect(screen.getByText('Daily Research Reading')).toBeDefined()
    })

    const templateToggle = screen.getByRole('switch', { name: /Toggle Daily Research Reading/i })
    expect(templateToggle.getAttribute('aria-checked')).toBe('true')

    // Toggle active state
    fireEvent.click(templateToggle)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('recurring_task_templates')
    })

    // Delete template
    const deleteBtn = screen.getByRole('button', { name: /Delete Daily Research Reading/i })
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('recurring_task_templates')
      expect(screen.queryByText('Daily Research Reading')).toBeNull()
    })
  })

  it('selects ambient audio default in Focus & Audio section', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} initialSection="focus" />)

    const rainButton = screen.getByText('Deep Rain & Thunder').closest('button')
    fireEvent.click(rainButton)

    const stored = JSON.parse(localStorage.getItem('polaris_user_settings') || '{}')
    expect(stored.featureFlags.ambient_audio_default).toBe('rain')
  })

  it('triggers backup download with all tables including recurring_task_templates', async () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url')
    const revokeObjectURLMock = vi.fn()
    window.URL.createObjectURL = createObjectURLMock
    window.URL.revokeObjectURL = revokeObjectURLMock

    render(<SettingsPanel open={true} onClose={vi.fn()} initialSection="account" />)

    const backupBtn = screen.getByRole('button', { name: /Download Complete JSON Backup/i })
    fireEvent.click(backupBtn)

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('user_settings')
      expect(supabase.from).toHaveBeenCalledWith('recurring_task_templates')
      expect(createObjectURLMock).toHaveBeenCalled()
    })
  })

  it('calls signOut when header Sign Out button is clicked', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />)

    const signOutBtns = screen.getAllByRole('button', { name: /Sign Out/i })
    expect(signOutBtns.length).toBeGreaterThanOrEqual(1)
    fireEvent.click(signOutBtns[0])

    expect(mockSignOut).toHaveBeenCalled()
  })

  it('renders updated footer version v1.2.6', () => {
    render(<SettingsPanel open={true} onClose={vi.fn()} />)
    expect(screen.getByText(/Polaris v1.2.6/)).toBeDefined()
  })
})
