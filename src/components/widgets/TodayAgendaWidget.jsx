import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Reorder } from 'framer-motion'
import {
  ListTodo,
  GripVertical,
  CheckCircle2,
  Circle,
  Edit3,
  Check,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Layers,
  FolderGit2
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTodaysTasks } from '../../hooks/useTodaysTasks'
import { playChime } from '../../lib/sound'
import { offlineInsert, offlineSelect } from '../../lib/offlineApi'

export default function TodayAgendaWidget({ className = '' }) {
  const { user, trackXP } = useAuth()
  const { tasks, isLoading, toggleComplete, addTask, updateSortOrder } = useTodaysTasks()

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  // Timebox mode: 15m or 30m
  const [timeboxMode, setTimeboxMode] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('polaris_timebox_mode') || '15'
    }
    return '15'
  })

  const boxMins = Number(timeboxMode) || 15

  const handleTimeboxModeChange = (mode) => {
    setTimeboxMode(mode)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('polaris_timebox_mode', mode)
    }
  }

  // Day aliases (cosmetic day slices)
  const [dayAliases, setDayAliases] = useState({})
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editAliasValue, setEditAliasValue] = useState('')

  // Timeboxes checked state: { [taskId]: [boolean, ...] }
  const [timeboxesMap, setTimeboxesMap] = useState({})

  // Total focus minutes logged today
  const [loggedMinutesToday, setLoggedMinutesToday] = useState(0)

  // Quick Add task input state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')

  // Quick Wins collapsible section
  const [showQuickWins, setShowQuickWins] = useState(false)

  // Primaries state for Framer Motion Reorder
  const [primaries, setPrimaries] = useState([])

  // Load aliases from localStorage
  const loadAliases = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return
    const aliases = {}
    tasks.forEach(t => {
      const saved = localStorage.getItem(`polaris_day_alias_${todayStr}_${t.id}`)
      if (saved) aliases[t.id] = saved
    })
    setDayAliases(aliases)
  }, [tasks, todayStr])

  // Load timeboxes from localStorage
  const loadTimeboxes = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return
    const map = {}
    tasks.forEach(t => {
      try {
        const raw = localStorage.getItem(`polaris_timeboxes_${todayStr}_${t.id}`)
        if (raw) map[t.id] = JSON.parse(raw)
      } catch (e) {}
    })
    setTimeboxesMap(map)
  }, [tasks, todayStr])

  // Helper: check if a task is a Quick Win
  const isQuickWin = useCallback((t) => {
    if (t.subtasks_total && t.subtasks_total > 0) return false
    const mins = t.estimated_minutes || t.time_estimate_minutes
    return t.mental_load === 'low' || (mins != null && mins > 0 && mins <= 15)
  }, [])

  // Refresh logged minutes from pomodoro_logs or localStorage
  const refreshLoggedMinutes = useCallback(async () => {
    if (user?.id) {
      try {
        const { data: logs } = await offlineSelect('pomodoro_logs', { user_id: user.id, date: todayStr })
        if (logs && Array.isArray(logs) && logs.length > 0) {
          const total = logs.reduce((acc, log) => acc + (Number(log.duration_minutes) || 0), 0)
          setLoggedMinutesToday(total)
          return
        }
      } catch (err) {
        console.warn('Error fetching pomodoro_logs:', err)
      }
    }

    // Fallback: calculate from localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      let sum = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(`polaris_timeboxes_${todayStr}_`)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '[]')
            if (Array.isArray(data)) {
              const taskId = key.replace(`polaris_timeboxes_${todayStr}_`, '')
              const task = tasks.find(t => t.id === taskId)
              const isQW = task ? isQuickWin(task) : false
              const chipMins = isQW ? 15 : boxMins
              sum += data.filter(Boolean).length * chipMins
            }
          } catch (e) {}
        }
      }
      setLoggedMinutesToday(sum)
    }
  }, [user?.id, todayStr, boxMins, tasks, isQuickWin])

  useEffect(() => {
    loadAliases()
    loadTimeboxes()
    refreshLoggedMinutes()
  }, [loadAliases, loadTimeboxes, refreshLoggedMinutes])

  // Classify tasks into Primaries candidates and Quick Wins
  const { candidatePrimaries, quickWins } = useMemo(() => {
    const qWins = []
    const pCandidates = []

    tasks.forEach(t => {
      if (isQuickWin(t)) {
        qWins.push(t)
      } else {
        pCandidates.push(t)
      }
    })

    // Sort candidate primaries:
    // Respect saved local reorder order if present
    let savedOrder = []
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`polaris_today_order_${todayStr}`)
        if (raw) savedOrder = JSON.parse(raw)
      } catch (e) {}
    }

    pCandidates.sort((a, b) => {
      const idxA = savedOrder.indexOf(a.id)
      const idxB = savedOrder.indexOf(b.id)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1

      // If not in savedOrder, prioritize incomplete tasks first
      if (a.completed && !b.completed) return 1
      if (!a.completed && b.completed) return -1

      // Priority criteria: deadline = today, quadrant = urgent_important, parent tasks
      const priorityA = (a.deadline === todayStr ? 10 : 0) + (a.quadrant === 'urgent_important' ? 5 : 0) + (a.subtasks_total > 0 ? 3 : 0)
      const priorityB = (b.deadline === todayStr ? 10 : 0) + (b.quadrant === 'urgent_important' ? 5 : 0) + (b.subtasks_total > 0 ? 3 : 0)
      if (priorityA !== priorityB) return priorityB - priorityA

      const orderA = a.sort_order != null ? a.sort_order : Infinity
      const orderB = b.sort_order != null ? b.sort_order : Infinity
      if (orderA !== orderB) return orderA - orderB

      return 0
    })

    return { candidatePrimaries: pCandidates, quickWins: qWins }
  }, [tasks, isQuickWin, todayStr])

  // Sync primaries state with top 3 candidate primaries
  useEffect(() => {
    const top3 = candidatePrimaries.slice(0, 3)
    setPrimaries(top3)
  }, [candidatePrimaries])

  // Drag and drop reordering handler
  const handleReorder = (newOrder) => {
    setPrimaries(newOrder)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const ids = newOrder.map(t => t.id)
        localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(ids))
      } catch (e) {}
    }

    newOrder.forEach((task, index) => {
      if (updateSortOrder && task.id) {
        updateSortOrder(task.id, index)
      }
    })
  }

  // Start inline editing for cosmetic day slice
  const startEditing = (task) => {
    setEditingTaskId(task.id)
    setEditAliasValue(dayAliases[task.id] || task.title)
  }

  // Save cosmetic day slice (localStorage only, database title remains untouched)
  const saveAlias = (taskId, canonicalTitle) => {
    const trimmed = editAliasValue.trim()
    if (!trimmed || trimmed === canonicalTitle) {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(`polaris_day_alias_${todayStr}_${taskId}`)
      }
      setDayAliases(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
    } else {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(`polaris_day_alias_${todayStr}_${taskId}`, trimmed)
      }
      setDayAliases(prev => ({ ...prev, [taskId]: trimmed }))
    }
    setEditingTaskId(null)
  }

  // Timebox chip click handler
  const handleChipClick = async (task, chipIdx, chipMinutes = boxMins) => {
    const currentList = timeboxesMap[task.id] || []
    if (currentList[chipIdx]) return // Already marked complete

    const nextList = [...currentList]
    nextList[chipIdx] = true

    // Save chip state in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`polaris_timeboxes_${todayStr}_${task.id}`, JSON.stringify(nextList))
      } catch (e) {}
    }

    setTimeboxesMap(prev => ({ ...prev, [task.id]: nextList }))
    setLoggedMinutesToday(prev => prev + chipMinutes)

    // Sound chime and XP reward
    playChime('success')
    if (trackXP) {
      trackXP(false, true, 10)
    }

    // Insert completed focus block into pomodoro_logs
    if (user?.id) {
      const displayTitle = dayAliases[task.id] || task.title
      try {
        await offlineInsert('pomodoro_logs', {
          user_id: user.id,
          date: todayStr,
          duration_minutes: chipMinutes,
          label: displayTitle,
          created_at: new Date().toISOString()
        })
      } catch (err) {
        console.warn('Error inserting pomodoro_logs:', err)
      }
    }
  }

  // Quick add task submit
  const handleQuickAdd = async (e) => {
    e?.preventDefault()
    if (!quickTitle.trim()) return
    await addTask(quickTitle.trim())
    setQuickTitle('')
    setQuickAddOpen(false)
  }

  return (
    <div className={`glass bg-void/70 border border-amber-500/30 rounded-xl p-5 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-pulsar/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-bold text-starlight">Today's Agenda</h3>
              <span className="text-xs font-mono text-nova/60">({formattedToday})</span>
            </div>
            <p className="text-xs font-body text-nova/60">Top 3 daily priorities and passive focus tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Focus minutes counter */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono"
            title="Total focus minutes logged today"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{loggedMinutesToday}m logged</span>
          </div>

          {/* Timebox size toggle [15m | 30m] */}
          <div className="flex items-center bg-void/80 border border-pulsar/30 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => handleTimeboxModeChange('15')}
              className={`px-2 py-0.5 rounded transition-colors ${
                timeboxMode === '15'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-nova/60 hover:text-starlight'
              }`}
            >
              15m
            </button>
            <button
              onClick={() => handleTimeboxModeChange('30')}
              className={`px-2 py-0.5 rounded transition-colors ${
                timeboxMode === '30'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                  : 'text-nova/60 hover:text-starlight'
              }`}
            >
              30m
            </button>
          </div>

          {/* Quick add toggle */}
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="p-1.5 rounded-lg bg-pulsar/10 border border-pulsar/30 hover:border-amber-500/30 text-nova/70 hover:text-amber-400 transition-colors"
            title="Add task for today"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Add Input Bar */}
      {quickAddOpen && (
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 p-2 bg-void/60 border border-amber-500/20 rounded-lg">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add task for today..."
            autoFocus
            className="flex-1 bg-transparent border-none text-sm text-starlight placeholder-nova/40 focus:outline-none px-2 font-body"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuickAddOpen(false)
            }}
          />
          <button
            type="submit"
            disabled={!quickTitle.trim()}
            className="px-3 py-1 text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded transition-colors disabled:opacity-40"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            className="p-1 text-nova/50 hover:text-starlight transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Primaries Section (Max 3) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-nova/60 uppercase tracking-wider px-1">
          <span>Primaries ({primaries.length}/3 max)</span>
          <span className="text-[11px] normal-case text-nova/40">Drag to reorder priorities</span>
        </div>

        {isLoading ? (
          <div className="text-xs font-mono text-nova/40 italic p-4 text-center">Loading priorities...</div>
        ) : primaries.length === 0 ? (
          <div className="text-xs font-mono text-nova/50 italic p-4 rounded-lg bg-void/40 border border-pulsar/20 text-center">
            No primary tasks active for today. Add one above or assign tasks in the Matrix.
          </div>
        ) : (
          <Reorder.Group axis="y" values={primaries} onReorder={handleReorder} className="space-y-2.5">
            {primaries.map((task) => {
              const displayTitle = dayAliases[task.id] || task.title
              const isAliased = Boolean(dayAliases[task.id] && dayAliases[task.id] !== task.title)
              const totalMins = task.estimated_minutes || task.time_estimate_minutes || (boxMins * 2)
              const chipCount = Math.max(1, Math.min(8, Math.ceil(totalMins / boxMins)))
              const taskBoxes = timeboxesMap[task.id] || []

              return (
                <Reorder.Item
                  key={task.id}
                  value={task}
                  className="group relative glass bg-void/60 border border-pulsar/30 hover:border-amber-500/30 rounded-xl p-3.5 space-y-2.5 transition-colors"
                >
                  {/* Top line: Drag handle, badges */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="cursor-grab active:cursor-grabbing p-0.5 text-nova/40 hover:text-amber-400">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Parent / Subtask Badge */}
                      {task.subtasks_total > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Layers className="w-3 h-3" />
                          Parent ({task.subtasks_completed}/{task.subtasks_total} done)
                        </span>
                      )}

                      {task.parent_task_id && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-pulsar/20 text-nova/80 border border-pulsar/30">
                          <FolderGit2 className="w-3 h-3" />
                          Subtask of: {task.parent_title || 'Parent Task'}
                        </span>
                      )}

                      {task.quadrant === 'urgent_important' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          Q1
                        </span>
                      )}

                      {task.deadline === todayStr && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Due Today
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle row: Title & Task completion */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editAliasValue}
                            onChange={(e) => setEditAliasValue(e.target.value)}
                            onBlur={() => saveAlias(task.id, task.title)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveAlias(task.id, task.title)
                              if (e.key === 'Escape') setEditingTaskId(null)
                            }}
                            autoFocus
                            className="flex-1 bg-void/90 border border-amber-500/50 rounded px-2 py-1 text-sm text-starlight focus:outline-none font-body"
                          />
                          <button
                            onMouseDown={() => saveAlias(task.id, task.title)}
                            className="p-1 text-amber-400 hover:text-amber-300"
                            title="Save Day Slice"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            onClick={() => startEditing(task)}
                            className={`text-sm font-body font-medium cursor-pointer hover:text-amber-300 transition-colors truncate ${
                              task.completed ? 'line-through text-nova/40' : 'text-starlight'
                            }`}
                            title="Click to rename for today"
                          >
                            {displayTitle}
                          </span>
                          {isAliased && (
                            <span className="text-[10px] font-mono text-amber-400/70 italic shrink-0">
                              (day slice)
                            </span>
                          )}
                          <button
                            onClick={() => startEditing(task)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-nova/40 hover:text-amber-400 transition-opacity"
                            title="Rename for today"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Circular completion button */}
                    <button
                      onClick={(e) => toggleComplete(task, e)}
                      className="shrink-0 p-1 text-nova/40 hover:text-amber-400 transition-colors"
                      title={task.completed ? 'Mark active' : 'Mark completed'}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-amber-400 fill-amber-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-nova/40 hover:text-amber-400" />
                      )}
                    </button>
                  </div>

                  {/* Bottom row: Timebox chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-mono text-nova/40 mr-1">Timeblocks:</span>
                    {Array.from({ length: chipCount }).map((_, idx) => {
                      const isChecked = Boolean(taskBoxes[idx])
                      return (
                        <button
                          key={idx}
                          onClick={() => handleChipClick(task, idx)}
                          disabled={isChecked}
                          className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors flex items-center gap-1 ${
                            isChecked
                              ? 'bg-amber-500/30 border-amber-500/60 text-amber-300 cursor-default'
                              : 'bg-void/50 border-pulsar/40 text-nova/70 hover:border-amber-500/40 hover:text-starlight cursor-pointer'
                          }`}
                          title={
                            isChecked
                              ? `Completed ${boxMins}m focus session`
                              : `Click to log completed ${boxMins}m focus block`
                          }
                        >
                          {isChecked && <Check className="w-3 h-3 text-amber-400" />}
                          <span>{boxMins}m</span>
                        </button>
                      )
                    })}
                  </div>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}
      </div>

      {/* Quick Wins Collapsible Section */}
      <div className="border-t border-pulsar/20 pt-3">
        <button
          onClick={() => setShowQuickWins(!showQuickWins)}
          className="flex items-center justify-between w-full text-xs font-mono uppercase tracking-wider text-nova/60 hover:text-amber-400 transition-colors py-1"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Wins ({quickWins.length})
          </span>
          {showQuickWins ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showQuickWins && (
          <div className="space-y-2 pt-2">
            {quickWins.length === 0 ? (
              <p className="text-xs font-mono text-nova/40 italic px-1">No low-effort quick wins for today.</p>
            ) : (
              quickWins.map((task) => {
                const displayTitle = dayAliases[task.id] || task.title
                const isChecked = Boolean(timeboxesMap[task.id]?.[0])

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-void/40 border border-pulsar/20 hover:border-amber-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className={`text-xs font-body truncate ${
                          task.completed ? 'line-through text-nova/40' : 'text-starlight'
                        }`}
                      >
                        {displayTitle}
                      </span>
                      {task.parent_task_id && (
                        <span className="text-[10px] font-mono text-nova/50 shrink-0">
                          (subtask)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Single 15m timebox chip */}
                      <button
                        onClick={() => handleChipClick(task, 0, 15)}
                        disabled={isChecked}
                        className={`px-1.5 py-0.5 text-[11px] font-mono rounded border transition-colors flex items-center gap-1 ${
                          isChecked
                            ? 'bg-amber-500/30 border-amber-500/60 text-amber-300 cursor-default'
                            : 'bg-void/50 border-pulsar/40 text-nova/70 hover:border-amber-500/40 hover:text-starlight cursor-pointer'
                        }`}
                        title={isChecked ? '15m focus logged' : 'Log 15m quick focus'}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 text-amber-400" />}
                        <span>15m</span>
                      </button>

                      {/* Circular completion button */}
                      <button
                        onClick={(e) => toggleComplete(task, e)}
                        className="p-1 text-nova/40 hover:text-amber-400 transition-colors"
                        title={task.completed ? 'Mark active' : 'Mark completed'}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 fill-amber-500/20" />
                        ) : (
                          <Circle className="w-4 h-4 text-nova/40 hover:text-amber-400" />
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
