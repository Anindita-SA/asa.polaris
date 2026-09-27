import { useState, useEffect, useMemo, useCallback } from 'react'
import { offlineSelect, offlineUpdate } from '../../lib/offlineApi'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday, isBefore } from 'date-fns'
import { Edit2, Check, X, Trash2 } from 'lucide-react'

import { XP } from '../../data/xpRewards'
import { useCelebration } from '../../hooks/useCelebration'

const MonthlyHabitGrid = ({ habitTemplates, userId, selectedDate, addXP, trackXP, onDelete, onRefetch }) => {
  const { celebrate } = useCelebration()
  const [habitTasks, setHabitTasks] = useState([])
  const [editingHabit, setEditingHabit] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart.getTime()])

  const fetchHabitTasks = useCallback(async () => {
    if (!habitTemplates || habitTemplates.length === 0 || !userId) {
      setHabitTasks([])
      return
    }
    const templateIds = new Set(habitTemplates.map(t => t.id))
    const { data } = await offlineSelect('tasks', { user_id: userId })
    const allUserTasks = (data || []).filter(t => t.user_id === userId && t.source_template_id && templateIds.has(t.source_template_id))
    
    // Group tasks by source_template_id, merge duplicate histories, and pick the primary/active task
    const tasksByTemplate = new Map()
    for (const t of allUserTasks) {
      const tplId = t.source_template_id
      if (!tasksByTemplate.has(tplId)) {
        tasksByTemplate.set(tplId, [])
      }
      tasksByTemplate.get(tplId).push(t)
    }

    const consolidated = []
    for (const tpl of habitTemplates) {
      const list = tasksByTemplate.get(tpl.id) || []
      if (list.length === 0) continue

      // Sort: active tasks first, then by created_at descending
      const sorted = [...list].sort((a, b) => {
        if (a.status !== 'done' && b.status === 'done') return -1
        if (a.status === 'done' && b.status !== 'done') return 1
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeB - timeA
      })

      const primary = { ...sorted[0] }
      // Merge completion_dates from all rows belonging to this template
      const allDates = new Set()
      let maxCount = primary.completion_count || 0

      for (const item of sorted) {
        if (Array.isArray(item.completion_dates)) {
          item.completion_dates.forEach(d => { if (d) allDates.add(d) })
        }
        if (typeof item.completion_count === 'number' && item.completion_count > maxCount) {
          maxCount = item.completion_count
        }
      }

      const mergedDates = Array.from(allDates).sort()
      primary.completion_dates = mergedDates
      primary.completion_count = Math.max(maxCount, mergedDates.length)
      consolidated.push(primary)
    }

    setHabitTasks(consolidated)
  }, [userId, habitTemplates])

  useEffect(() => {
    fetchHabitTasks()
  }, [fetchHabitTasks, monthStart.getTime()])

  // Listen to polaris-tasks-changed events to refresh grid when sync or tasks change
  useEffect(() => {
    const handleChanged = (e) => {
      if (e.detail?.table === 'tasks' || e.detail?.table === 'recurring_task_templates') {
        fetchHabitTasks()
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('polaris-tasks-changed', handleChanged)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('polaris-tasks-changed', handleChanged)
      }
    }
  }, [fetchHabitTasks])

  const getTaskForTemplate = (templateId) => {
    return habitTasks.find(t => t.source_template_id === templateId)
  }

  const isLogged = (templateId, dateStr) => {
    const task = getTaskForTemplate(templateId)
    if (!task) return false
    const dates = Array.isArray(task.completion_dates) ? task.completion_dates : []
    return dates.includes(dateStr)
  }

  const toggleDay = async (template, dateStr, e) => {
    const task = getTaskForTemplate(template.id)
    if (!task || !userId) return

    const dates = Array.isArray(task.completion_dates) ? [...task.completion_dates] : []
    const wasLogged = dates.includes(dateStr)

    let newDates, newCount, newStatus
    if (wasLogged) {
      // Remove date
      newDates = dates.filter(d => d !== dateStr)
      newCount = Math.max((task.completion_count || 1) - 1, 0)
      // If un-toggling today and task was done, set back to active
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      newStatus = dateStr === todayStr ? 'active' : task.status
    } else {
      // Add date
      newDates = [...dates, dateStr].sort()
      newCount = (task.completion_count || 0) + 1
      // If toggling today, mark task as done
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      newStatus = dateStr === todayStr ? 'done' : task.status
      celebrate(e ? { x: e.clientX, y: e.clientY } : undefined)
    }

    // Persist via offlineUpdate to keep Dexie and Supabase synchronized
    await offlineUpdate('tasks', { id: task.id, user_id: userId }, {
      completion_dates: newDates,
      completion_count: newCount,
      status: newStatus
    })

    // Update local state optimistically
    setHabitTasks(prev => prev.map(t => 
      t.id === task.id 
        ? { ...t, completion_dates: newDates, completion_count: newCount, status: newStatus }
        : t
    ))

    trackXP(wasLogged, !wasLogged, XP.HABIT_CHECK)
  }

  const saveHabitTitle = async (templateId) => {
    if (!editTitle.trim() || !userId) return
    await offlineUpdate('recurring_task_templates', { id: templateId, user_id: userId }, { title: editTitle.trim() })
    
    // Also update the corresponding task title
    const task = getTaskForTemplate(templateId)
    if (task) {
      await offlineUpdate('tasks', { id: task.id, user_id: userId }, { title: editTitle.trim() })
    }
    setEditingHabit(null)
    if (onRefetch) onRefetch()
  }

  const getCompletionRate = (templateId) => {
    const task = getTaskForTemplate(templateId)
    if (!task) return 0
    const dates = Array.isArray(task.completion_dates) ? task.completion_dates : []
    // Count dates that fall within the displayed month
    const startStr = format(monthStart, 'yyyy-MM-dd')
    const endStr = format(monthEnd, 'yyyy-MM-dd')
    const monthDates = dates.filter(d => d >= startStr && d <= endStr)
    const todayIdx = days.findIndex(d => isToday(d))
    const daysElapsed = todayIdx >= 0 ? todayIdx + 1 : days.length
    return daysElapsed > 0 ? Math.round((monthDates.length / daysElapsed) * 100) : 0
  }

  if (!habitTemplates.length) return null

  return (
    <div className="overflow-x-auto scrollbar-hide pb-2">
      <table className="w-full border-collapse min-w-[500px]">
        <thead>
          <tr>
            <th className="text-left text-xs font-mono uppercase tracking-wider text-nova/60 pb-4 pr-4 min-w-[240px]">
              Target Habits
            </th>
            {days.map(day => {
              const dayStr = format(day, 'd')
              const today = isToday(day)
              return (
                <th key={dayStr} className={`text-center text-xs font-mono pb-4 px-0 min-w-[20px] ${
                  today ? 'text-gold' : 'text-nova/60/40'
                }`}>
                  {dayStr}
                </th>
              )
            })}
            <th className="text-center text-xs font-mono uppercase tracking-wider text-nova/60 pb-4 pl-3 min-w-[40px]">Win %</th>
          </tr>
        </thead>
        <tbody className="space-y-1">
          {habitTemplates.map(template => {
            const rate = getCompletionRate(template.id)
            return (
              <tr key={template.id} className="group habit-row">
                <td className="pr-4 py-2 border-b border-blue-900/10">
                  <div className="flex items-center gap-2">
                    {editingHabit === template.id ? (
                      <div className="flex items-center gap-1 flex-1 bg-pulsar/10 px-2 py-1 rounded border border-pulsar/40">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveHabitTitle(template.id)}
                          className="flex-1 bg-transparent text-sm text-starlight outline-none font-body"
                          autoFocus />
                        <button onClick={() => saveHabitTitle(template.id)} className="text-emerald hover:text-emerald/80"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingHabit(null)} className="text-nova/60 hover:text-starlight"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-body text-starlight/90 truncate max-w-[220px]" title={template.title}>
                          {template.title}
                        </span>
                        <button onClick={() => { setEditingHabit(template.id); setEditTitle(template.title) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-nova/60 hover:text-starlight p-1">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button onClick={() => onDelete(template.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-nova/60 hover:text-danger p-1">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const logged = isLogged(template.id, dateStr)
                  const today = isToday(day)
                  const future = !isBefore(day, new Date()) && !today
                  return (
                    <td key={dateStr} className="text-center py-2 px-0 border-b border-blue-900/10">
                      <button
                        onClick={(e) => !future && toggleDay(template, dateStr, e)}
                        disabled={future}
                        className={`habit-cell ${
                          logged 
                            ? 'bg-emerald  border border-emerald/50' 
                            : today
                            ? 'bg-gold/20 border border-gold hover:bg-gold/40 hover:'
                            : future
                            ? 'bg-transparent border border-blue-900/10 opacity-30 cursor-not-allowed'
                            : 'bg-stardust/10 border border-pulsar/30 hover:bg-stardust/30'
                        }`}
                        title={`${template.title} - ${format(day, 'MMM d')}`}
                      />
                    </td>
                  )
                })}
                <td className="text-center py-2 pl-3 border-b border-blue-900/10">
                  <div className={`text-xs font-mono px-2 py-0.5 rounded-full inline-block ${
                    rate >= 80 ? 'bg-emerald/10 text-emerald border border-emerald/20' : 
                    rate >= 50 ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
                    'bg-pulsar/10 text-nova/60 border border-nova/20'
                  }`}>
                    {rate}%
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default MonthlyHabitGrid
