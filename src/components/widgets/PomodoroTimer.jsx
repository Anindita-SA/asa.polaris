import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Settings, X, Maximize2, Minimize2, RotateCcw } from 'lucide-react'

import Starfield from '../layout/Starfield'

const MODE_CONFIG = {
  focus: { label: 'Pomodoro', default: 25, color: '#3b82f6' },
  short: { label: 'Short Break', default: 5, color: '#10b981' },
  long: { label: 'Long Break', default: 15, color: '#8b5cf6' },
}

const PomodoroTimer = () => {
  const { user } = useAuth()
  const [mode, setMode] = useState('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [autoRestart, setAutoRestart] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 })
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [linkedItem, setLinkedItem] = useState('')
  const [comment, setComment] = useState('')
  const [pos, setPos] = useState({ x: -1, y: -1 })
  const [sessionStart, setSessionStart] = useState(null)
  const [nodes, setNodes] = useState([])

  const isDragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef(null)

  useEffect(() => {
    if (user?.id) {
      supabase.from('nodes').select('*').eq('user_id', user.id).then(({ data }) => {
        if (data) setNodes(data)
      })
    }
  }, [user?.id])

  // Init position bottom-right
  useEffect(() => {
    setPos({ x: window.innerWidth - 290, y: window.innerHeight - 230 })
  }, [])

  const totalSeconds = durations[mode] * 60
  const color = MODE_CONFIG[mode].color

  // Tick
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Log session if focus mode
          if (mode === 'focus' && sessionStart) {
            const mins = Math.round((Date.now() - sessionStart) / 60000)
            if (mins > 0) {
              const today = new Date().toISOString().slice(0, 10)
              supabase.from('pomodoro_logs').insert({
                user_id: user.id,
                duration_minutes: mins,
                label: linkedItem || comment || null,
                date: today,
              }).then(() => { })
            }
          }
          if (autoRestart) {
            const next = mode === 'focus' ? 'short' : 'focus'
            setMode(next)
            setTimeLeft(durations[next] * 60)
            setSessionStart(Date.now())
            return durations[next] * 60
          }
          setIsRunning(false)
          setSessionStart(null)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, autoRestart, mode, durations, sessionStart, linkedItem, comment, user?.id])

  // Reset on mode change
  useEffect(() => {
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
    setSessionStart(null)
  }, [mode])

  const handleClockClick = () => {
    if (!isRunning) setSessionStart(Date.now())
    else if (timeLeft === totalSeconds) setSessionStart(null)
    setIsRunning(r => !r)
  }

  const handleReset = (e) => {
    e.stopPropagation()
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
    setSessionStart(null)
  }

  // Drag
  const onMouseDown = (e) => {
    if (isExpanded || e.target.closest('button') || e.target.closest('select')) return
    isDragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
  }, [])

  const onMouseUp = useCallback(() => {
    isDragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseMove])

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')
  const circumference = 2 * Math.PI * 54
  const dashoffset = circumference * (1 - timeLeft / totalSeconds)

  // ── EXPANDED (fullscreen) ────────────────────────────────────────────────
  if (isExpanded) return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-void/90 overflow-hidden">
      {/* Animated Starfield Background */}
      <div className="absolute inset-0 z-0">
        <Starfield />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
        {/* Mode tabs */}
        <div className="flex w-full mb-8 bg-blue-900/10 rounded-xl p-1 border border-blue-900/20">
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-body transition-all ${mode === key
                  ? 'text-starlight shadow-sm'
                  : 'text-dim hover:text-starlight hover:bg-blue-900/10'
                }`}
              style={mode === key ? { background: color } : {}}>
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Linked Node Selector */}
        <div className="mb-4 w-full flex justify-center">
          <select value={linkedItem} onChange={e => setLinkedItem(e.target.value)}
            className="bg-stardust text-sm text-starlight border border-blue-900/30 rounded-lg px-4 py-2 outline-none font-body min-w-[200px] text-center appearance-none shadow-lg">
            <option value="">No Node Linked</option>
            {nodes.map(n => <option key={n.id} value={n.title}>{n.title}</option>)}
          </select>
        </div>

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
            <p className="text-sm font-body text-dim mb-2 uppercase tracking-widest">{MODE_CONFIG[mode].label}</p>
            <p className="text-7xl font-display text-starlight tracking-tight leading-none mb-2">
              {mins}:{secs}
            </p>
            <p className="text-sm font-body transition-opacity"
              style={{ color, opacity: isRunning ? 1 : 0.8 }}>
              {isRunning ? 'Running...' : 'Ready?'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-10">
          <button onClick={handleClockClick}
            className="w-14 h-14 rounded-xl border border-blue-900/30 text-starlight bg-blue-900/20 hover:bg-blue-900/40 flex items-center justify-center transition-all shadow-lg">
            {isRunning ? (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6 fill-current ml-1" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button onClick={handleReset}
            className="w-12 h-12 rounded-xl border border-blue-900/30 text-dim bg-stardust/40 hover:bg-stardust/80 hover:text-starlight flex items-center justify-center transition-all shadow-lg">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={() => setAutoRestart(r => !r)}
            title="Auto-restart loop"
            className={`w-12 h-12 rounded-xl border border-blue-900/30 flex items-center justify-center transition-all shadow-lg text-2xl pb-1 ${autoRestart ? 'bg-blue-900/20 text-starlight' : 'bg-stardust/40 text-dim hover:text-starlight hover:bg-stardust/80'}`}
            style={autoRestart ? { borderColor: color, color } : {}}>
            ∞
          </button>
        </div>

        {/* What's cookin — free text + minimize */}
        <div className="mt-8 flex items-center gap-3 w-full">
          <input type="text" placeholder="What's cookin?" value={comment} onChange={e => setComment(e.target.value)}
            className="flex-1 bg-stardust/50 text-starlight border border-blue-900/30 rounded-xl px-4 py-3 outline-none font-body text-sm placeholder:text-dim text-center" />
          <button onClick={() => setIsExpanded(false)}
            className="w-11 h-11 rounded-xl border border-blue-900/30 text-dim bg-stardust/40 hover:bg-stardust/80 hover:text-starlight flex items-center justify-center transition-all flex-shrink-0">
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )

  // ── WIDGET (compact, draggable) ──────────────────────────────────────────
  if (pos.x < 0) return null

  return (
    <div ref={widgetRef}
      className="fixed z-40 glass border border-blue-900/20 rounded-2xl select-none"
      style={{ left: pos.x, top: pos.y, width: 260 }}
      onMouseDown={onMouseDown}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex gap-1">
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`px-2 py-0.5 text-xs rounded font-body transition-all ${mode === key ? 'text-starlight' : 'text-dim hover:text-starlight'
                }`}
              style={mode === key ? { color, borderBottom: `1px solid ${color}` } : {}}>
              {key === 'focus' ? 'Focus' : key === 'short' ? 'Short' : 'Long'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowSettings(s => !s)}
            className="text-dim hover:text-starlight transition-colors p-1">
            <Settings className="w-3 h-3" />
          </button>
          <button onClick={() => setIsExpanded(true)}
            className="text-dim hover:text-starlight transition-colors p-1">
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="px-3 pb-2 space-y-1">
          {Object.entries(durations).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-dim font-body capitalize">{key}</span>
              <input type="number" value={val} min={1} max={60}
                onChange={e => {
                  const v = parseInt(e.target.value) || 1
                  setDurations(d => ({ ...d, [key]: v }))
                  if (key === mode) setTimeLeft(v * 60)
                }}
                className="w-14 bg-stardust text-xs text-starlight border border-blue-900/20 rounded px-2 py-0.5 outline-none font-mono text-center" />
            </div>
          ))}
        </div>
      )}

      {/* Clock face - click to start/pause */}
      <div className="flex flex-col items-center px-3 pb-3">
        <div className="relative w-28 h-28 flex items-center justify-center cursor-pointer group mt-1"
          onClick={handleClockClick}>
          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
            <circle cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="4"
              strokeDasharray={2 * Math.PI * 50}
              strokeDashoffset={(2 * Math.PI * 50) * (1 - timeLeft / totalSeconds)}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div className="relative text-center">
            <p className="text-xl font-mono text-starlight leading-none">{mins}:{secs}</p>
            <p className="text-xs font-body mt-0.5 opacity-60"
              style={{ color }}>
              {isRunning ? '▌▌ pause' : '▶ start'}
            </p>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-3 mt-2">
          <button onClick={handleReset}
            className="text-dim hover:text-starlight transition-colors p-1">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAutoRestart(r => !r)}
            title="Auto-restart loop"
            className={`text-lg leading-none transition-all px-1 ${autoRestart ? 'opacity-100' : 'opacity-30 hover:opacity-60'
              }`}
            style={autoRestart ? { color } : { color: '#64748b' }}>
            ∞
          </button>
        </div>

        {/* Comment + node link in compact view */}
        <div className="mt-2 w-full space-y-1.5">
          <input
            type="text"
            placeholder="What's cookin?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-2 py-1.5 outline-none font-body placeholder:text-dim"
          />
          {nodes.length > 0 && (
            <select value={linkedItem} onChange={e => setLinkedItem(e.target.value)}
              className="w-full bg-stardust/40 text-xs text-dim border border-blue-900/10 rounded-lg px-2 py-1 outline-none font-body">
              <option value="">No node linked</option>
              {nodes.map(n => <option key={n.id} value={n.title}>{n.title}</option>)}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}

export default PomodoroTimer