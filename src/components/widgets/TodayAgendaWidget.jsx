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
  Minus,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Layers,
  FolderGit2,
  Target,
  Search,
  CornerDownRight
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTodaysTasks } from '../../hooks/useTodaysTasks'
import { playChime } from '../../lib/sound'
import { offlineInsert, offlineSelect } from '../../lib/offlineApi'
import {
  DEFAULT_AUDIT_PRIMARIES,
  getAuditRank,
  getStoredAuditList,
  sortCandidatePrimaries,
  buildAlignedOrder
} from '../../lib/agendaPrioritizer'

// Re-export for backward compatibility
export { DEFAULT_AUDIT_PRIMARIES, getAuditRank } from '../../lib/agendaPrioritizer'

export default function TodayAgendaWidget({ className = '' }) {
  const { user, trackXP } = useAuth()
  const {
    tasks,
    allBacklogTasks = [],
    isLoading,
    toggleComplete,
    addTask,
    addSubtask,
    attachSubtask,
    updateSortOrder
  } = useTodaysTasks()

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

  // Multi-stream tracks per task: { [taskId]: [ { id, name, count, boxes: [boolean] }, ... ] }
  const [taskTracksMap, setTaskTracksMap] = useState({})

  // Total focus minutes logged today
  const [loggedMinutesToday, setLoggedMinutesToday] = useState(0)

  // Quick Add task input state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')

  // Quick Wins collapsible section
  const [showQuickWins, setShowQuickWins] = useState(false)

  // Primaries state for Framer Motion Reorder
  const [primaries, setPrimaries] = useState([])

  // Subtask search popover state
  const [subtaskTargetTask, setSubtaskTargetTask] = useState(null)
  const [subtaskSearchQuery, setSubtaskSearchQuery] = useState('')
  const [newSubtaskInput, setNewSubtaskInput] = useState('')

  // Inline stream adding state: { [taskId]: boolean }
  const [addingStreamForTask, setAddingStreamForTask] = useState(null)
  const [newStreamName, setNewStreamName] = useState('')

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

  // Helper: check if a task is a Quick Win
  const isQuickWin = useCallback((t) => {
    if (t.subtasks_total && t.subtasks_total > 0) return false
    const mins = t.estimated_minutes || t.time_estimate_minutes
    return t.mental_load === 'low' || (mins != null && mins > 0 && mins <= 15)
  }, [])

  // Load timeboxes and multi-tracks from localStorage
  const loadTimeboxesAndTracks = useCallback(() => {
    if (typeof window === 'undefined' || !window.localStorage) return
    const tMap = {}
    const trMap = {}

    tasks.forEach(t => {
      // 1. Raw timeboxes array
      try {
        const raw = localStorage.getItem(`polaris_timeboxes_${todayStr}_${t.id}`)
        if (raw) tMap[t.id] = JSON.parse(raw)
      } catch (e) {}

      // 2. Structured tracks
      try {
        const rawTracks = localStorage.getItem(`polaris_tracks_${todayStr}_${t.id}`)
        if (rawTracks) {
          trMap[t.id] = JSON.parse(rawTracks)
        } else {
          // Initialize default tracks based on task type / notes
          const title = (t.title || '').toLowerCase()
          const totalMins = t.estimated_minutes || t.time_estimate_minutes || (boxMins * 2)
          const defCount = Math.max(1, Math.min(8, Math.ceil(totalMins / boxMins)))
          const existingBoxes = tMap[t.id] || []

          if (/cold\s*mail|outreach|email\s*outreach/i.test(title)) {
            trMap[t.id] = [
              { id: 'draft', name: 'draft', count: 3, boxes: existingBoxes.slice(0, 3) },
              { id: 'sche', name: 'sche', count: 3, boxes: existingBoxes.slice(3, 6) }
            ]
          } else {
            const isCountMode = /(\b\d+\b|sketches|sketch|papers|paper|articles|calls|items)\b/i.test(title)
            trMap[t.id] = [
              {
                id: 'default',
                name: isCountMode ? 'count' : `${boxMins}m units`,
                count: defCount,
                boxes: existingBoxes
              }
            ]
          }
        }
      } catch (e2) {}
    })

    setTimeboxesMap(tMap)
    setTaskTracksMap(trMap)
  }, [tasks, todayStr, boxMins])

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
    loadTimeboxesAndTracks()
    refreshLoggedMinutes()
  }, [loadAliases, loadTimeboxesAndTracks, refreshLoggedMinutes])

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

    // Sort candidate primaries via extracted domain module
    let savedOrder = []
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`polaris_today_order_${todayStr}`)
        if (raw) savedOrder = JSON.parse(raw)
      } catch (e) {}
    }

    const auditList = getStoredAuditList(todayStr)
    const sortedPrimaries = sortCandidatePrimaries(pCandidates, { savedOrder, auditList, todayStr })

    return { candidatePrimaries: sortedPrimaries, quickWins: qWins }
  }, [tasks, isQuickWin, todayStr])

  // Sync primaries state with top 3 candidate primaries
  useEffect(() => {
    const top3 = candidatePrimaries.slice(0, 3)
    setPrimaries(top3)
  }, [candidatePrimaries])

  // Feedback state for Align Audit button
  const [alignedFeedback, setAlignedFeedback] = useState(false)

  // Align priorities with Daily Task Audit
  const handleAlignAudit = useCallback(() => {
    const auditList = getStoredAuditList(todayStr)
    const orderedTasks = buildAlignedOrder(tasks, candidatePrimaries, auditList)

    const newIds = orderedTasks.map(t => t.id)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(newIds))
      } catch (e) {}
    }

    setPrimaries(orderedTasks)

    orderedTasks.forEach((task, index) => {
      if (updateSortOrder && task.id) {
        updateSortOrder(task.id, index)
      }
    })

    setAlignedFeedback(true)
    setTimeout(() => setAlignedFeedback(false), 2000)

    playChime('success')
  }, [tasks, candidatePrimaries, todayStr, updateSortOrder])

  // Lock primaries into saved order on completion toggle
  const toggleTaskComplete = async (task, e) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(`polaris_today_order_${todayStr}`)
        if (!raw && primaries.length > 0) {
          const ids = primaries.map(t => t.id)
          localStorage.setItem(`polaris_today_order_${todayStr}`, JSON.stringify(ids))
        }
      } catch (e2) {}
    }
    await toggleComplete(task, e)
  }

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

  // Save cosmetic day slice
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

  // Tactile Tally Box click handler (toggle checked/unchecked with 15m focus log)
  const handleChipClick = async (task, chipIdx, chipMinutes = boxMins, trackId = null) => {
    const currentList = timeboxesMap[task.id] || []
    const isAlreadyChecked = Boolean(currentList[chipIdx])
    const nextChecked = !isAlreadyChecked

    const nextList = [...currentList]
    nextList[chipIdx] = nextChecked

    // Save in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`polaris_timeboxes_${todayStr}_${task.id}`, JSON.stringify(nextList))
      } catch (e) {}
    }

    setTimeboxesMap(prev => ({ ...prev, [task.id]: nextList }))

    // Also update structured track state if trackId exists
    if (trackId && taskTracksMap[task.id]) {
      const updatedTracks = taskTracksMap[task.id].map(tr => {
        if (tr.id === trackId) {
          const tBoxes = [...(tr.boxes || [])]
          tBoxes[chipIdx] = nextChecked
          return { ...tr, boxes: tBoxes }
        }
        return tr
      })
      setTaskTracksMap(prev => ({ ...prev, [task.id]: updatedTracks }))
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updatedTracks))
        } catch (e) {}
      }
    }

    if (nextChecked) {
      setLoggedMinutesToday(prev => prev + chipMinutes)
      playChime('success')
      if (trackXP) {
        trackXP(false, true, 10)
      }

      // Log to pomodoro_logs
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
    } else {
      setLoggedMinutesToday(prev => Math.max(0, prev - chipMinutes))
    }
  }

  // Adjust box count on a track (+ or -)
  const handleAdjustBoxCount = (task, trackId, delta) => {
    const tracks = taskTracksMap[task.id] || []
    const updated = tracks.map(tr => {
      if (tr.id === trackId) {
        const newCount = Math.max(1, Math.min(12, (tr.count || 3) + delta))
        return { ...tr, count: newCount }
      }
      return tr
    })
    setTaskTracksMap(prev => ({ ...prev, [task.id]: updated }))
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updated))
      } catch (e) {}
    }
  }

  // Add a new sub-track to a task (e.g., 'sche', 'review')
  const handleAddTrack = (task) => {
    if (!newStreamName.trim()) return
    const tracks = taskTracksMap[task.id] || []
    const newTrack = {
      id: `track-${Date.now()}`,
      name: newStreamName.trim().toLowerCase(),
      count: 3,
      boxes: []
    }
    const updated = [...tracks, newTrack]
    setTaskTracksMap(prev => ({ ...prev, [task.id]: updated }))
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(`polaris_tracks_${todayStr}_${task.id}`, JSON.stringify(updated))
      } catch (e) {}
    }
    setNewStreamName('')
    setAddingStreamForTask(null)
  }

  // Quick add task submit
  const handleQuickAdd = async (e) => {
    e?.preventDefault()
    if (!quickTitle.trim()) return
    await addTask(quickTitle.trim())
    setQuickTitle('')
    setQuickAddOpen(false)
  }

  // Quick create or attach subtask
  const handleCreateSubtask = async (e) => {
    e?.preventDefault()
    if (!subtaskTargetTask || !newSubtaskInput.trim()) return
    if (addSubtask) {
      await addSubtask(subtaskTargetTask.id, newSubtaskInput.trim())
    }
    setNewSubtaskInput('')
    setSubtaskTargetTask(null)
  }

  const handleAttachExistingSubtask = async (existingTask) => {
    if (!subtaskTargetTask || !existingTask) return
    if (attachSubtask) {
      await attachSubtask(existingTask.id, subtaskTargetTask.id)
    }
    setSubtaskTargetTask(null)
  }

  // Filtered backlog for subtask search
  const filteredBacklog = useMemo(() => {
    if (!subtaskSearchQuery.trim()) return []
    const q = subtaskSearchQuery.toLowerCase()
    return allBacklogTasks.filter(t => {
      if (t.id === subtaskTargetTask?.id) return false
      return (t.title || '').toLowerCase().includes(q)
    }).slice(0, 5)
  }, [allBacklogTasks, subtaskSearchQuery, subtaskTargetTask])

  // Day Completion Progress calculation
  const totalPrimaries = primaries.length
  const completedPrimaries = primaries.filter(t => t.completed).length
  const primaryPercentage = totalPrimaries > 0 ? Math.round((completedPrimaries / totalPrimaries) * 100) : 0
  const primariesTarget = totalPrimaries > 0 ? totalPrimaries : 3

  const totalAgendaCount = tasks.length
  const completedAgendaCount = tasks.filter(t => t.completed).length

  return (
    <div className={`glass bg-void/70 border border-amber-500/30 rounded-xl p-5 space-y-4 ${className}`}>
      {/* Conversational Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-pulsar/30 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-sky-400 tracking-wide select-none">
              what would I like to do today?
            </h2>
            <span className="text-xs font-mono text-nova/60">({formattedToday})</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
              Today's Agenda
            </span>
          </div>
          <p className="text-xs font-body text-nova/60">Linear Focus Runway & Tactile 15m Micro-Tracking</p>
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

          {/* Align Audit button */}
          <button
            onClick={handleAlignAudit}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              alignedFeedback
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                : 'bg-void/80 hover:bg-amber-500/10 border-pulsar/30 hover:border-amber-500/40 text-nova/70 hover:text-amber-400'
            }`}
            title="Align priorities with Daily Task Audit"
            aria-label="Align Audit"
          >
            <Target className="w-3.5 h-3.5 text-amber-400" />
            <span>{alignedFeedback ? 'Aligned!' : 'Align Audit'}</span>
          </button>

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

      {/* Day Completion Progress Bar */}
      <div className="p-3.5 rounded-xl bg-void/60 border border-pulsar/30 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
          <span className="text-starlight font-bold tracking-wide">
            {completedPrimaries} of {primariesTarget} Primaries Cleared • {primaryPercentage}%
          </span>
          <span className="text-nova/70 flex items-center gap-1.5 flex-wrap">
            <span>{completedAgendaCount}/{totalAgendaCount} total agenda items done</span>
            <span className="text-nova/40">•</span>
            <span className="text-amber-400/90 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{loggedMinutesToday}m logged</span>
            </span>
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Day Completion Progress"
          aria-valuenow={primaryPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
          className="w-full h-5 sm:h-6 bg-void/90 rounded-full border border-amber-500/40 p-0.5 relative overflow-hidden shadow-inner"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-[10px] font-mono font-bold text-void select-none ${
              primaryPercentage === 100
                ? 'bg-emerald-400 shadow-[0_0_15px_#10b981,0_0_30px_rgba(16,185,129,0.7)] animate-pulse'
                : primaryPercentage > 0
                ? 'bg-amber-400 shadow-[0_0_15px_#f59e0b,0_0_30px_rgba(245,158,11,0.7)] animate-pulse'
                : 'bg-transparent'
            }`}
            style={{ width: `${primaryPercentage}%` }}
          >
            {primaryPercentage >= 15 && (
              <span className="drop-shadow-sm font-bold tracking-wider">
                {primaryPercentage}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primaries Section (Max 3 Runway) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-nova/60 uppercase tracking-wider px-1">
          <span>Primaries ({primaries.length}/3 max)</span>
          <span className="text-[11px] normal-case text-nova/40">Drag to reorder daily runway</span>
        </div>

        {isLoading ? (
          <div className="text-xs font-mono text-nova/40 italic p-4 text-center">Loading priorities...</div>
        ) : primaries.length === 0 ? (
          <div className="text-xs font-mono text-nova/50 italic p-4 rounded-lg bg-void/40 border border-pulsar/20 text-center">
            No primary tasks active for today. Add one above or assign tasks in the Matrix.
          </div>
        ) : (
          <Reorder.Group axis="y" values={primaries} onReorder={handleReorder} className="space-y-3">
            {primaries.map((task) => {
              const displayTitle = dayAliases[task.id] || task.title
              const isAliased = Boolean(dayAliases[task.id] && dayAliases[task.id] !== task.title)
              const totalMins = task.estimated_minutes || task.time_estimate_minutes || (boxMins * 2)
              const chipCount = Math.max(1, Math.min(8, Math.ceil(totalMins / boxMins)))
              const taskBoxes = timeboxesMap[task.id] || []
              const tracks = taskTracksMap[task.id] || [
                { id: 'default', name: '15m blocks', count: chipCount, boxes: taskBoxes }
              ]
              const childSubtasks = tasks
                .filter(t => t.parent_task_id === task.id && !primaries.some(p => p.id === t.id))
                .sort((a, b) => {
                  const rawA = a.raw || a
                  const rawB = b.raw || b
                  const posA = rawA.position != null ? rawA.position : Infinity
                  const posB = rawB.position != null ? rawB.position : Infinity
                  if (posA !== posB) return posA - posB
                  const dateA = rawA.created_at ? new Date(rawA.created_at).getTime() : 0
                  const dateB = rawB.created_at ? new Date(rawB.created_at).getTime() : 0
                  if (dateA !== dateB) return dateA - dateB
                  return String(a.id || '').localeCompare(String(b.id || ''))
                })

              return (
                <Reorder.Item
                  key={task.id}
                  value={task}
                  className="group relative glass bg-void/60 border border-pulsar/30 hover:border-amber-500/30 rounded-xl p-3.5 space-y-3 transition-colors"
                >
                  {/* Top metadata line: Drag handle, Badges, Search Subtask button */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="cursor-grab active:cursor-grabbing p-0.5 text-nova/40 hover:text-amber-400">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Parent / Subtask Badge */}
                      {task.subtasks_total > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <Layers className="w-3 h-3 shrink-0" />
                          <span>Parent ({task.subtasks_completed}/{task.subtasks_total} done)</span>
                          <span
                            role="progressbar"
                            aria-label="Subtask progress"
                            aria-valuenow={Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100)}
                            aria-valuemin="0"
                            aria-valuemax="100"
                            className="w-7 h-1.5 bg-void/90 border border-pulsar/40 rounded-full overflow-hidden inline-block shrink-0 ml-0.5"
                            title={`Subtasks: ${task.subtasks_completed}/${task.subtasks_total} (${Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100)}%)`}
                          >
                            <span
                              className={`block h-full transition-all duration-300 ${
                                task.subtasks_completed >= task.subtasks_total ? 'bg-emerald-400' : 'bg-amber-400'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100))}%`
                              }}
                            />
                          </span>
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

                    {/* Quick Subtask Search Trigger */}
                    <button
                      onClick={() => {
                        setSubtaskTargetTask(subtaskTargetTask?.id === task.id ? null : task)
                        setSubtaskSearchQuery('')
                        setNewSubtaskInput('')
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-nova/60 hover:text-amber-400 bg-void/80 hover:bg-amber-500/10 border border-pulsar/30 hover:border-amber-500/30 rounded transition-colors"
                      title="Quick search backlog or add subtask under this parent"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Subtask</span>
                    </button>
                  </div>

                  {/* Middle row: Large master checkbox & Task title */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {/* Left Master Square Checkbox */}
                      <button
                        onClick={(e) => toggleTaskComplete(task, e)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          task.completed
                            ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                            : 'border-purple-400/80 bg-void/80 hover:border-amber-400 text-transparent'
                        }`}
                        title={task.completed ? 'Mark active' : 'Mark completed'}
                      >
                        <Check className="w-3.5 h-3.5 font-bold" />
                      </button>

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
                              task.completed ? 'line-through text-nova/40' : 'text-purple-200'
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
                  </div>

                  {/* Multi-track Tally Boxes (The Tactile Analog Grid) */}
                  <div className="pl-7 space-y-2 pt-1 border-t border-pulsar/20">
                    {tracks.map((track) => {
                      const count = track.count || chipCount
                      const trackBoxes = track.boxes || taskBoxes

                      return (
                        <div key={track.id} className="flex items-center justify-between gap-2 flex-wrap py-0.5">
                          <div className="flex items-center gap-2 text-xs font-mono text-purple-300/90">
                            {tracks.length > 1 && <CornerDownRight className="w-3 h-3 text-purple-400/60" />}
                            <span>{track.name}:</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Connected Tally Box Strip */}
                            <div className="flex border border-purple-500/40 rounded overflow-hidden shadow-inner bg-void/90">
                              {Array.from({ length: count }).map((_, idx) => {
                                const isChecked = Boolean(trackBoxes[idx])
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleChipClick(task, idx, boxMins, track.id)}
                                    className={`w-7 h-7 flex items-center justify-center font-mono font-bold text-xs transition-colors cursor-pointer border-r border-purple-500/30 last:border-r-0 ${
                                      isChecked
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-void/60 text-transparent hover:bg-purple-500/10 hover:text-amber-400/40'
                                    }`}
                                    title={
                                      isChecked
                                        ? `Completed ${boxMins}m focus session (click to uncheck)`
                                        : `Click to log completed ${boxMins}m focus block`
                                    }
                                  >
                                    {isChecked ? '✓' : ''}
                                  </button>
                                )
                              })}
                            </div>

                            {/* + / - Tally Box count controls */}
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleAdjustBoxCount(task, track.id, 1)}
                                className="p-0.5 text-nova/40 hover:text-amber-400"
                                title="Add a tally box"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleAdjustBoxCount(task, track.id, -1)}
                                className="p-0.5 text-nova/40 hover:text-amber-400"
                                title="Remove a tally box"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Inline Stream Adder */}
                    {addingStreamForTask === task.id ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={newStreamName}
                          onChange={(e) => setNewStreamName(e.target.value)}
                          placeholder="Stream name (e.g., draft, notes, sche)..."
                          autoFocus
                          className="bg-void/90 border border-amber-500/40 rounded px-2 py-0.5 text-xs text-starlight focus:outline-none font-mono"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddTrack(task)
                            if (e.key === 'Escape') setAddingStreamForTask(null)
                          }}
                        />
                        <button
                          onClick={() => handleAddTrack(task)}
                          disabled={!newStreamName.trim()}
                          className="px-2 py-0.5 text-[11px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded disabled:opacity-40"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setAddingStreamForTask(null)}
                          className="p-0.5 text-nova/40 hover:text-starlight"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingStreamForTask(task.id)}
                        className="text-[10px] font-mono text-nova/40 hover:text-amber-400 transition-colors pt-0.5 inline-block"
                      >
                        + add micro-stream
                      </button>
                    )}
                  </div>

                  {/* Nested Child Subtasks List (if any exist) */}
                  {childSubtasks.length > 0 && (
                    <div className="pl-7 pt-2 space-y-1.5 border-t border-pulsar/20">
                      <span className="text-[10px] font-mono text-nova/50 uppercase tracking-wider block">
                        Linked Subtasks ({childSubtasks.length}):
                      </span>
                      {childSubtasks.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded bg-void/40 border border-pulsar/20 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              onClick={(e) => toggleComplete(child, e)}
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                child.completed
                                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                                  : 'border-purple-400/60 bg-transparent text-transparent hover:border-amber-400'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                            <span
                              className={`truncate ${
                                child.completed ? 'line-through text-nova/40' : 'text-starlight'
                              }`}
                            >
                              {child.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Quick Subtask Search Popover */}
                  {subtaskTargetTask?.id === task.id && (
                    <div className="mt-2 p-3 rounded-xl bg-void/95 border border-amber-500/40 shadow-2xl space-y-2.5">
                      <div className="flex items-center justify-between border-b border-pulsar/30 pb-1.5">
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5" />
                          <span>Quick Subtask for: {displayTitle}</span>
                        </span>
                        <button
                          onClick={() => setSubtaskTargetTask(null)}
                          className="p-0.5 text-nova/50 hover:text-starlight"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Search / Add input */}
                      <form onSubmit={handleCreateSubtask} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSubtaskInput}
                          onChange={(e) => {
                            setNewSubtaskInput(e.target.value)
                            setSubtaskSearchQuery(e.target.value)
                          }}
                          placeholder="Search backlog or type new subtask..."
                          autoFocus
                          className="flex-1 bg-void/80 border border-pulsar/40 rounded px-2.5 py-1 text-xs text-starlight placeholder-nova/40 focus:outline-none focus:border-amber-500/50 font-body"
                        />
                        <button
                          type="submit"
                          disabled={!newSubtaskInput.trim()}
                          className="px-3 py-1 text-xs font-mono bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded transition-colors disabled:opacity-40"
                        >
                          Create
                        </button>
                      </form>

                      {/* Search Results from Backlog */}
                      {filteredBacklog.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-mono text-nova/50 uppercase">
                            Match in Master Backlog:
                          </span>
                          <div className="space-y-1">
                            {filteredBacklog.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleAttachExistingSubtask(item)}
                                className="flex items-center justify-between p-1.5 rounded bg-void/60 hover:bg-amber-500/10 border border-pulsar/20 hover:border-amber-500/30 cursor-pointer text-xs transition-colors"
                              >
                                <span className="text-starlight truncate">{item.title}</span>
                                <span className="text-[10px] font-mono text-amber-400/80 shrink-0">
                                  + Link
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        )}
      </div>

      {/* Bottom Legend (matching your hand-drawn notebook sketch) */}
      <div className="pt-2 flex items-center justify-between border-t border-pulsar/20 text-xs font-mono flex-wrap gap-2">
        <span className="text-amber-400/90 font-mono text-xs">
          [each box is 15min or 1 count]
        </span>
        <button
          onClick={() => setShowQuickWins(!showQuickWins)}
          className="text-nova/60 hover:text-amber-400 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Wins ({quickWins.length})</span>
          {showQuickWins ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick Wins Collapsible Section */}
      {showQuickWins && (
        <div className="space-y-2 pt-1 border-t border-pulsar/10">
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
  )
}
