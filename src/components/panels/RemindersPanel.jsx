import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, Settings, Check, Calendar, Plus, Trash2, Edit2, X, RefreshCw } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNudgeScheduler } from '../../hooks/useNudgeScheduler'
import { useContactReminders } from '../../hooks/useContactReminders'
import { useGoogleTasks } from '../../hooks/useGoogleTasks'
import { useCelebration } from '../../hooks/useCelebration'
import { supabase } from '../../lib/supabase'
import { useTodaysTasks } from '../../hooks/useTodaysTasks'
import SurpriseTaskModal from '../modals/SurpriseTaskModal'
import { Dices } from 'lucide-react'

const TIER_COLORS = {
  hearth: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  parlour: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  porch: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  yard: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
}

const RemindersPanel = () => {
  const { user } = useAuth()
  const { celebrate } = useCelebration()
  const { nudges, dismissNudge, fetchNudges } = useNudgeScheduler()
  const { contacts, markReachedOut } = useContactReminders()
  const { sync, isSyncing } = useGoogleTasks()
  
  // Unified Daily Tasks
  const { tasks, fetchTasks, toggleComplete, addTask } = useTodaysTasks()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [syncStatus, setSyncStatus] = useState(null)
  const [showSurprise, setShowSurprise] = useState(false)

  // Nudge settings state
  const [showNudgeSettings, setShowNudgeSettings] = useState(false)
  const [editingNudge, setEditingNudge] = useState(null)
  const [newNudgeTitle, setNewNudgeTitle] = useState('')
  const [newNudgeInterval, setNewNudgeInterval] = useState('60')
  
  // Expanded contacts state
  const [expandedContactId, setExpandedContactId] = useState(null)

  useEffect(() => {
    if (user) fetchTasks()
  }, [user])

  const handleAddTask = async (e) => {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      await addTask(newTaskTitle)
      setNewTaskTitle('')
    }
  }

  const handleSyncTasks = async () => {
    const res = await sync()
    if (res) {
      setSyncStatus(`Synced ${res.newCount} new, ${res.completedCount} completed`)
      setTimeout(() => setSyncStatus(null), 3000)
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

  // Formatting helpers
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
    // Simple recurrent event URL
    const recur = `RRULE:FREQ=DAILY;INTERVAL=${contact.frequency_days}`
    return `https://calendar.google.com/calendar/r/eventedit?text=${text}&details=${details}&recur=${recur}`
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="p-4 pr-14 flex items-center justify-center border-b border-blue-900/20">
        <h3 className="font-display text-starlight">Reminders</h3>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6 pb-20">
        
        {/* Section 1: Today's Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-mono uppercase tracking-widest text-dim">Today's Tasks</h4>
              <button onClick={() => setShowSurprise(true)} className="text-amber-500 hover:text-amber-400 hover:scale-110 transition-transform flex items-center justify-center p-1" title="Surprise Me">
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              {syncStatus && <span className="text-xs text-emerald whitespace-nowrap">{syncStatus}</span>}
              <button 
                onClick={handleSyncTasks} 
                disabled={isSyncing}
                className="text-dim hover:text-sky transition-colors flex items-center justify-center p-1"
                title="Sync Google Tasks"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="glass glass-hover hover:-translate-y-1 transition-transform border border-blue-900/20 p-3 rounded-xl flex items-start gap-3 group">
                <button 
                  onClick={(e) => toggleComplete(task, e)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${task.completed ? 'border-emerald-400 bg-emerald-400/20 text-emerald-400' : 'border-dim group-hover:border-emerald-400 text-transparent'}`}
                >
                  <Check className="w-3 h-3" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-starlight leading-snug">
                    <span className={`transition-all ${task.completed ? 'text-dim line-through decoration-dim/50' : 'text-starlight'}`}>
                      {task.title}
                    </span>
                    {(task.target > 1 || (task.unit && task.unit !== 'done')) && (
                      <span className="text-xs text-dim whitespace-nowrap ml-2">
                        {task.current}/{task.target} {task.unit !== 'done' ? task.unit : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-xs text-dim italic">No tasks left today. Great job!</p>}
          </div>

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
            <h4 className="text-xs font-mono uppercase tracking-widest text-dim">Nudges</h4>
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
          <h4 className="text-xs font-mono uppercase tracking-widest text-dim">Reach Out</h4>
          <div className="space-y-2">
            {contacts.map(contact => (
              <div key={contact.id} className="glass glass-hover hover:-translate-y-1 transition-transform border border-blue-900/20 p-3 rounded-xl">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedContactId(expandedContactId === contact.id ? null : contact.id)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-starlight">{contact.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider border ${TIER_COLORS[contact.tier] || TIER_COLORS.yard}`}>
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
        toggleComplete={toggleComplete} 
      />
    </div>
  )
}

export default RemindersPanel
