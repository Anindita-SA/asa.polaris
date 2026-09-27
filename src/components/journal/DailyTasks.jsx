import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Check, X, Plus, Sparkles, RefreshCw } from 'lucide-react'
import { playChime } from '../../lib/sound'
import { XP } from '../../data/xpRewards'
import { useCelebration } from '../../hooks/useCelebration'
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../../lib/offlineApi'

const DailyTasks = ({ dateStr }) => {
  const { user, trackXP } = useAuth()
  const { celebrate } = useCelebration()
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const fetchTasks = useCallback(async () => {
    if (!user?.id || !dateStr) return

    // 1. Roll over unfinished recurring tasks to today
    const { data: allUnfinished } = await offlineSelect('daily_tasks', { user_id: user.id, recurring: true, completed: false })
    if (allUnfinished) {
      for (const t of allUnfinished) {
        if (t.date < dateStr) {
          await offlineUpdate('daily_tasks', { id: t.id }, { date: dateStr })
        }
      }
    }

    // 2. Fetch tasks for this date
    const { data } = await offlineSelect('daily_tasks', { user_id: user.id, date: dateStr })
    const sorted = [...(data || [])].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
    setTasks(sorted)
  }, [user?.id, dateStr])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Listen to polaris-tasks-changed events
  useEffect(() => {
    const handleChanged = (e) => {
      if (e.detail?.table === 'daily_tasks') {
        fetchTasks()
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
  }, [fetchTasks])

  const addTask = async () => {
    if (!newTaskTitle.trim() || !user?.id) {
      setIsAdding(false)
      return
    }
    const newId = crypto.randomUUID()
    const { data, error } = await offlineInsert('daily_tasks', {
      id: newId,
      user_id: user.id,
      title: newTaskTitle.trim(),
      date: dateStr,
      recurring: false,
      completed: false
    })

    if (error) {
      console.error('Failed to create daily task:', error)
      return
    }

    if (data && data[0]) {
      setTasks(prev => [...prev, data[0]])
    } else {
      setTasks(prev => [...prev, { id: newId, user_id: user.id, title: newTaskTitle.trim(), date: dateStr, recurring: false, completed: false }])
    }
    setNewTaskTitle('')
    setIsAdding(false)
  }

  const toggleTask = async (task) => {
    if (!user?.id) return
    const completed = !task.completed
    const { error } = await offlineUpdate('daily_tasks', { id: task.id }, { completed })

    if (error) {
      console.error('Failed to update daily task:', error)
      return
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed } : t))
    if (completed) {
      playChime('success')
      celebrate()
    }
    trackXP(task.completed, completed, XP.TASK_COMPLETE)
  }

  const toggleRecurring = async (task) => {
    if (!user?.id) return
    const recurring = !task.recurring
    const { error } = await offlineUpdate('daily_tasks', { id: task.id }, { recurring })
    if (error) {
      console.error('Failed to update recurring state on daily task:', error)
      return
    }

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, recurring } : t))
  }

  const deleteTask = async (id) => {
    if (!user?.id) return
    const { error } = await offlineDelete('daily_tasks', { id })
    if (error) {
      console.error('Failed to delete daily task:', error)
      return
    }
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const progress = tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0

  return (
    <div className="glass border border-pulsar/30 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-starlight text-lg flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-nova" /> Daily Target Tasks
          </h3>
          <p className="text-xs text-nova/60 font-mono mt-1">{progress}% achieved today</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="text-nova/60 hover:text-nova transition-colors p-1 bg-pulsar/10 hover:bg-white/10 rounded">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} 
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
              task.completed ? 'border-emerald/30 bg-emerald/5' : 'border-blue-900/10 bg-pulsar/10 hover:border-pulsar/40'
            }`}
          >
            <button 
              onClick={() => toggleTask(task)}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                task.completed ? 'border-emerald bg-emerald text-void ' : 'border-blue-900/40 hover:border-nova text-transparent'
              }`}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </button>
            
            <span className={`flex-1 text-sm font-body transition-colors ${
              task.completed ? 'text-nova/60 line-through opacity-50' : 'text-starlight'
            }`}>
              {task.title}
            </span>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => toggleRecurring(task)} className={`p-1 transition-colors ${task.recurring ? 'text-pulsar' : 'text-nova/60 hover:text-pulsar'}`} title={task.recurring ? 'Repeating Task' : 'Make Repeating'}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => deleteTask(task.id)} className="p-1 text-nova/60 hover:text-danger">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2 mt-2">
            <input 
              autoFocus
              type="text" 
              placeholder="What must be done today?" 
              className="flex-1 bg-black/20 border border-pulsar/40 rounded-lg px-3 py-2 text-sm text-starlight outline-none focus:border-nova font-body"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              onBlur={() => { if (!newTaskTitle) setIsAdding(false) }}
            />
            <button onClick={addTask} className="px-3 py-2 bg-nova/20 text-nova border border-nova/30 rounded-lg text-xs font-mono uppercase tracking-wider">
              Add
            </button>
          </div>
        )}

        {tasks.length === 0 && !isAdding && (
          <p className="text-xs text-nova/60 italic font-body text-center py-2">No target tasks set for today.</p>
        )}
      </div>
    </div>
  )
}

export default DailyTasks
