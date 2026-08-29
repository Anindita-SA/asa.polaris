import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useTodaysTasks } from '../../hooks/useTodaysTasks'
import { Settings, X, Maximize2, Minimize2, RotateCcw, ChevronDown, ChevronUp, Music, CheckCircle2, Target } from 'lucide-react'

import Starfield from '../layout/Starfield'

const MODE_CONFIG = {
  focus: { label: 'Pomodoro', default: 25, color: '#3b82f6' },
  short: { label: 'Short Break', default: 5, color: '#10b981' },
  long: { label: 'Long Break', default: 15, color: '#8b5cf6' },
}

const AMBIENT_TRACKS = [
  { name: 'Lofi', url: 'https://www.youtube.com/embed/jfKfPfyJRdk' },
  { name: 'Rain', url: 'https://www.youtube.com/embed/mPZkdNFkNps' },
  { name: 'White Noise', url: 'https://www.youtube.com/embed/nMfPqeZjc2c' },
  { name: 'Space Ambient', url: 'https://www.youtube.com/embed/nCnjCGK-DTA' }
]

const POMODORO_STORAGE_KEY = 'polaris_pomodoro_state'
const loadSavedState = () => {
  try {
    const s = localStorage.getItem(POMODORO_STORAGE_KEY)
    if (s) {
      const parsed = JSON.parse(s)
      if (parsed.isRunning && parsed.lastTick) {
        const elapsedSecs = Math.floor((Date.now() - parsed.lastTick) / 1000)
        parsed.timeLeft = Math.max(0, parsed.timeLeft - elapsedSecs)
        // Let the component handle completion so stats are saved
      }
      return parsed
    }
  } catch (e) { console.error('Failed to load pomodoro state', e) }
  return null
}

let cachedState = null
const getInitialState = () => {
  if (cachedState) return cachedState
  cachedState = loadSavedState() || {}
  return cachedState
}

const inferIO = (task) => {
  if (!task) return 'input'
  const title = (task.title || '').toLowerCase()
  const notes = (task.raw?.notes || '').toLowerCase()
  if (notes.includes('[output]')) return 'output'
  if (notes.includes('[input]')) return 'input'
  if (title.match(/(read|study|learn|research|review|watch|listen|analyze|inspect|notes)/)) return 'input'
  if (title.match(/(write|code|build|create|print|report|draft|design|submit|make|draw|schematic|pcb|summary)/)) return 'output'
  return 'input'
}

const PomodoroTimer = ({ mobilePill = false }) => {
  const { user, addXP } = useAuth()
  const { tasks: todaysTasks, toggleComplete: toggleTaskComplete } = useTodaysTasks()
  
  const [mode, setMode] = useState(() => getInitialState().mode || 'focus')
  const [isRunning, setIsRunning] = useState(() => getInitialState().isRunning || false)
  const [autoRestart, setAutoRestart] = useState(() => getInitialState().autoRestart || false)
  const [isExpanded, setIsExpanded] = useState(() => getInitialState().isExpanded || false)
  const [showSettings, setShowSettings] = useState(false)
  const [durations, setDurations] = useState(() => getInitialState().durations || { focus: 25, short: 5, long: 15 })
  const [timeLeft, setTimeLeft] = useState(() => {
    const s = getInitialState()
    if (s.timeLeft !== undefined) return s.timeLeft
    return (getInitialState().durations?.focus || 25) * 60
  })

  const [ioType, setIoType] = useState(() => localStorage.getItem('polaris_pomo_iotype') || 'input')
  const [comment, setComment] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [nodes, setNodes] = useState([])
  const [linkedItem, setLinkedItem] = useState('')
  const [goals, setGoals] = useState([])
  const [linkedGoal, setLinkedGoal] = useState('')

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('polaris_pomo_collapsed') === 'true'
  })
  const [sessionStart, setSessionStart] = useState(() => {
    const s = getInitialState()
    if (s.isRunning) {
      const restoredTimeLeft = s.timeLeft || 0
      const totalSecs = ((s.durations && s.durations[s.mode || 'focus']) || 25) * 60
      return Date.now() - ((totalSecs - restoredTimeLeft) * 1000)
    }
    return null
  })
  
  // Ambient Audio state
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [trackIndex, setTrackIndex] = useState(0)

  const widgetRef = useRef(null)

  const [matrixTasks, setMatrixTasks] = useState([])

  useEffect(() => {
    if (!user) return
    supabase.from('nodes').select('id, title').eq('user_id', user.id).then(({ data }) => {
      if (data) setNodes(data)
    })
    supabase.from('goals').select('id, title, current, target, unit, completed').eq('user_id', user.id).eq('completed', false).then(({ data }) => {
      if (data) setGoals(data)
    })

    const fetchMatrixTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .not('quadrant', 'is', null)
      if (data) {
        setMatrixTasks(data.map(t => ({ ...t, completed: t.status === 'done' })))
      }
    }
    fetchMatrixTasks()
    
    const channelName = `pomodoro-tasks-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchMatrixTasks()
      }).subscribe()
      
    return () => supabase.removeChannel(channel)
  }, [user])

  // Persistence effect
  useEffect(() => {
    const stateToSave = {
      mode,
      isRunning,
      autoRestart,
      isExpanded,
      durations,
      timeLeft,
      lastTick: Date.now()
    }
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(stateToSave))
  }, [mode, isRunning, autoRestart, isExpanded, durations, timeLeft])

  const taskGroups = useMemo(() => {
    const curated = todaysTasks || []
    const curatedIds = new Set(curated.map(t => t.id))
    const remainingMatrix = matrixTasks.filter(t => !curatedIds.has(t.id))
    
    const q1 = remainingMatrix.filter(t => t.quadrant === 'urgent_important')
    const q2 = remainingMatrix.filter(t => t.quadrant === 'important_not_urgent')
    const q3 = remainingMatrix.filter(t => t.quadrant === 'urgent_not_important')
    const q4 = remainingMatrix.filter(t => t.quadrant === 'neither')
    
    return [
      { label: "🎯 Today's Curated", tasks: curated },
      { label: "🔥 Urgent & Important (Q1)", tasks: q1 },
      { label: "🎯 Important, Not Urgent (Q2)", tasks: q2 },
      { label: "⚡ Urgent, Not Important (Q3)", tasks: q3 },
      { label: "📦 Backburner (Q4)", tasks: q4 }
    ].filter(g => g.tasks.length > 0)
  }, [todaysTasks, matrixTasks])

  const currentTask = useMemo(() => {
    return todaysTasks.find(t => t.id === selectedTaskId) || matrixTasks.find(t => t.id === selectedTaskId)
  }, [todaysTasks, matrixTasks, selectedTaskId])

  const handleSelectTodayTask = (taskId) => {
    setSelectedTaskId(taskId)
    const task = todaysTasks.find(t => t.id === taskId) || matrixTasks.find(t => t.id === taskId)
    if (task) {
      setComment(task.title)
      const inferred = inferIO(task)
      setIoType(inferred)
      localStorage.setItem('polaris_pomo_iotype', inferred)
    }
  }

  const totalSeconds = (durations[mode] || 25) * 60
  const color = MODE_CONFIG[mode]?.color || '#3b82f6'

  // Timer Tick Effect (Absolute Time)
  useEffect(() => {
    if (!isRunning || !sessionStart) return
    const timer = setInterval(() => {
      const elapsedSecs = Math.floor((Date.now() - sessionStart) / 1000)
      const targetDuration = durations[mode] * 60
      const newTimeLeft = Math.max(0, targetDuration - elapsedSecs)
      setTimeLeft(newTimeLeft)
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, sessionStart, mode, durations])

  // Service Worker Alarm Integration
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'POMODORO_START',
          taskName: currentTask ? currentTask.title : 'Focus Session',
          durationMs: timeLeft * 1000
        })
      }
    } else {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'POMODORO_STOP'
        })
      }
    }
  }, [isRunning, currentTask])

  // Timer Completion Effect
  useEffect(() => {
    if (timeLeft === 0 && isRunning) {
      setIsRunning(false)
      const sound = new Audio('/chime.mp3')
      sound.play().catch(() => {})

      if (mode === 'focus' && user?.id) {
        const mins = durations.focus
        const xpEarned = Math.round(mins * 0.8)
        if (addXP) addXP(xpEarned)

        const finalTitle = comment || linkedItem || (currentTask ? currentTask.title : 'Focus Session')

        supabase.from('focus_sessions').insert({
          user_id: user.id,
          duration_minutes: mins,
          mode: 'focus',
          io_type: ioType,
          comment: finalTitle,
          node_title: linkedItem || null,
          goal_id: linkedGoal || null,
          created_at: new Date().toISOString()
        }).then()

        // Sync with IO Tracker automatically
        supabase.from('io_logs').insert({
          user_id: user.id,
          type: ioType,
          category: ioType === 'input' ? 'reading' : 'creating',
          minutes: mins,
          date: new Date().toISOString().slice(0, 10)
        }).then()
      }

      if (autoRestart) {
        const next = mode === 'focus' ? 'short' : 'focus'
        setMode(next)
        setTimeLeft(durations[next] * 60)
        setSessionStart(Date.now())
        setIsRunning(true)
      }
    }
  }, [timeLeft, isRunning, mode, durations, linkedItem, comment, user?.id, ioType, autoRestart, addXP, currentTask])

  const prevModeRef = useRef(mode)
  useEffect(() => {
    if (prevModeRef.current === mode) return
    prevModeRef.current = mode
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
    setSessionStart(null)
  }, [mode, durations])

  const handleClockClick = () => {
    if (!isRunning) {
      // Adjust sessionStart to account for time already elapsed before pause
      const elapsedAlready = totalSeconds - timeLeft
      setSessionStart(Date.now() - (elapsedAlready * 1000))
    }
    setIsRunning(r => !r)
  }

  const handleReset = (e) => {
    if (e) e.stopPropagation()
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
    setSessionStart(null)
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const circumference = 2 * Math.PI * 54
  const dashoffset = circumference * (1 - timeLeft / totalSeconds)

  if (mobilePill) {
    return (
      <button onClick={handleClockClick} className={`glass flex items-center justify-center gap-3 px-5 py-2.5 rounded-full border shadow-2xl backdrop-blur-md ${isRunning ? 'border-pulsar/50 text-pulsar' : 'border-blue-900/40 text-starlight'}`}>
        <span className="font-mono text-lg font-bold ">{mins}:{secs}</span>
        {isRunning ? <div className="w-2.5 h-2.5 rounded-sm bg-pulsar" /> : <div className="w-0 h-0 border-l-[10px] border-y-[6px] border-y-transparent border-l-starlight" />}
      </button>
    )
  }

  // EXPANDED (fullscreen)
  if (isExpanded) return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-void/90 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Starfield />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Mode tabs */}
        <div className="flex w-full mb-6 bg-blue-900/10 rounded-xl p-1 border border-pulsar/30">
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${mode === key
                  ? 'text-starlight shadow-sm font-bold'
                  : 'text-nova/60 hover:text-starlight hover:bg-blue-900/10'
                }`}
              style={mode === key ? { background: color } : {}}>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Today's Task Selector */}
        {taskGroups.length > 0 && (
          <div className="mb-4 w-full">
            <select
              value={selectedTaskId}
              onChange={e => handleSelectTodayTask(e.target.value)}
              className="w-full bg-stardust/80 text-xs text-starlight border border-amber-400/40 rounded-xl px-3 py-2 outline-none font-body text-center appearance-none shadow-lg"
            >
              <option value="">🎯 Select Task to Focus On...</option>
              {taskGroups.map(group => (
                <optgroup key={group.label} label={group.label} className="bg-void text-starlight">
                  {group.tasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.completed || t.status === 'done' ? '✓ ' : ''}{t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Giant clock */}
        <div className="relative w-80 h-80 flex items-center justify-center cursor-pointer group"
          onClick={handleClockClick}>
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-2xl">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
            <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="relative text-center select-none">
            <p className="text-sm font-body text-nova/60 mb-2 ">{MODE_CONFIG[mode].label}</p>
            <p className="text-7xl font-display text-starlight tracking-tight leading-none mb-2">
              {mins}:{secs}
            </p>
            <p className="text-xs text-nova/60 font-mono">{isRunning ? 'Click to pause' : 'Click to start'}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 w-full">
          {/* IO Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-pulsar/30 bg-stardust/20">
            <button onClick={() => { setIoType('input'); localStorage.setItem('polaris_pomo_iotype', 'input') }}
              className={`flex-1 text-xs py-2 font-body transition-all ${ioType === 'input' ? 'bg-blue-900/50 text-amber-400 border-r border-pulsar/30  font-bold' : 'text-nova/60 hover:text-starlight border-r border-pulsar/30'}`}>
              📥 Input
            </button>
            <button onClick={() => { setIoType('output'); localStorage.setItem('polaris_pomo_iotype', 'output') }}
              className={`flex-1 text-xs py-2 font-body transition-all ${ioType === 'output' ? 'bg-blue-900/50 text-emerald-400  font-bold' : 'text-nova/60 hover:text-starlight'}`}>
              📤 Output
            </button>
          </div>
          
          <div className="flex items-center gap-3 w-full">
            <input type="text" placeholder="What's cookin?" value={comment} onChange={e => setComment(e.target.value)}
              className="flex-1 bg-stardust/50 text-starlight border border-pulsar/40 rounded-xl px-4 py-3 outline-none font-body text-sm placeholder:text-nova/60 text-center" />
            <button onClick={() => setIsExpanded(false)}
              className="w-11 h-11 rounded-xl border border-pulsar/40 text-nova/60 bg-stardust/40 hover:bg-stardust/80 hover:text-starlight flex items-center justify-center transition-all flex-shrink-0">
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )

  // WIDGET (anchored)
  return (
    <div ref={widgetRef} className="relative w-full glass rounded-none select-none group">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex gap-1">
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`px-2 py-0.5 text-xs rounded font-body transition-all ${mode === key ? 'text-starlight font-bold' : 'text-nova/60 hover:text-starlight'}`}
              style={mode === key ? { color, borderBottom: `1px solid ${color}` } : {}}>
              {key === 'focus' ? 'Focus' : key === 'short' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => { setCollapsed(c => { localStorage.setItem('polaris_pomo_collapsed', !c); return !c }) }}
            className="text-nova/60 hover:text-starlight transition-colors p-1">
            {collapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={() => setShowSettings(s => !s)}
            className="text-nova/60 hover:text-starlight transition-colors p-1">
            <Settings className="w-3 h-3" />
          </button>
          <button onClick={() => setIsExpanded(true)}
            className="text-nova/60 hover:text-starlight transition-colors p-1">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Collapsed: inline status */}
      {collapsed ? (
        <div className="px-3 pb-3 flex items-center justify-between">
          <p className="text-lg font-mono text-starlight">{mins}:{secs}</p>
          <div className="flex items-center gap-2">
            <button onClick={handleClockClick}
              className="w-7 h-7 rounded-lg border border-pulsar/40 flex items-center justify-center transition-all"
              style={{ color, borderColor: `${color}50` }}>
              {isRunning ? (
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button onClick={handleReset} className="text-nova/60 hover:text-starlight transition-colors p-0.5">
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Settings panel */}
          {showSettings && (
            <div className="px-3 pb-2 space-y-1">
              {Object.entries(durations).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-nova/60 font-body capitalize">{key}</span>
                  <input type="number" defaultValue={val} min={1} max={180}
                    onBlur={e => {
                      const v = parseInt(e.target.value) || 1
                      e.target.value = v
                      setDurations(d => ({ ...d, [key]: v }))
                      if (key === mode) setTimeLeft(v * 60)
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                    className="w-14 bg-stardust text-xs text-starlight border border-pulsar/30 rounded px-2 py-0.5 outline-none font-mono text-center" />
                </div>
              ))}
            </div>
          )}

          {/* Clock face */}
          <div className="flex flex-col items-center px-3 pb-3">
            <div className="relative w-28 h-28 flex items-center justify-center mt-1">
              <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={(2 * Math.PI * 50) * (1 - timeLeft / totalSeconds)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <div className="relative text-center">
                <p className="text-xl font-mono text-starlight leading-none">{mins}:{secs}</p>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-3 mt-2">
              <button onClick={handleClockClick}
                className="w-8 h-8 rounded-lg border border-pulsar/40 flex items-center justify-center transition-all hover:bg-blue-900/20"
                style={{ color, borderColor: `${color}50` }}>
                {isRunning ? (
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={handleReset} className="text-nova/60 hover:text-starlight transition-colors p-1">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setAutoRestart(r => !r)}
                title="Auto-restart loop"
                className={`text-lg leading-none transition-all px-1 ${autoRestart ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                style={autoRestart ? { color } : { color: '#64748b' }}>
                ⟳
              </button>
            </div>

            {/* Tasks Selector */}
            {taskGroups.length > 0 && (
              <div className="mt-3 w-full">
                <select
                  value={selectedTaskId}
                  onChange={e => handleSelectTodayTask(e.target.value)}
                  className="w-full bg-stardust/60 text-xs text-starlight border border-pulsar/40 focus:border-amber-400/60 rounded-lg px-2 py-1.5 outline-none font-body truncate"
                >
                  <option value="">🎯 Select Task to Focus On...</option>
                  {taskGroups.map(group => (
                    <optgroup key={group.label} label={group.label} className="bg-void text-starlight">
                      {group.tasks.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.completed || t.status === 'done' ? '✓ ' : ''}{t.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {/* Current Active Task Banner */}
            {currentTask && (
              <div className="mt-2 w-full glass border border-amber-400/30 bg-amber-400/10 rounded-lg p-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-mono px-1 py-0.5 rounded bg-amber-400/20 text-amber-400 font-bold shrink-0">
                    {ioType === 'input' ? '📥 Input' : '📤 Output'}
                  </span>
                  <span className="text-starlight font-body truncate leading-snug">{currentTask.title}</span>
                </div>
                <button
                  onClick={() => toggleTaskComplete(currentTask)}
                  className={`p-1 rounded transition-colors shrink-0 ${currentTask.completed ? 'text-emerald-400' : 'text-nova/60 hover:text-emerald-400'}`}
                  title={currentTask.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* IO Type toggle + Comment */}
            <div className="mt-2 w-full space-y-1.5">
              <div className="flex rounded-lg overflow-hidden border border-pulsar/30 bg-stardust/20">
                <button onClick={() => { setIoType('input'); localStorage.setItem('polaris_pomo_iotype', 'input') }}
                  className={`flex-1 text-xs py-1.5 font-body transition-all ${ioType === 'input' ? 'bg-blue-900/50 text-amber-400 border-r border-pulsar/30  font-bold' : 'text-nova/60 hover:text-starlight border-r border-pulsar/30'}`}>
                  📥 Input
                </button>
                <button onClick={() => { setIoType('output'); localStorage.setItem('polaris_pomo_iotype', 'output') }}
                  className={`flex-1 text-xs py-1.5 font-body transition-all ${ioType === 'output' ? 'bg-blue-900/50 text-emerald-400  font-bold' : 'text-nova/60 hover:text-starlight'}`}>
                  📤 Output
                </button>
              </div>
              <input
                type="text"
                placeholder="What's cookin?"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-2 py-1.5 outline-none font-body placeholder:text-nova/60"
              />

              {/* Ambient Audio Widget */}
              <div className="flex items-center justify-between bg-stardust/20 border border-blue-900/10 rounded-lg px-2 py-1 mt-1">
                <button onClick={() => setAudioEnabled(e => !e)} className={`flex items-center gap-2 text-xs transition-colors ${audioEnabled ? 'text-emerald-400' : 'text-nova/60 hover:text-starlight'}`}>
                  <Music className="w-3 h-3 flex-shrink-0" />
                  {audioEnabled ? 'Audio On' : 'Audio Off'}
                </button>
                {audioEnabled && (
                  <button onClick={() => setTrackIndex(i => (i + 1) % AMBIENT_TRACKS.length)} className="text-xs text-starlight hover:text-nova transition-colors font-body truncate max-w-[120px]">
                    {AMBIENT_TRACKS[trackIndex].name}
                  </button>
                )}
              </div>
              
              {audioEnabled && isRunning && (
                <div className="hidden">
                  <iframe 
                    width="1" height="1" 
                    src={`${AMBIENT_TRACKS[trackIndex].url}?autoplay=1&loop=1`} 
                    allow="autoplay; encrypted-media"
                    title="Ambient Audio"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default PomodoroTimer