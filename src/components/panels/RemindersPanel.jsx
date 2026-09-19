import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Dices,
  Sliders,
  Target
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNudgeScheduler } from '../../hooks/useNudgeScheduler'
import { useContactReminders } from '../../hooks/useContactReminders'
import { useCelebration } from '../../hooks/useCelebration'
import { supabase } from '../../lib/supabase'
import { safeMutate } from '../../lib/safeMutate'
import { computeWSJFScore } from '../../hooks/useWSJFScore'
import SurpriseTaskModal from '../modals/SurpriseTaskModal'
import TaskPickerModal from '../modals/TaskPickerModal'

const TIER_COLORS = {
  hearth: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  parlour: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  porch: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  yard: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
}

const TAG_BADGE_COLORS = {
  T: 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/30',
  R: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  N: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  H: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  C: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
  NUDGE: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  REMINDER: 'text-rose-400 bg-rose-400/10 border-rose-400/30',
  TASK: 'text-[#f5a623] bg-[#f5a623]/10 border-[#f5a623]/30',
  HABIT: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  'REACH OUT': 'text-sky-400 bg-sky-400/10 border-sky-400/30',
}

const TINY_CUES = [
  "Open the file and read the title out loud.",
  "Put your hands on the keyboard. Don't type yet.",
  "Write one sentence, even if it's draft quality.",
  "Open the required browser tab. That's the whole step.",
  "Set a 2-minute timer and just touch the task.",
  "Move your physical body into position at your desk."
];

function CollapsibleSection({ title, count, isCollapsed, onToggle, children }) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full group cursor-pointer"
        aria-expanded={!isCollapsed}
      >
        <h4 className="text-xs uppercase tracking-wider font-mono text-nova/60 group-hover:text-starlight transition-colors">
          {title}
        </h4>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-xs font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          <ChevronRight className={`w-3 h-3 text-nova/60 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
        </div>
      </button>
      {!isCollapsed && children}
    </div>
  );
}

const RemindersPanel = ({ onOpenDayGuide }) => {
  const { user } = useAuth()
  const { celebrate } = useCelebration()
  const { nudges, dismissNudge, fetchNudges } = useNudgeScheduler()
  const { contacts, markReachedOut } = useContactReminders()

  const shimmerDuration = useMemo(() => `${(3.5 + Math.random() * 3.5).toFixed(2)}s`, [])
  const shimmerDelay = useMemo(() => `${(Math.random() * 1.5).toFixed(2)}s`, [])

  // Task Queue State
  const [tasks, setTasks] = useState([])
  const [showSurprise, setShowSurprise] = useState(false)
  const [showTaskPicker, setShowTaskPicker] = useState(false)

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
  const [habitTasks, setHabitTasks] = useState([])
  const [collapsedSections, setCollapsedSections] = useState({})

  // Fetch tasks sorted by WSJF score
  const fetchTasks = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'inbox'])

    const scored = (data || []).map(t => {
      const { score } = computeWSJFScore(t);
      return { ...t, score };
    }).sort((a, b) => b.score - a.score);

    setTasks(scored);
  }, [user?.id]);

  const fetchHabitTasks = useCallback(async () => {
    if (!user) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase
      .from('tasks')
      .select('id, title, source_template_id, status, completion_dates, completion_count')
      .eq('user_id', user.id)
      .eq('category', 'habits')
      .in('status', ['active', 'inbox'])
    setHabitTasks(data || [])
  }, [user?.id])

  useEffect(() => {
    fetchTasks()
    fetchHabitTasks()
  }, [fetchTasks, fetchHabitTasks])

  // Realtime subscription and local event listener for tasks synchronization
  useEffect(() => {
    if (!user) return

    const handleTasksChanged = () => {
      fetchTasks()
      fetchHabitTasks()
      fetchNudges()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('polaris-tasks-changed', handleTasksChanged)
    }

    const channelName = `reminders-tasks-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        handleTasksChanged()
      })
      .subscribe()

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('polaris-tasks-changed', handleTasksChanged)
      }
      supabase.removeChannel(channel)
    }
  }, [user, fetchTasks, fetchHabitTasks, fetchNudges])

  // Global event listener for polaris-start-task to launch focus directly from other views
  useEffect(() => {
    const handleStartTaskEvent = (e) => {
      if (e.detail?.task) {
        startTaskLaunch(e.detail.task)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('polaris-start-task', handleStartTaskEvent)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('polaris-start-task', handleStartTaskEvent)
      }
    }
  }, [])

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

  const startTaskLaunch = async (task) => {
    setActiveTask(task)
    setTimerSeconds(0)
    setIsTimerRunning(true)
    setTinyCue(TINY_CUES[Math.floor(Math.random() * TINY_CUES.length)])

    // If a subtask is started, update its status to in_progress to sync with matrix canvas & views
    if (task?.parent_task_id && user?.id) {
      try {
        await safeMutate(
          supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id).eq('user_id', user.id),
          { throwOnError: true, context: 'RemindersPanel:syncSubtaskInProgress' }
        )
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('polaris-tasks-changed', { detail: { table: 'tasks', operation: 'update' } }))
        }
      } catch (err) {
        console.warn('Error syncing subtask in_progress status:', err)
      }
    }
  }

  const markTaskDone = async (taskId) => {
    if (!user?.id) return
    const { error } = await safeMutate(
      supabase.from('tasks').update({ status: 'done' }).eq('id', taskId).eq('user_id', user.id),
      { throwOnError: true, context: 'RemindersPanel:markTaskDone' }
    )
    if (error) {
      console.error('Error marking task done:', error)
      return
    }
    if (activeTask?.id === taskId) {
      setActiveTask(null)
      setIsTimerRunning(false)
    }
    celebrate()
    fetchTasks()
  }

  const completeHabitForToday = async (task) => {
    if (!user?.id) return
    const todayStr = new Date().toLocaleDateString('en-CA')
    const dates = Array.isArray(task.completion_dates) ? [...task.completion_dates] : []
    if (dates.includes(todayStr)) return
    dates.push(todayStr)
    dates.sort()
    const { error } = await safeMutate(
      supabase.from('tasks').update({
        completion_dates: dates,
        completion_count: (task.completion_count || 0) + 1,
        status: 'done'
      }).eq('id', task.id).eq('user_id', user.id),
      { throwOnError: true, context: 'RemindersPanel:completeHabitForToday' }
    )
    if (error) {
      console.error('Error completing habit:', error)
      return
    }
    celebrate()
    fetchHabitTasks()
  }

  // Nudge Settings handlers
  const saveNudge = async () => {
    if (!user?.id || !newNudgeTitle.trim()) return
    const interval = parseInt(newNudgeInterval) || 60
    
    if (editingNudge) {
      await safeMutate(
        supabase.from('nudges').update({ title: newNudgeTitle, interval_minutes: interval }).eq('id', editingNudge.id).eq('user_id', user.id),
        { throwOnError: true, context: 'RemindersPanel:updateNudge' }
      )
    } else {
      await safeMutate(
        supabase.from('nudges').insert({ user_id: user.id, title: newNudgeTitle, interval_minutes: interval }),
        { throwOnError: true, context: 'RemindersPanel:insertNudge' }
      )
    }
    
    setNewNudgeTitle('')
    setNewNudgeInterval('60')
    setEditingNudge(null)
    fetchNudges()
  }

  const toggleNudgeActive = async (nudge) => {
    if (!user?.id) return
    await safeMutate(
      supabase.from('nudges').update({ active: !nudge.active }).eq('id', nudge.id).eq('user_id', user.id),
      { throwOnError: true, context: 'RemindersPanel:toggleNudgeActive' }
    )
    fetchNudges()
  }

  const deleteNudge = async (id) => {
    if (!user?.id) return
    await safeMutate(
      supabase.from('nudges').delete().eq('id', id).eq('user_id', user.id),
      { throwOnError: true, context: 'RemindersPanel:deleteNudge' }
    )
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

  // Filter tasks
  const focusTasks = tasks.filter(t => t.category !== 'reminders' && t.category !== 'habits');
  const reminderTasks = tasks.filter(t => t.category === 'reminders');

  // Show ONLY 1 ongoing task + 1 next upcoming task to prevent user overload!
  const ongoingTask = activeTask || focusTasks[0];
  const nextTask = focusTasks.find(t => t.id !== ongoingTask?.id);
  const focusTaskIds = new Set([ongoingTask?.id, nextTask?.id].filter(Boolean));

  const todayStr = new Date().toLocaleDateString('en-CA');

  const isOverdue = (t) => Boolean(t?.deadline && t.deadline < todayStr);

  const getNeglectedBadge = (t) => {
    if (!t) return null;
    // Overdue state is communicated via red card coloring and shimmer, no text tag needed
    if (t.deadline && t.deadline < todayStr) return null;
    if (t.deadline && t.deadline === todayStr) return 'DUE TODAY';
    if ((t.skip_count || 0) >= 3) return 'NEGLECTED';
    return null;
  };

  const currentOngoing = activeTask || ongoingTask;
  const isOngoingOverdue = isOverdue(currentOngoing);
  const ongoingNeglectedBadge = getNeglectedBadge(currentOngoing);
  const ongoingAlert = isOngoingOverdue || Boolean(ongoingNeglectedBadge);

  // Unified Needs Attention Items
  const needsAttentionItems = []
  const seenAttentionIds = new Set()

  // 1. Active due system nudges (!n.isTask && n.active && n.isDue)
  nudges.forEach(n => {
    if (!n.isTask && n.active && n.isDue) {
      const key = `nudge-${n.id}`
      if (!seenAttentionIds.has(key)) {
        seenAttentionIds.add(key)
        needsAttentionItems.push({
          id: n.id,
          title: n.title,
          type: 'nudge',
          tag: 'N',
          tagFull: 'Nudge',
          score: 3.8,
          action: () => {
            dismissNudge(n.id)
            celebrate()
          }
        })
      }
    }
  })

  // 2. Non-focus tasks: quick wins (<= 15 min), same-day deadline, overdue, neglected
  tasks.forEach(t => {
    if (t.category === 'habits') return
    if (focusTaskIds.has(t.id)) return

    const isOverdueOrDueToday = Boolean(t.deadline && t.deadline <= todayStr)
    const isNeglected = (t.skip_count || 0) >= 3
    const isQuickWin = Boolean(t.estimated_minutes && t.estimated_minutes <= 15)

    if (isOverdueOrDueToday || isNeglected || isQuickWin) {
      const key = `task-${t.id}`
      if (!seenAttentionIds.has(key) && !seenAttentionIds.has(t.id)) {
        seenAttentionIds.add(key)
        seenAttentionIds.add(t.id)
        needsAttentionItems.push({
          id: t.id,
          title: t.title,
          type: 'task',
          tag: t.category === 'reminders' ? 'R' : 'T',
          tagFull: t.category === 'reminders' ? 'Reminder' : 'Task',
          score: t.score ?? computeWSJFScore(t).score,
          action: () => markTaskDone(t.id)
        })
      }
    }
  })

  // 3. Incomplete habits (category === 'habits' and today not in completion_dates)
  habitTasks.forEach(t => {
    const dates = Array.isArray(t.completion_dates) ? t.completion_dates : []
    if (!dates.includes(todayStr)) {
      const key = `habit-${t.id}`
      if (!seenAttentionIds.has(key) && !seenAttentionIds.has(t.id)) {
        seenAttentionIds.add(key)
        seenAttentionIds.add(t.id)
        needsAttentionItems.push({
          id: t.id,
          title: t.title,
          type: 'habit',
          tag: 'H',
          tagFull: 'Habit',
          score: 3.5,
          action: () => completeHabitForToday(t)
        })
      }
    }
  })

  // 4. Overdue contacts (c.isOverdue)
  contacts.forEach(c => {
    if (c.isOverdue) {
      const key = `contact-${c.id}`
      if (!seenAttentionIds.has(key) && !seenAttentionIds.has(c.id)) {
        seenAttentionIds.add(key)
        seenAttentionIds.add(c.id)
        const score = c.tier === 'hearth' ? 4.0 : c.tier === 'parlour' ? 3.6 : c.tier === 'porch' ? 3.2 : 2.8
        needsAttentionItems.push({
          id: c.id,
          title: c.name,
          type: 'contact',
          tag: 'C',
          tagFull: 'Contact',
          score,
          action: () => {
            markReachedOut(c.id)
            celebrate()
          }
        })
      }
    }
  })

  // Sort strictly by score descending
  needsAttentionItems.sort((a, b) => b.score - a.score)

  // Slice to max 2 items
  const visibleAttention = needsAttentionItems.slice(0, 2)

  const incompleteHabits = habitTasks.filter(t => {
    const dates = Array.isArray(t.completion_dates) ? t.completion_dates : []
    return !dates.includes(todayStr)
  })

  const toggleSection = useCallback((key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  return (
    <div className="relative w-full h-full flex flex-col">
      <style>{`
        @keyframes shimmer {
          0%, 100% {
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
            border-color: rgba(239, 68, 68, 0.35);
          }
          50% {
            box-shadow: 0 0 22px rgba(239, 68, 68, 0.55), 0 0 44px rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.65);
          }
        }
      `}</style>
      {/* Reminders Header */}
      <div className="p-4 pr-14 flex items-center justify-between border-b border-pulsar/30">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-display text-starlight">Reminders</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6 pb-20">
        
        {/* Section 1: Focus Tasks (Only 1 Ongoing + 1 Next) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs uppercase tracking-wider font-mono text-[#f5a623] font-bold">
                Focus Task
              </h4>
              
              {/* Choose Task Picker Button */}
              <button
                onClick={() => setShowTaskPicker(true)}
                className="text-[#f5a623] hover:text-white hover:scale-110 transition-transform flex items-center justify-center p-1 cursor-pointer"
                title="Choose Focus Task"
                aria-label="Choose Focus Task"
              >
                <Target className="w-3.5 h-3.5" />
              </button>

              {/* Task Randomiser Button */}
              <button 
                onClick={() => setShowSurprise(true)} 
                className="text-[#f5a623] hover:text-white hover:scale-110 transition-transform flex items-center justify-center p-1 cursor-pointer" 
                title="Randomise Task (Surprise Me)"
                aria-label="Randomise Task"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>

            {onOpenDayGuide && (
              <button
                onClick={onOpenDayGuide}
                className="px-2 py-1 rounded bg-[#f5a623]/15 border border-[#f5a623]/30 text-[#f5a623] hover:bg-[#f5a623] hover:text-[#0c0f14] text-xs font-mono font-bold flex items-center gap-1 transition-all"
                title="Open Brain Dump"
              >
                <Inbox className="w-3 h-3" /> Brain Dump
              </button>
            )}
          </div>

          {/* Ongoing Task Card (Do Now) */}
          {activeTask ? (
            <div 
              className={`glass border-2 ${ongoingAlert ? 'border-red-500/60 bg-red-950/20' : 'border-[#f5a623] bg-[#f5a623]/10'} rounded-xl p-3 space-y-2 shadow-lg`}
              style={ongoingAlert ? { animation: `shimmer ${shimmerDuration} ease-in-out infinite ${shimmerDelay}` } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#f5a623] font-bold ">Ongoing Now</span>
                  {ongoingNeglectedBadge && (
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded">
                      {ongoingNeglectedBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono font-bold text-[#f5a623]">
                  {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <p className="text-[13px] font-body text-starlight">{activeTask.title}</p>
              
              {tinyCue && (
                <p className="text-[11px] text-amber-200/90 italic bg-[#f5a623]/20 p-2 rounded-lg border border-[#f5a623]/30">
                  <strong>First Step:</strong> {tinyCue}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="px-2.5 py-1 rounded bg-stardust text-xs text-starlight border border-pulsar/40 flex items-center gap-1"
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
            <div 
              className={`glass border ${ongoingAlert ? 'border-red-500/50 bg-red-950/20' : 'border-[#f5a623]/30 bg-[#f5a623]/5'} rounded-xl p-3 space-y-2`}
              style={ongoingAlert ? { animation: `shimmer ${shimmerDuration} ease-in-out infinite ${shimmerDelay}` } : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 max-w-[180px]">
                  <span className="text-[13px] font-body text-starlight truncate">
                    {ongoingTask.title}
                  </span>
                  {ongoingNeglectedBadge && (
                    <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">
                      {ongoingNeglectedBadge}
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-[#f5a623] bg-[#f5a623]/20 px-1.5 py-0.5 rounded">
                  WSJF {ongoingTask.score}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-nova/60 pt-1 border-t border-pulsar/30">
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
                    className="p-1 rounded text-nova/60 hover:text-emerald"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-nova/60 italic">No tasks left today. Great job!</p>
          )}

          {/* ONLY 1 Next Upcoming Task */}
          {nextTask && (() => {
            const nextNeglectedBadge = getNeglectedBadge(nextTask);
            const isNextOverdue = isOverdue(nextTask);
            const nextAlert = isNextOverdue || Boolean(nextNeglectedBadge);
            return (
              <div className="pt-1">
                <div 
                  className={`glass border ${nextAlert ? 'border-red-500/50 bg-red-950/20' : 'border-pulsar/30'} p-2.5 rounded-xl flex items-center justify-between`}
                  style={nextAlert ? { animation: `shimmer ${shimmerDuration} ease-in-out infinite ${shimmerDelay}` } : undefined}
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-[13px] font-body text-starlight/90 truncate">{nextTask.title}</span>
                    {nextNeglectedBadge && (
                      <span className="text-[10px] font-mono font-bold text-red-400 bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 rounded shrink-0">
                        {nextNeglectedBadge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-nova/60 shrink-0">
                    <span>{nextTask.estimated_minutes || 30}m</span>
                    <button onClick={() => startTaskLaunch(nextTask)} className="text-[#f5a623] hover:text-white">
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}


        </div>

        {/* Needs Attention Section */}
        {needsAttentionItems.length > 0 && (
          <div 
            className="relative overflow-hidden border border-red-500/40 rounded-xl p-3 bg-red-950/25 space-y-2.5"
            style={{ animation: `shimmer ${shimmerDuration} ease-in-out infinite ${shimmerDelay}` }}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider font-mono text-red-400 font-bold flex items-center gap-2">
                <Zap className="w-3 h-3 text-red-400" /> Needs Attention
              </h4>
              {needsAttentionItems.length > 2 && (
                <span className="text-[11px] font-mono text-nova/60">
                  (+{needsAttentionItems.length - 2} more in sections below)
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {visibleAttention.map(item => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between bg-void/60 rounded-lg p-2 border border-red-500/20 hover:border-red-500/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <span 
                      className={`w-5 h-5 flex items-center justify-center text-[10px] font-mono font-bold rounded border shrink-0 ${TAG_BADGE_COLORS[item.tag] || 'text-nova/60 bg-nova/10 border-nova/30'}`}
                      title={item.tagFull || item.tag}
                    >
                      {item.tag}
                    </span>
                    <span className="text-xs text-starlight truncate" title={item.title}>
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={item.action}
                      aria-label={`Complete ${item.title}`}
                      className="h-6 w-6 rounded-full bg-blue-900/20 flex items-center justify-center text-nova/60 hover:text-emerald hover:bg-emerald/20 hover:border-emerald/40 border border-transparent transition-all shrink-0"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-px bg-blue-900/30" />
        
        {/* Section 2: Nudges */}
        <CollapsibleSection
          title="Nudges"
          count={nudges.filter(n => !n.isTask && n.active).length}
          isCollapsed={Boolean(collapsedSections['nudges'])}
          onToggle={() => toggleSection('nudges')}
        >
          <div className="flex justify-end items-center -mt-1">
            <button 
              onClick={() => setShowNudgeSettings(!showNudgeSettings)} 
              className="text-nova/60 hover:text-nova flex items-center gap-1 text-[11px] font-mono transition-colors"
              title="Manage Nudges"
            >
              <Settings className="w-3 h-3" />
              <span>{showNudgeSettings ? 'Close' : 'Settings'}</span>
            </button>
          </div>

          {showNudgeSettings && (
            <div className="glass border border-pulsar/40 p-3 rounded-lg space-y-3">
              <p className="text-xs text-starlight font-display">Manage Nudges</p>
              <div className="flex gap-2">
                <input className="flex-1 bg-stardust/50 text-xs text-starlight border border-pulsar/30 rounded px-2 py-1 outline-none" 
                  placeholder="Drink water" value={newNudgeTitle} onChange={e => setNewNudgeTitle(e.target.value)} />
                <input className="w-16 bg-stardust/50 text-xs text-starlight border border-pulsar/30 rounded px-2 py-1 outline-none" 
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
                {nudges.filter(n => !n.isTask).map(n => (
                  <div key={n.id} className="flex items-center justify-between text-xs text-nova/60 bg-void/60 border border-blue-900/10 p-1.5 rounded">
                    <span>{n.title} ({n.interval_minutes}m)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingNudge(n); setNewNudgeTitle(n.title); setNewNudgeInterval(n.interval_minutes.toString()) }}><Edit2 className="w-3 h-3 hover:text-sky"/></button>
                      <button onClick={() => toggleNudgeActive(n)} className={n.active ? 'text-emerald-400' : 'text-nova/60 hover:text-emerald-400/50'}><Check className="w-3 h-3" /></button>
                      <button onClick={() => deleteNudge(n.id)}><Trash2 className="w-3 h-3 hover:text-red-400"/></button>
                    </div>
                  </div>
                ))}
                {nudges.filter(n => !n.isTask).length === 0 && <p className="text-xs italic text-nova/60">No nudges created yet.</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            {nudges.filter(n => !n.isTask && n.active).sort((a, b) => {
              if (a.isDue && !b.isDue) return -1
              if (!a.isDue && b.isDue) return 1
              return a.nextFireAt - b.nextFireAt
            }).map(nudge => (
              <div key={nudge.id} className={`glass glass-hover hover:-translate-y-1 transition-transform border border-pulsar/30 p-3 rounded-xl flex items-center justify-between ${nudge.isDue ? 'animate-pulse-glow border-amber-500/50' : ''}`}>
                <div>
                  <p className="text-sm text-starlight">{nudge.title}</p>
                  <p className={`text-xs mt-0.5 ${nudge.isDue ? 'text-amber-400 font-bold' : 'text-nova/60'}`}>{formatTimeDiff(nudge.nextFireAt)}</p>
                </div>
                <button onClick={() => { dismissNudge(nudge.id); celebrate(); }} className="h-8 w-8 rounded-full bg-blue-900/20 flex items-center justify-center text-nova/60 hover:text-starlight hover:bg-blue-900/40 shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
            {nudges.filter(n => !n.isTask && n.active).length === 0 && <p className="text-xs text-nova/60 italic">No active nudges</p>}
          </div>
        </CollapsibleSection>

        <div className="h-px bg-blue-900/30" />

        {/* Task Reminders */}
        <CollapsibleSection
          title="Task Reminders"
          count={reminderTasks.length}
          isCollapsed={Boolean(collapsedSections['reminders'])}
          onToggle={() => toggleSection('reminders')}
        >
          <div className="space-y-2">
            {reminderTasks.map(task => (
              <div key={task.id} className="glass glass-hover hover:-translate-y-1 transition-transform border border-pulsar/30 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-starlight">{task.title}</p>
                  {task.notes && <p className="text-xs mt-0.5 text-nova/60 truncate max-w-[200px]">{task.notes}</p>}
                </div>
                <button onClick={() => markTaskDone(task.id)} className="h-8 w-8 rounded-full bg-blue-900/20 flex items-center justify-center text-nova/60 hover:text-emerald hover:bg-emerald/20 hover:border-emerald/50 border border-transparent transition-all shrink-0">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ))}
            {reminderTasks.length === 0 && <p className="text-xs text-nova/60 italic">No task reminders</p>}
          </div>
        </CollapsibleSection>

        <div className="h-px bg-blue-900/30" />

        {/* Habits */}
        <CollapsibleSection
          title="Habits"
          count={incompleteHabits.length}
          isCollapsed={Boolean(collapsedSections['habits'])}
          onToggle={() => toggleSection('habits')}
        >
          <div className="space-y-2">
            {habitTasks.map(task => {
              const dates = Array.isArray(task.completion_dates) ? task.completion_dates : []
              const doneToday = dates.includes(todayStr)
              return (
                <div key={task.id} className={`glass border border-pulsar/30 p-3 rounded-xl flex items-center justify-between ${doneToday ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="text-sm text-starlight">{task.title}</p>
                    <p className="text-xs text-nova/60 mt-0.5">Completed {task.completion_count || 0} times total</p>
                  </div>
                  <button onClick={() => doneToday ? null : completeHabitForToday(task)} disabled={doneToday}
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      doneToday ? 'bg-emerald/20 text-emerald border border-emerald/50' : 'bg-blue-900/20 text-nova/60 hover:text-emerald hover:bg-emerald/20 border border-transparent hover:border-emerald/50'
                    }`}>
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
            {habitTasks.length === 0 && <p className="text-xs text-nova/60 italic">No habits configured yet.</p>}
          </div>
        </CollapsibleSection>

        <div className="h-px bg-blue-900/30" />

        {/* Section 3: Reach Out */}
        <CollapsibleSection
          title="Reach Out"
          count={contacts.filter(c => c.isOverdue).length}
          isCollapsed={Boolean(collapsedSections['reachout'])}
          onToggle={() => toggleSection('reachout')}
        >
          <div className="space-y-2">
            {contacts.filter(c => c.isOverdue).map(contact => (
              <div key={contact.id} className="glass glass-hover hover:-translate-y-1 transition-transform border border-pulsar/30 p-3 rounded-xl">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-starlight">{contact.name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${TIER_COLORS[contact.tier] || TIER_COLORS.yard}`}>
                        {contact.tier}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${contact.isOverdue ? 'text-amber-400 font-bold' : 'text-nova/60'}`}>{contact.isOverdue ? `${contact.daysSince === Infinity ? 'Overdue' : `${contact.daysSince} days overdue`}` : `Due in ${contact.frequency_days - contact.daysSince} days`}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); markReachedOut(contact.id); celebrate(); }} className="h-8 w-8 rounded-full bg-blue-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all shrink-0 ml-2">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                {expandedContactId === contact.id && (
                  <div className="mt-3 pt-3 border-t border-pulsar/30 space-y-2 text-xs text-nova/60">
                    {contact.contact_number && <p className="flex items-center gap-2">📞 {contact.contact_number}</p>}
                    {contact.social_handle && <p className="flex items-center gap-2">🌐 {contact.social_handle}</p>}
                    {contact.notes && <p className="italic text-nova/80 border-l-2 border-pulsar/40 pl-2">"{contact.notes}"</p>}
                    <a href={gcalUrl(contact)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-nova hover:text-starlight mt-2 bg-nova/10 border border-nova/20 px-2 py-1.5 rounded transition-colors w-full justify-center">
                      <Calendar className="w-3 h-3" /> Add to GCal
                    </a>
                  </div>
                )}
              </div>
            ))}
            {contacts.filter(c => c.isOverdue).length === 0 && <p className="text-xs text-nova/60 italic">No one due for reach out today.</p>}
          </div>
        </CollapsibleSection>
      </div>

      <SurpriseTaskModal 
        isOpen={showSurprise} 
        onClose={() => setShowSurprise(false)} 
        tasks={focusTasks}
        toggleComplete={markTaskDone} 
        onStartFocus={(task) => startTaskLaunch(task)}
      />

      <TaskPickerModal
        isOpen={showTaskPicker}
        onClose={() => setShowTaskPicker(false)}
        tasks={focusTasks}
        onSelectTask={(task) => startTaskLaunch(task)}
      />
    </div>
  )
}

export default RemindersPanel
