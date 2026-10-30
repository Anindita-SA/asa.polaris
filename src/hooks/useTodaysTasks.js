import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useGoalCompletion } from './useGoalCompletion'
import { XP } from '../data/xpRewards'
import { playChime } from '../lib/sound'
import { offlineSelect, offlineUpdate, offlineInsert } from '../lib/offlineApi'
import { isOpenTask } from '../lib/taskState'

export function useTodaysTasks() {
  const { user, trackXP } = useAuth()
  const { toggleGoal } = useGoalCompletion()
  const [tasks, setTasks] = useState([])
  const [allBacklogTasks, setAllBacklogTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchTasks = useCallback(async (silent = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }

    if (!silent) {
      setIsLoading(true)
    }
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
      let allTasksList = []
      try {
        // Since we can only equality match, we'll fetch all tasks for user and filter in memory
        const { data: allTasks } = await offlineSelect('tasks', { user_id: user.id })
        allTasksList = allTasks || []
        activeMatrixTasks = allTasksList.filter(t => 
          t.status !== 'archived' && (
            t.status === 'active' || 
            t.status === 'scheduled' || 
            (t.status === 'done' && t.deadline === todayStr)
          )
        )
      } catch (e3) {
        console.warn('Error fetching matrix tasks:', e3)
      }

      // Compute subtask statistics and parent titles from allTasksList
      const subtaskStats = {}
      const taskTitleById = {}
      for (const t of allTasksList) {
        taskTitleById[t.id] = t.title
        if (t.parent_task_id) {
          if (t.status === 'archived') continue
          if (!subtaskStats[t.parent_task_id]) {
            subtaskStats[t.parent_task_id] = { total: 0, completed: 0 }
          }
          subtaskStats[t.parent_task_id].total += 1
          if (t.status === 'done') {
            subtaskStats[t.parent_task_id].completed += 1
          }
        }
      }

      // Sort active matrix tasks primarily by sort_order ASC (when set), falling back to created_at ASC
      activeMatrixTasks.sort((a, b) => {
        const orderA = a.sort_order != null ? a.sort_order : Infinity
        const orderB = b.sort_order != null ? b.sort_order : Infinity
        if (orderA !== orderB) return orderA - orderB
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateA - dateB
      })

      // Map each source to a unified model
      const dailyMapped = finalDailyTasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: !!t.completed,
        estimated_minutes: t.estimated_minutes || null,
        time_estimate_minutes: t.time_estimate_minutes || null,
        mental_load: t.mental_load || null,
        quadrant: t.quadrant || null,
        deadline: t.date || todayStr,
        parent_task_id: t.parent_task_id || null,
        sort_order: t.sort_order ?? null,
        notes: t.notes || null,
        subtasks_total: 0,
        subtasks_completed: 0,
        parent_title: null,
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
        estimated_minutes: null,
        time_estimate_minutes: null,
        mental_load: null,
        quadrant: null,
        deadline: g.deadline || todayStr,
        parent_task_id: g.parent_goal_id || null,
        sort_order: null,
        notes: g.description || null,
        subtasks_total: 0,
        subtasks_completed: 0,
        parent_title: null,
        __type: 'goal',
        raw: g
      }))

      const matrixMapped = activeMatrixTasks.map(m => ({
        id: m.id,
        title: m.title,
        completed: m.status === 'done',
        estimated_minutes: m.estimated_minutes,
        time_estimate_minutes: m.time_estimate_minutes,
        mental_load: m.mental_load,
        quadrant: m.quadrant,
        deadline: m.deadline,
        parent_task_id: m.parent_task_id,
        sort_order: m.sort_order ?? null,
        notes: m.notes,
        subtasks_total: subtaskStats[m.id]?.total || 0,
        subtasks_completed: subtaskStats[m.id]?.completed || 0,
        parent_title: m.parent_task_id ? (taskTitleById[m.parent_task_id] || null) : null,
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
        const orderA = a.sort_order != null ? a.sort_order : Infinity
        const orderB = b.sort_order != null ? b.sort_order : Infinity
        if (orderA !== orderB) return orderA - orderB
        return 0
      })

      setTasks(combined)
      setAllBacklogTasks(allTasksList)
    } catch (err) {
      console.error('Error fetching today\'s tasks:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Listen for local tasks-changed event across tabs/components
  useEffect(() => {
    const handleTasksChanged = (e) => {
      const changedTable = e?.detail?.table
      if (e?.detail && !['tasks', 'daily_tasks', 'goals'].includes(changedTable)) {
        return
      }
      fetchTasks(true)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('polaris-tasks-changed', handleTasksChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('polaris-tasks-changed', handleTasksChanged)
      }
    }
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
      fetchTasks(true)
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

    if (data) fetchTasks(true)
  }

  const updateSortOrder = async (taskId, newOrder) => {
    if (!taskId) return
    try {
      await offlineUpdate('tasks', { id: taskId }, { sort_order: newOrder })
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, sort_order: newOrder } : t)))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table: 'tasks' } }))
      }
    } catch (err) {
      console.warn('Error updating sort_order:', err)
    }
  }

  const addSubtask = async (parentTaskId, title) => {
    if (!user || !title?.trim()) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    const { data } = await offlineInsert('tasks', {
      user_id: user.id,
      title: title.trim(),
      parent_task_id: parentTaskId,
      status: 'active',
      deadline: todayStr
    })
    if (data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table: 'tasks' } }))
      }
      fetchTasks(true)
    }
  }

  const attachSubtask = async (taskId, parentTaskId) => {
    if (!taskId) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    await offlineUpdate('tasks', { id: taskId }, { parent_task_id: parentTaskId, deadline: todayStr, status: 'active' })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table: 'tasks' } }))
    }
    fetchTasks(true)
  }

  return { tasks, allBacklogTasks, isLoading, fetchTasks, toggleComplete, addTask, addSubtask, attachSubtask, updateSortOrder }
}
