import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const PomodoroTimer = ({ nodes = [] }) => {
  const { user } = useAuth()
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [remaining, setRemaining] = useState(25 * 60)
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [label, setLabel] = useState('')
  const intervalRef = useRef(null)

  const totalSeconds = (isBreak ? breakMinutes : workMinutes) * 60
  const progress = 1 - remaining / totalSeconds
  const ring = useMemo(() => {
    const r = 34
    const c = 2 * Math.PI * r
    return { r, c, offset: c * (1 - progress) }
  }, [progress])

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (!isRunning) return
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev > 1) return prev - 1
        return 0
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning])

  useEffect(() => {
    if (remaining > 0) return
    const completeSession = async () => {
      if (!isBreak) {
        await supabase.from('pomodoro_logs').insert({
          user_id: user.id,
          date: new Date().toISOString().slice(0, 10),
          duration_minutes: workMinutes,
          node_id: selectedNodeId || null,
          label: label || null,
        })
      }
      const nextIsBreak = !isBreak
      setIsBreak(nextIsBreak)
      setRemaining((nextIsBreak ? breakMinutes : workMinutes) * 60)
      setIsRunning(false)
    }
    completeSession()
  }, [remaining])

  const format = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const reset = () => {
    setIsRunning(false)
    setIsBreak(false)
    setRemaining(workMinutes * 60)
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60] glass border border-blue-900/30 rounded-2xl p-3 w-64 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-display tracking-wider text-starlight">{isBreak ? 'BREAK' : 'FOCUS'}</p>
        <div className="flex gap-2 text-xs text-dim">
          <input type="number" value={workMinutes} min={10} max={90} onChange={e => setWorkMinutes(parseInt(e.target.value || '25', 10))}
            className="w-12 bg-stardust/60 rounded px-1.5 py-0.5 outline-none" />
          <input type="number" value={breakMinutes} min={3} max={30} onChange={e => setBreakMinutes(parseInt(e.target.value || '5', 10))}
            className="w-12 bg-stardust/60 rounded px-1.5 py-0.5 outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <svg width="82" height="82">
          <circle cx="41" cy="41" r={ring.r} stroke="#1e2d4a" strokeWidth="6" fill="none" />
          <circle cx="41" cy="41" r={ring.r} stroke="#3b82f6" strokeWidth="6" fill="none"
            strokeDasharray={ring.c} strokeDashoffset={ring.offset} strokeLinecap="round" transform="rotate(-90 41 41)" />
          <text x="41" y="45" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontFamily="JetBrains Mono">{format(remaining)}</text>
        </svg>
        <div className="flex-1 space-y-2">
          <div className="flex gap-1">
            <button onClick={() => setIsRunning(v => !v)} className="p-1.5 rounded bg-pulsar/20 text-pulsar"><Play className="w-3.5 h-3.5" /></button>
            <button onClick={() => setIsRunning(false)} className="p-1.5 rounded bg-stardust text-dim"><Pause className="w-3.5 h-3.5" /></button>
            <button onClick={reset} className="p-1.5 rounded bg-stardust text-dim"><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
          <select value={selectedNodeId} onChange={e => setSelectedNodeId(e.target.value)} className="w-full bg-stardust/60 text-xs rounded px-2 py-1">
            <option value="">No node linked</option>
            {nodes.map(node => <option key={node.id} value={node.id}>{node.title}</option>)}
          </select>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What are you working on?"
            className="w-full bg-stardust/60 text-xs rounded px-2 py-1 outline-none text-starlight" />
        </div>
      </div>
    </div>
  )
}

export default PomodoroTimer
