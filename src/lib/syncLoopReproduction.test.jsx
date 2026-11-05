// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import db from './offlineStore'
import { initSyncManager, _resetSyncManagerForTesting } from './syncManager'
import DayBriefView from '../components/views/DayBriefView'
import { useMorningSequence } from '../hooks/useMorningSequence'

vi.mock('../lib/sound', () => ({
  playChime: vi.fn(),
  playChimeDebounced: vi.fn()
}))

function TestSyncBench({ userId }) {
  const { stage } = useMorningSequence()
  return (
    <div>
      <div data-testid="morning-stage">{stage}</div>
      <DayBriefView />
    </div>
  )
}

describe('Sprint B.6b Sync Loop Reproduction Test (Unmocked syncManager)', () => {
  let networkStats = {
    rpcCalls: 0,
    selectCalls: 0,
    callsByTable: {},
    pullsCount: 0
  }

  const userId = '11111111-2222-3333-4444-555555555555'
  const todayStr = new Date().toLocaleDateString('en-CA')

  beforeEach(async () => {
    vi.useFakeTimers()
    _resetSyncManagerForTesting()

    networkStats = {
      rpcCalls: 0,
      selectCalls: 0,
      callsByTable: {},
      pullsCount: 0
    }

    // Configure in-memory mock for Dexie db to avoid jsdom MissingAPIError
    const tables = [
      'tasks', 'daily_tasks', 'goals', 'milestones', 'day_plan_blocks',
      'focus_items', 'backburner', 'subtasks', 'recurring_task_templates',
      'hardware_opportunities', 'eulogies', 'practice_scores', 'curricula',
      'curriculum_topics', 'curriculum_resources', 'curriculum_categories',
      'media_log', 'habits', 'nodes', 'mini_games', 'calendar_events',
      'calendar_backups', 'nudges', 'contacts', 'wins', 'mood_logs',
      'highlights', 'io_logs', 'pomodoro_logs', 'morning_briefs',
      'user_settings', 'outreach_targets', 'habit_logs', 'meal_logs',
      'workout_logs', 'weight_logs', 'daily_plan', 'daily_plan_items',
      'daily_plan_streams', 'day_state', 'exam_dates', 'profiles'
    ]

    db.transaction = vi.fn().mockImplementation(async (mode, table, fn) => { await fn() })
    tables.forEach(t => {
      db[t] = {
        bulkPut: vi.fn().mockResolvedValue(true),
        put: vi.fn().mockResolvedValue(true),
        add: vi.fn().mockResolvedValue(true),
        bulkDelete: vi.fn().mockResolvedValue(true),
        delete: vi.fn().mockResolvedValue(true),
        toArray: vi.fn().mockResolvedValue([]),
        filter: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
        where: vi.fn().mockReturnValue({
          below: vi.fn().mockReturnValue({ primaryKeys: vi.fn().mockResolvedValue([]) }),
          equals: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(0),
            toArray: vi.fn().mockResolvedValue([])
          })
        })
      }
    })

    db._syncQueue = {
      add: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([]),
          delete: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([])
        })
      }),
      update: vi.fn().mockResolvedValue(1),
      bulkDelete: vi.fn().mockResolvedValue(true)
    }

    db.sync_errors = {
      add: vi.fn().mockResolvedValue(1),
      where: vi.fn().mockReturnValue({
        below: vi.fn().mockReturnValue({
          primaryKeys: vi.fn().mockResolvedValue([])
        })
      }),
      bulkDelete: vi.fn().mockResolvedValue(true)
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    _resetSyncManagerForTesting()
  })

  it('fires 5 auth events and 3 online events within 60s and asserts full pulls stay at 1', async () => {
    const { supabase } = await import('./supabase')
    
    // Track any unexpected RPC calls (get_user_data removed)
    vi.spyOn(supabase, 'rpc').mockImplementation(async (fnName, params) => {
      networkStats.rpcCalls++
      return { data: null, error: null }
    })

    // Spy on from().select(): practice_scores returns 404 (PGRST205), others return fixture arrays
    vi.spyOn(supabase, 'from').mockImplementation((table) => {
      networkStats.callsByTable[table] = (networkStats.callsByTable[table] || 0) + 1
      networkStats.selectCalls++

      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(async () => {
          if (table === 'morning_briefs') {
            return {
              data: {
                id: 'brief-fix-1',
                user_id: userId,
                date: todayStr,
                items: [{ type: 'news', title: 'Fixture News Item' }],
                seen: true
              },
              error: null
            }
          }
          return { data: null, error: null }
        }),
        single: vi.fn().mockImplementation(async () => {
          if (table === 'profiles') {
            return {
              data: {
                id: userId,
                clarity_anchor: 'Test Anchor',
                current_chapter: 'Chapter 1'
              },
              error: null
            }
          }
          return { data: null, error: null }
        }),
        then: (resolve) => {
          if (table === 'practice_scores') {
            resolve({
              data: null,
              error: {
                code: 'PGRST205',
                message: "Could not find the 'practice_scores' table in the schema cache"
              }
            })
            return
          }
          if (table === 'tasks') {
            resolve({
              data: [
                {
                  id: 'task-fix-1',
                  user_id: userId,
                  title: 'Primary Task 1 (~30 min)',
                  status: 'active',
                  estimated_minutes: 30,
                  created_at: new Date().toISOString()
                }
              ],
              error: null
            })
            return
          }
          resolve({ data: [], error: null })
        }
      }
      return builder
    })

    // Mock useAuth
    const useAuthModule = await import('../hooks/useAuth')
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: { id: userId, email: 'test@example.com' },
      profile: { id: userId },
      loading: false,
      trackXP: vi.fn()
    })

    // Track onAuthStateChange listener
    let authListener = null
    if (!supabase.auth) supabase.auth = {}
    supabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
      authListener = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    supabase.auth.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: userId, email: 'test@example.com' } } }
    })

    // Initialize real unmocked syncManager (Full Pull 1)
    const cleanupSync = initSyncManager(userId)

    // Render DayBriefView + useMorningSequence
    let wrapper
    await act(async () => {
      wrapper = render(<TestSyncBench userId={userId} />)
    })

    // Flush any pending promises from initial sync
    await act(async () => {
      await Promise.resolve()
    })

    const initialTaskPulls = networkStats.callsByTable['tasks'] || 0
    expect(initialTaskPulls).toBe(1)
    expect(networkStats.rpcCalls).toBe(0)

    // 1. Fire 5 auth events (TOKEN_REFRESHED, SIGNED_IN) for the same user within 60s
    const authEvents = [
      'TOKEN_REFRESHED',
      'SIGNED_IN',
      'TOKEN_REFRESHED',
      'TOKEN_REFRESHED',
      'SIGNED_IN'
    ]

    for (const evt of authEvents) {
      await act(async () => {
        vi.advanceTimersByTime(2000)
        // Simulate auth event via onAuthStateChange callback if registered, or direct initSyncManager
        if (authListener) {
          authListener(evt, { user: { id: userId, email: 'test@example.com' } })
        }
        initSyncManager(userId)
        await Promise.resolve()
      })
    }

    // 2. Fire 3 online events within the 60s window
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(3000)
        window.dispatchEvent(new Event('online'))
        await Promise.resolve()
      })
    }

    // Advance remainder of 60 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000)
      await Promise.resolve()
    })

    console.log('=== SPRINT B.6b REPRODUCTION TEST RESULTS ===')
    console.log('Tasks pull count after 5 auth + 3 online events:', networkStats.callsByTable['tasks'])
    console.log('Practice scores pull count (skipped via missingTables):', networkStats.callsByTable['practice_scores'])
    console.log('Total RPC calls:', networkStats.rpcCalls)

    // Assert full pulls stay at 1
    expect(networkStats.callsByTable['tasks']).toBe(1)
    expect(networkStats.callsByTable['goals']).toBe(1)
    expect(networkStats.callsByTable['milestones']).toBe(1)
    expect(networkStats.callsByTable['practice_scores']).toBe(1) // Queried once, then stored in missingTables
    expect(networkStats.rpcCalls).toBe(0) // No get_user_data RPC

    if (cleanupSync) cleanupSync()
  })
})
