import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useGoalCompletion } from './useGoalCompletion'
import { XP } from '../data/xpRewards'
import { playChime } from '../lib/sound'
import { offlineSelect, offlineUpdate, offlineInsert } from '../lib/offlineApi'

export function useTodaysTasks() {
  const { user, trackXP } = useAuth()
  const { toggleGoal } = useGoalCompletion()
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local time

    try {
      // 1. Roll over unfinished recurring tasks, then fetch for today
      let finalDailyTasks = []
      try {
        // Carry forward unfinished tasks
        const { data: unfTasks } = await offlineSelect('daily_tasks', { user_id: user.id, recurring: true, completed: false })
        if (unfTasks) {
          for (const t of unfTasks) {
            if (t.date < todayStr) {
              await offlineUpdate('daily_tasks', { id: t.id }, { date: todayStr })
            }
          }
        }

        const { data: dailyData } = await offlineSelect('daily_tasks', { user_id: user.id, date: todayStr })
        finalDailyTasks = dailyData || []
      } catch (e1) {
        console.warn('Error fetching daily_tasks:', e1)
      }

      // 2. Fetch goals with scope = 'daily'
      let activeGoals = []
      try {
        const { data: goalsData } = await offlineSelect('goals', { user_id: user.id, scope: 'daily' })
        activeGoals = (goalsData || []).filter(g => !g.completed || g.deadline === todayStr)
      } catch (e2) {
        console.warn('Error fetching goals:', e2)
      }

      // 3. Fetch active tasks from main tasks table
      let activeMatrixTasks = []
      try {
        // Since we can only equality match, we'll fetch all tasks for user and filter in memory
        const { data: allTasks } = await offlineSelect('tasks', { user_id: user.id })
        activeMatrixTasks = (allTasks || []).filter(t => t.status === 'active' || t.status === 'scheduled')
      } catch (e3) {
        console.warn('Error fetching matrix tasks:', e3)
      }

      // Map each source to a unified model
      const dailyMapped = finalDailyTasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: !!t.completed,
        __type: 'daily_task',
        raw: t
      }))

      const goalsMapped = activeGoals.map(g => ({
        id: g.id,
        title: g.title,
        completed: !!g.completed,
        target: g.target,
        current: g.current,
        unit: g.unit,
        __type: 'goal',
        raw: g
      }))

      const matrixMapped = activeMatrixTasks.map(m => ({
        id: m.id,
        title: m.title,
        completed: m.status === 'done',
        estimated_minutes: m.estimated_minutes,
        quadrant: m.quadrant,
        notes: m.notes,
        __type: 'matrix_task',
        raw: m
      }))

      // Combine & deduplicate by lowercased title
      const seenTitles = new Set()
      const combined = []

      for (const item of [...matrixMapped, ...dailyMapped, ...goalsMapped]) {
        const key = item.title.trim().toLowerCase()
        if (!seenTitles.has(key)) {
          seenTitles.add(key)
          combined.push(item)
        }
      }

      // Sort: incomplete first, then completed
      combined.sort((a, b) => {
        if (a.completed && !b.completed) return 1
        if (!a.completed && b.completed) return -1
        return 0
      })

      setTasks(combined)
    } catch (err) {
      console.error('Error fetching today\'s tasks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Realtime subscription with unique channel name per subscriber
  useEffect(() => {
    if (!user) return
    const channelName = `todays-tasks-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => fetchTasks())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals' }, () => fetchTasks())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchTasks])

  const toggleComplete = async (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation()

    if (item.__type === 'goal') {
      await toggleGoal(item.raw, () => fetchTasks(), e)
    } else {
      const isCompleting = !item.completed

      try {
        if (item.__type === 'daily_task') {
          await offlineUpdate('daily_tasks', 
            { id: item.id }, 
            { completed: isCompleting }
          )
        } else if (item.__type === 'matrix_task') {
          const newStatus = isCompleting ? 'done' : 'active'
          await offlineUpdate('tasks',
            { id: item.id },
            { status: newStatus }
          )
        } else if (item.id) {
          await offlineUpdate('daily_tasks', 
            { id: item.id }, 
            { completed: isCompleting }
          )
          const newStatus = isCompleting ? 'done' : 'active'
          await offlineUpdate('tasks',
            { id: item.id },
            { status: newStatus }
          )
        }
      } catch (err) {
        console.warn('Sync toggle error:', err)
      }

      if (isCompleting) {
        playChime('success')
        trackXP(false, true, XP?.TASK_COMPLETE || 10)
      } else {
        trackXP(true, false, XP?.TASK_COMPLETE || 10)
      }
      fetchTasks()
    }
  }

  const addTask = async (title) => {
    if (!user) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    const { data } = await offlineInsert('daily_tasks', {
      user_id: user.id,
      title: title.trim(),
      date: todayStr,
      recurring: false,
      completed: false
    })

    if (data) fetchTasks()
  }

  return { tasks, isLoading, fetchTasks, toggleComplete, addTask }
}
