import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Check, X, Plus, Sparkles } from 'lucide-react'
import { playChime } from '../../lib/sound'

const DailyTasks = ({ dateStr }) => {
  const { user, addXP } = useAuth()
  const [tasks, setTasks] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (user && dateStr) fetchTasks()
  }, [user, dateStr])

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .order('created_at', { ascending: true })
    setTasks(data || [])
  }

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      setIsAdding(false)
      return
    }
    const { data } = await supabase.from('daily_tasks').insert({
      user_id: user.id,
      title: newTaskTitle,
      date: dateStr,
    }).select().single()
    
    if (data) {
      setTasks(prev => [...prev, data])
      setNewTaskTitle('')
      setIsAdding(false)
    }
  }

  const toggleTask = async (task) => {
    const completed = !task.completed
    await supabase.from('daily_tasks').update({ completed }).eq('id', task.id)
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed } : t))
    
    if (completed) {
      playChime('success')
      await addXP(3) // small dopamine hit XP
    } else {
      await addXP(-3)
    }
  }

  const deleteTask = async (id) => {
    await supabase.from('daily_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const progress = tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0

  return (
    <div className="glass border border-blue-900/20 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display tracking-widest text-starlight text-xs uppercase flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-nova" /> Daily Target Tasks
          </h3>
          <p className="text-[10px] text-dim font-mono mt-1">{progress}% achieved today</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="text-dim hover:text-nova transition-colors p-1 bg-white/5 hover:bg-white/10 rounded">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.map(task => (
          <div key={task.id} 
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all group ${
              task.completed ? 'border-emerald/30 bg-emerald/5' : 'border-blue-900/10 bg-white/5 hover:border-blue-900/30'
            }`}
          >
            <button 
              onClick={() => toggleTask(task)}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                task.completed ? 'border-emerald bg-emerald text-void shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'border-blue-900/40 hover:border-nova text-transparent'
              }`}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </button>
            
            <span className={`flex-1 text-sm font-body transition-colors ${
              task.completed ? 'text-dim line-through opacity-50' : 'text-starlight'
            }`}>
              {task.title}
            </span>
            
            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-dim hover:text-danger">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2 mt-2">
            <input 
              autoFocus
              type="text" 
              placeholder="What must be done today?" 
              className="flex-1 bg-black/20 border border-blue-900/30 rounded-lg px-3 py-2 text-sm text-starlight outline-none focus:border-nova font-body"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              onBlur={() => { if (!newTaskTitle) setIsAdding(false) }}
            />
            <button onClick={addTask} className="px-3 py-2 bg-nova/20 text-nova border border-nova/30 rounded-lg text-xs font-display">
              ADD
            </button>
          </div>
        )}

        {tasks.length === 0 && !isAdding && (
          <p className="text-xs text-dim italic font-body text-center py-2">No target tasks set for today.</p>
        )}
      </div>
    </div>
  )
}

export default DailyTasks
