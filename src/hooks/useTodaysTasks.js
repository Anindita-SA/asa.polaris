import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useGoalCompletion } from './useGoalCompletion'
import { XP } from '../data/xpRewards'
import { playChime } from '../lib/sound'

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
      // 1. Fetch daily_tasks for today
      let finalDailyTasks = []
      try {
        const { data: dailyData } = await supabase
          .from('daily_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', todayStr)

        finalDailyTasks = dailyData || []
        if (finalDailyTasks.length === 0) {
          const { data: pastRecurring } = await supabase
            .from('daily_tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('recurring', true)
            .lt('date', todayStr)

          if (pastRecurring && pastRecurring.length > 0) {
            const uniqueTitles = [...new Set(pastRecurring.map(t => t.title))]
            const clonedTasks = uniqueTitles.map(title => ({
              user_id: user.id,
              title,
              date: todayStr,
              recurring: true,
              completed: false
            }))
            const { data: inserted } = await supabase
              .from('daily_tasks')
              .insert(clonedTasks)
              .select()
            if (inserted) finalDailyTasks = inserted
          }
        }
      } catch (e1) {
        console.warn('Error fetching daily_tasks:', e1)
      }

      // 2. Fetch goals with scope = 'daily'
      let activeGoals = []
      try {
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('scope', 'daily')

        activeGoals = (goalsData || []).filter(g => !g.completed || g.deadline === todayStr)
      } catch (e2) {
        console.warn('Error fetching goals:', e2)
      }

      // 3. Fetch active tasks from main tasks table
      let activeMatrixTasks = []
      try {
        const { data: matrixTasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'scheduled'])

        activeMatrixTasks = matrixTasksData || []
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
        await supabase
          .from('daily_tasks')
          .update({ completed: isCompleting })
          .eq('user_id', user.id)
          .eq('title', item.title)

        const newStatus = isCompleting ? 'done' : 'active'
        await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('user_id', user.id)
          .eq('title', item.title)
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
    const { data } = await supabase.from('daily_tasks').insert({
      user_id: user.id,
      title: title.trim(),
      date: todayStr,
      recurring: false,
      completed: false
    }).select().single()

    if (data) fetchTasks()
  }

  return { tasks, isLoading, fetchTasks, toggleComplete, addTask }
}
