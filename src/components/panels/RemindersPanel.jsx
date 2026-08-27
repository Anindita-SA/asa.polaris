import { useState, useEffect, useCallback } from 'react'
import { 
  ChevronRight, 
  ChevronLeft, 
  Settings, 
  Check, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Inbox, 
  Play, 
  Pause, 
  CheckCircle2, 
  Clock, 
  Zap,
  Dices
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNudgeScheduler } from '../../hooks/useNudgeScheduler'
import { useContactReminders } from '../../hooks/useContactReminders'
import { useCelebration } from '../../hooks/useCelebration'
import { supabase } from '../../lib/supabase'
import { computeWSJFScore } from '../../hooks/useWSJFScore'
import SurpriseTaskModal from '../modals/SurpriseTaskModal'

const TIER_COLORS = {
  hearth: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  parlour: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  porch: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  yard: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
}

const TINY_CUES = [
  "Open the file and read the title out loud.",
  "Put your hands on the keyboard. Don't type yet.",
  "Write one sentence, even if it's draft quality.",
  "Open the required browser tab. That's the whole step.",
  "Set a 2-minute timer and just touch the task.",
  "Move your physical body into position at your desk."
];

const RemindersPanel = ({ onOpenDayGuide }) => {
  const { user } = useAuth()
  const { celebrate } = useCelebration()
  const { nudges, dismissNudge, fetchNudges } = useNudgeScheduler()
  const { contacts, markReachedOut } = useContactReminders()

  // Task Queue State
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showSurprise, setShowSurprise] = useState(false)

  // Launch Pad Timer State
  const [activeTask, setActiveTask] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [tinyCue, setTinyCue] = useState('')

  // Nudge settings state
  const [showNudgeSettings, setShowNudgeSettings] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)
  const [newNudgeTitle, setNewNudgeTitle] = useState('')
  const [newNudgeInterval, setNewNudgeInterval] = useState('60')
  const [expandedContactId, setExpandedContactId] = useState(null)

  // Fetch tasks sorted by WSJF score
  const fetchTasks = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('status', ['active', 'inbox'])

    const scored = (data || []).map(t => {
      const { score } = computeWSJFScore(t);
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    setTasks(scored);
  }, [user]);

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Timer interval
  useEffect(() => {
    let interval = null
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const startTaskLaunch = (task) => {
    setActiveTask(task)
    setTimerSeconds(0)
    setIsTimerRunning(true)
    setTinyCue(TINY_CUES[Math.floor(Math.random() * TINY_CUES.length)])
  }

  const markTaskDone = async (taskId) => {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    if (activeTask?.id === taskId) {
      setActiveTask(null)
      setIsTimerRunning(false)
    }
    celebrate()
    fetchTasks()
  }

  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await supabase.from('tasks').insert({
        user_id: user.id,
        title: newTaskTitle.trim(),
        status: 'inbox'
      })
      setNewTaskTitle('')
      fetchTasks()
    }
  }

  // Nudge Settings handlers
  const saveNudge = async () => {
    if (!newNudgeTitle.trim()) return
    const interval = parseInt(newNudgeInterval) || 60
    
    if (editingNudge) {
      await supabase.from('nudges').update({ title: newNudgeTitle, interval_minutes: interval }).eq('id', editingNudge.id)
    } else {
      await supabase.from('nudges').insert({ user_id: user.id, title: newNudgeTitle, interval_minutes: interval })
    }
    
    setNewNudgeTitle('')
    setNewNudgeInterval('60')
    setEditingNudge(null)
    fetchNudges()
  }

  const toggleNudgeActive = async (nudge) => {
    await supabase.from('nudges').update({ active: !nudge.active }).eq('id', nudge.id)
    fetchNudges()
  }

  const deleteNudge = async (id) => {
    await supabase.from('nudges').delete().eq('id', id)
    fetchNudges()
  }

  const formatTimeDiff = (nextFireAt) => {
    const diffMin = Math.round((nextFireAt - Date.now()) / 60000)
    if (diffMin <= 0) {
      const pastMin = Math.abs(diffMin)
      if (pastMin < 60) return `Due ${pastMin} min ago`
      if (pastMin < 1440) return `Due ${Math.round(pastMin / 60)}h ago`
      if (pastMin <= 10080) return `Due ${Math.round(pastMin / 1440)}d ago`
      return `Overdue`
    }
    return `In ${diffMin} min`
  }

  const gcalUrl = (contact) => {
    const text = encodeURIComponent(`Reach out to ${contact.name}`)
    const details = encodeURIComponent(`Regular check-in via Polaris.\nTier: ${contact.tier}\nNotes: ${contact.notes || ''}`)
    const recur = `RRULE:FREQ=DAILY;INTERVAL=${contact.frequency_days}`
    return `https://calendar.google.com/calendar/r/eventedit?text=${text}&details=${details}&recur=${recur}`
  }

  // Show ONLY 1 ongoing task + 1 next upcoming task to prevent user overload!
  const ongoingTask = activeTask || tasks[0];
  const nextTask = tasks.find(t => t.id !== ongoingTask?.id);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Reminders Header */}
      <div className="p-4 pr-14 flex items-center justify-between border-b border-blue-900/20">
        <h3 className="font-display text-starlight">Reminders</h3>
        {onOpenDayGuide && (
          <button
            onClick={onOpenDayGuide}
            className="text-xs text-[#f5a623] hover:underline flex items-center gap-1 font-mono font-bold"
            title="Open Brain Dump & Day Guide"
          >
            <Inbox className="w-3.5 h-3.5" /> Brain Dump
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6 pb-20">
        
        {/* Section 1: Focus Tasks (Only 1 Ongoing + 1 Next) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-mono text-[#f5a623] font-bold">
                Focus Task
              </h4>
              
              {/* Task Randomiser Button */}
              <button 
                onClick={() => setShowSurprise(true)} 
                className="text-[#f5a623] hover:text-white hover:scale-110 transition-transform flex items-center justify-center p-1" 
                title="Randomise Task (Surprise Me)"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>

            {onOpenDayGuide && (
              <button
                onClick={onOpenDayGuide}
                className="px-2 py-1 rounded bg-[#f5a623]/15 border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623] hover:text-[#0c0f14] text-[10px] font-mono font-bold flex items-center gap-1 transition-all"
                title="Open Brain Dump"
              >
                <Inbox className="w-3 h-3" /> Brain Dump
              </button>
            )}
          </div>

          {/* Ongoing Task Card (Do Now) */}
          {activeTask ? (
            <div className="glass border-2 border-[#f5a623] bg-[#f5a623]/10 rounded-xl p-3 space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#f5a623] font-bold ">Ongoing Now</span>
                <span className="text-xs font-mono font-bold text-[#f5a623]">
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <p className="text-xs font-bold text-starlight">{activeTask.title}</p>
              
              {tinyCue && (
                <p className="text-[11px] text-amber-200/90 italic bg-[#f5a623]/20 p-2 rounded-lg border border-[#f5a623]/30">
                  <strong>First Step:</strong> {tinyCue}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-2.5 py-1 rounded bg-stardust text-xs text-starlight border border-blue-900/30 flex items-center gap-1"
                >
                  {isTimerRunning ? <Pause className="w-3 h-3 text-[#f5a623]" /> : <Play className="w-3 h-3 text-emerald" />}
                  <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                </button>
                <button
                  onClick={() => markTaskDone(activeTask.id)}
                  className="px-3 py-1 rounded bg-emerald text-xs font-bold text-[#0c0f14] flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                </button>
              </div>
            </div>
          ) : ongoingTask ? (
            <div className="glass border border-[#f5a623]/30 bg-[#f5a623]/5 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-starlight truncate max-w-[180px]">
                  {ongoingTask.title}
                </span>
                <span className="text-[10px] font-mono text-[#f5a623] bg-[#f5a623]/20 px-1.5 py-0.5 rounded">
                  WSJF {ongoingTask.score}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-dim pt-1 border-t border-blue-900/20">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-emerald" /> {ongoingTask.estimated_minutes || 30}m
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startTaskLaunch(ongoingTask)}
                    className="px-2.5 py-1 rounded bg-[#f5a623] hover:bg-[#f5a623]/90 text-[#0c0f14] font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Play className="w-3 h-3 fill-current" /> Start
                  </button>
                  <button
                    onClick={() => markTaskDone(ongoingTask.id)}
                    className="p-1 rounded text-dim hover:text-emerald"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-dim italic">No tasks left today. Great job!</p>
          )}

          {/* ONLY 1 Next Upcoming Task */}
          {nextTask && (
            <div className="pt-1">
              <div className="glass border border-blue-900/20 p-2.5 rounded-xl flex items-center justify-between">
                <span className="text-xs text-starlight/90 truncate">{nextTask.title}</span>
                <div className="flex items-center gap-2 text-[10px] font-mono text-dim">
                  <span>{nextTask.estimated_minutes || 30}m</span>
                  <button onClick={() => startTaskLaunch(nextTask)} className="text-[#f5a623] hover:text-white">
                    <Play className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Task Capture Input */}
          <div className="pt-2">
            <div className="relative flex items-center">
              <input 
                type="text" 
                placeholder="Add a task for today... (Enter)"
                className="w-full bg-void/50 border border-blue-900/30 rounded-lg py-2 pl-9 pr-3 text-sm text-starlight placeholder-dim focus:outline-none focus:border-sky/50 transition-colors"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={handleAddTask}
              />
              <Plus className="w-4 h-4 text-dim absolute left-3 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="h-px bg-blue-900/30" />
        
        {/* Section 2: Nudges */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-mono text-dim">Nudges</h4>
            <button onClick={() => setShowNudgeSettings(!showNudgeSettings)} className="text-dim hover:text-nova">
              <Settings className="w-3 h-3" />
            </button>
          </div>

          {showNudgeSettings && (
            <div className="glass border border-blue-900/30 p-3 rounded-lg space-y-3">
              <p className="text-xs text-starlight font-display">Manage Nudges</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded px-2 py-1 outline-none" 
                  placeholder="Drink water" value={newNudgeTitle} onChange={e => setNewNudgeTitle(e.target.value)} />
                <input className="w-16 bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded px-2 py-1 outline-none" 
                  placeholder="Min" type="number" value={newNudgeInterval} onChange={e => setNewNudgeInterval(e.target.value)} />
                <button onClick={saveNudge} className="px-2 bg-nova/20 text-nova border border-nova/30 rounded text-xs hover:bg-nova/30">
                  {editingNudge ? <Check className="w-3 h-3"/> : <Plus className="w-3 h-3"/>}
                </button>
                {editingNudge && (
                  <button onClick={() => { setEditingNudge(null); setNewNudgeTitle(''); setNewNudgeInterval('60') }} className="px-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs hover:bg-red-500/30">
                    <X className="w-3 h-3"/>
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {nudges.map(n => (
                  <div key={n.id} className="flex items-center justify-between text-xs text-dim bg-void/30 border border-blue-900/10 p-1.5 rounded">
                    <span>{n.title} ({n.interval_minutes}m)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingNudge(n); setNewNudgeTitle(n.title); setNewNudgeInterval(n.interval_minutes.toString()) }}><Edit2 className="w-3 h-3 hover:text-sky"/></button>
                      <button onClick={() => toggleNudgeActive(n)} className={n.active ? 'text-emerald-400' : 'text-dim hover:text-emerald-400/50'}><Check className="w-3 h-3" /></button>
                      <button onClick={() => deleteNudge(n.id)}><Trash2 className="w-3 h-3 hover:text-red-400"/></button>
                    </div>
                  </div>
                ))}
                {nudges.length === 0 && <p className="text-[10px] italic text-dim">No nudges created yet.</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {nudges.filter(n => n.active).sort((a, b) => {
              if (a.isDue && !b.isDue) return -1
              if (!a.isDue && b.isDue) return 1
              return a.nextFireAt - b.nextFireAt
            }).map(nudge => (
              <div key={nudge.id} className={`glass glass-hover hover:-translate-y-1 transition-transform border border-blue-900/20 p-3 rounded-xl flex items-center justify-between ${nudge.isDue ? 'animate-pulse-glow border-amber-500/50' : ''}`}>
                <div>
                  <p className="text-sm text-starlight">{nudge.title}</p>
                  <p className={`text-xs mt-0.5 ${nudge.isDue ? 'text-amber-400 font-bold' : 'text-dim'}`}>{formatTimeDiff(nudge.nextFireAt)}</p>
                </div>
                <button onClick={() => { dismissNudge(nudge.id); celebrate(); }} className="h-8 w-8 rounded-full bg-blue-900/20 flex items-center justify-center text-dim hover:text-starlight hover:bg-blue-900/40 shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
            {nudges.filter(n => n.active).length === 0 && <p className="text-xs text-dim italic">No active nudges</p>}
          </div>
        </div>

        <div className="h-px bg-blue-900/30" />

        {/* Section 3: Reach Out */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono text-dim">Reach Out</h4>
          <div className="space-y-2">
            {contacts.map(contact => (
              <div key={contact.id} className="glass glass-hover hover:-translate-y-1 transition-transform border border-blue-900/20 p-3 rounded-xl">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-starlight">{contact.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TIER_COLORS[contact.tier] || TIER_COLORS.yard}`}>
                        {contact.tier}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${contact.isOverdue ? 'text-amber-400 font-bold' : 'text-dim'}`}>
                      {contact.isOverdue ? `${contact.daysSince === Infinity ? 'Overdue' : `${contact.daysSince} days overdue`}` : `Due in ${contact.frequency_days - contact.daysSince} days`}
                    </p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); markReachedOut(contact.id); celebrate(); }} className="h-8 w-8 rounded-full bg-blue-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all shrink-0 ml-2">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                {expandedContactId === contact.id && (
                  <div className="mt-3 pt-3 border-t border-blue-900/20 space-y-2 text-xs text-dim">
                    {contact.contact_number && <p className="flex items-center gap-2">📞 {contact.contact_number}</p>}
                    {contact.social_handle && <p className="flex items-center gap-2">🌐 {contact.social_handle}</p>}
                    {contact.notes && <p className="italic text-starlight/70 border-l-2 border-blue-900/30 pl-2">"{contact.notes}"</p>}
                    <a href={gcalUrl(contact)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-nova hover:text-starlight mt-2 bg-nova/10 border border-nova/20 px-2 py-1.5 rounded transition-colors w-full justify-center">
                      <Calendar className="w-3 h-3" /> Add to GCal
                    </a>
                  </div>
                )}
              </div>
            ))}
            {contacts.length === 0 && <p className="text-xs text-dim italic">No contacts synced</p>}
          </div>
        </div>
      </div>

      <SurpriseTaskModal 
        isOpen={showSurprise} 
        onClose={() => setShowSurprise(false)} 
        tasks={tasks}
        toggleComplete={markTaskDone} 
      />
    </div>
  )
}

export default RemindersPanel
