// @vitest-environment jsdom
import React from 'react'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import DayBriefView from './DayBriefView'

const mockUser = { id: 'test-user-loop-123' }

// Track writes
const writesTotal = {}
const writesIdleAfter1s = {}
const writesAfterTick = {}
const writesAfterCompletion = {}
let currentPhase = 'initial_mount' // 'initial_mount' | 'idle_after_1s' | 'after_tick' | 'after_completion'

// In-memory fixtures store
let mockDb = {
  tasks: [],
  daily_tasks: [],
  goals: [],
  morning_briefs: [],
  hardware_opportunities: [],
  media_log: [],
  daily_plan: [],
  daily_plan_streams: [],
  pomodoro_logs: [],
  io_logs: []
}

function recordWrite(table) {
  writesTotal[table] = (writesTotal[table] || 0) + 1
  if (currentPhase === 'idle_after_1s') {
    writesIdleAfter1s[table] = (writesIdleAfter1s[table] || 0) + 1
  } else if (currentPhase === 'after_tick') {
    writesAfterTick[table] = (writesAfterTick[table] || 0) + 1
  } else if (currentPhase === 'after_completion') {
    writesAfterCompletion[table] = (writesAfterCompletion[table] || 0) + 1
  }
}

function dispatchChangeEvents(table) {
  if (typeof window !== 'undefined') {
    if (['tasks', 'daily_tasks', 'goals'].includes(table)) {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table } }))
    } else if (['io_logs', 'pomodoro_logs'].includes(table)) {
      window.dispatchEvent(new CustomEvent('polaris-io-logs-changed'))
    }
  }
}

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    trackXP: vi.fn(),
    addXP: vi.fn()
  })
}))

vi.mock('../../hooks/useMorningBrief', () => ({
  useMorningBrief: () => ({
    generateBrief: vi.fn(),
    isGenerating: false
  })
}))

vi.mock('../../lib/sound', () => ({
  playChime: vi.fn()
}))

vi.mock('../../lib/supabase', () => {
  const channelObj = {
    on: vi.fn(function () { return this }),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
  }
  return {
    supabase: {
      channel: () => channelObj,
      removeChannel: vi.fn()
    }
  }
})

vi.mock('../../lib/syncManager', () => ({
  syncManager: {
    pullData: vi.fn(),
    pushData: vi.fn()
  }
}))

vi.mock('../../lib/offlineApi', () => ({
  generateUUID: () => 'uuid-' + Math.random().toString(36).slice(2, 9),
  offlineSelect: vi.fn(async (table, filter = {}) => {
    const rows = mockDb[table] || []
    const matched = rows.filter(row => {
      return Object.entries(filter).every(([key, val]) => row[key] === val)
    })
    return { data: matched, error: null }
  }),
  offlineInsert: vi.fn(async (table, row) => {
    recordWrite(table)
    const newRow = { id: row.id || 'uuid-' + Math.random().toString(36).slice(2, 9), ...row }
    if (!mockDb[table]) mockDb[table] = []
    mockDb[table].push(newRow)
    dispatchChangeEvents(table)
    return { data: [newRow], error: null }
  }),
  offlineUpdate: vi.fn(async (table, match = {}, updates = {}) => {
    recordWrite(table)
    const rows = mockDb[table] || []
    let updatedCount = 0
    mockDb[table] = rows.map(r => {
      const isMatch = Object.entries(match).every(([k, v]) => r[k] === v)
      if (isMatch) {
        updatedCount++
        return { ...r, ...updates }
      }
      return r
    })
    dispatchChangeEvents(table)
    return { data: [{ count: updatedCount }], error: null }
  }),
  offlineDelete: vi.fn(async (table, match = {}) => {
    recordWrite(table)
    const rows = mockDb[table] || []
    mockDb[table] = rows.filter(r => {
      return !Object.entries(match).every(([k, v]) => r[k] === v)
    })
    dispatchChangeEvents(table)
    return { data: [{ count: 1 }], error: null }
  })
}))

describe('DayBriefView + TodayAgendaWidget Loop Detector Test (Sprint B.5)', () => {
  let logSpy
  let lastLoggedRenders = { DayBriefView: 0, TodayAgendaWidget: 0 }

  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(writesTotal).forEach(k => delete writesTotal[k])
    Object.keys(writesIdleAfter1s).forEach(k => delete writesIdleAfter1s[k])
    Object.keys(writesAfterTick).forEach(k => delete writesAfterTick[k])
    Object.keys(writesAfterCompletion).forEach(k => delete writesAfterCompletion[k])
    currentPhase = 'initial_mount'
    lastLoggedRenders = { DayBriefView: 0, TodayAgendaWidget: 0 }

    logSpy = vi.spyOn(console, 'log').mockImplementation((msg) => {
      if (typeof msg === 'string') {
        const dbm = msg.match(/\[RENDER COUNTER\] DayBriefView: (\d+) renders/)
        if (dbm) lastLoggedRenders.DayBriefView = parseInt(dbm[1], 10)
        const agm = msg.match(/\[RENDER COUNTER\] TodayAgendaWidget: (\d+) renders/)
        if (agm) lastLoggedRenders.TodayAgendaWidget = parseInt(agm[1], 10)
      }
    })

    const todayStr = new Date().toLocaleDateString('en-CA')

    // 3 candidate primaries fixture
    mockDb = {
      tasks: [
        {
          id: 'task-p1',
          user_id: mockUser.id,
          title: 'Primary Task Alpha',
          status: 'active',
          quadrant: 'urgent_important',
          estimated_minutes: 30,
          time_estimate_minutes: 30,
          mental_load: 'medium',
          deadline: todayStr,
          created_at: new Date(Date.now() - 30000).toISOString()
        },
        {
          id: 'task-p2',
          user_id: mockUser.id,
          title: 'Primary Task Beta',
          status: 'active',
          quadrant: 'urgent_important',
          estimated_minutes: 45,
          time_estimate_minutes: 45,
          mental_load: 'medium',
          deadline: todayStr,
          created_at: new Date(Date.now() - 20000).toISOString()
        },
        {
          id: 'task-p3',
          user_id: mockUser.id,
          title: 'Primary Task Gamma',
          status: 'active',
          quadrant: 'urgent_important',
          estimated_minutes: 60,
          time_estimate_minutes: 60,
          mental_load: 'high',
          deadline: todayStr,
          created_at: new Date(Date.now() - 10000).toISOString()
        }
      ],
      daily_tasks: [],
      goals: [],
      morning_briefs: [
        {
          id: 'brief-1',
          user_id: mockUser.id,
          date: todayStr,
          items: [{ type: 'news', title: 'Tech Breakthrough', summary: 'Summary text' }]
        }
      ],
      hardware_opportunities: [],
      media_log: [],
      daily_plan: [],
      daily_plan_streams: [],
      pomodoro_logs: [],
      io_logs: []
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    logSpy.mockRestore()
  })

  it('runs 60s idle loop detection, then box tick, then completion, reporting stats', async () => {
    // 1. Mount Phase
    currentPhase = 'initial_mount'
    render(<DayBriefView />)

    // Advance 1 second to let mount and initial hydration settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    // Capture mount write counts
    const mountWrites = { ...writesTotal }

    // 2. 60-Second Idle Phase
    currentPhase = 'idle_after_1s'
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60000)
    })

    // Record idle stats
    const idleTotalWrites = Object.values(writesIdleAfter1s).reduce((a, b) => a + b, 0)
    const idleRenders = { ...lastLoggedRenders }

    console.info('=== SPRINT B.5 LOOP DETECTOR RESULTS ===')
    console.info('Mount writes (0 to 1s):', mountWrites)
    console.info('Idle writes (1s to 60s):', writesIdleAfter1s, 'Total:', idleTotalWrites)
    console.info('Renders at 60s idle:', idleRenders)

    // Hard Assertion: Fail if idle writes after the first second exceed 0
    expect(idleTotalWrites).toBe(0)

    // 3. One Box Tick Phase
    currentPhase = 'after_tick'
    const boxChips = screen.getAllByTitle(/Click to log completed 15m focus block/i)
    expect(boxChips.length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.click(boxChips[0])
    })

    // Advance timers by 10s to let debounces and render counter log
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    const tickWrites = { ...writesAfterTick }
    const tickRenders = { ...lastLoggedRenders }
    console.info('Writes after one box tick:', tickWrites)
    console.info('Renders after one box tick:', tickRenders)

    // Verify tick writes pomodoro_logs and io_logs
    expect(tickWrites['pomodoro_logs']).toBeGreaterThanOrEqual(1)
    expect(tickWrites['io_logs']).toBeGreaterThanOrEqual(1)

    // 4. One Completion Phase
    currentPhase = 'after_completion'
    const masterCheckboxes = screen.getAllByTitle(/Mark completed/i)
    expect(masterCheckboxes.length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.click(masterCheckboxes[0])
    })

    // Advance timers by 10s to let completion settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })

    const completionWrites = { ...writesAfterCompletion }
    const completionRenders = { ...lastLoggedRenders }
    console.info('Writes after completion:', completionWrites)
    console.info('Renders after completion:', completionRenders)

    // Verify completion wrote to tasks table
    expect(completionWrites['tasks']).toBeGreaterThanOrEqual(1)
  })
})
