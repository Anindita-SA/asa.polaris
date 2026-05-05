import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { X, Target, Flag, Plus, Check, Zap } from 'lucide-react'

const NODE_COLORS = {
  root: 'text-gold border-gold/30',
  career: 'text-pulsar border-pulsar/30',
  academic: 'text-aurora border-aurora/30',
  self: 'text-emerald border-emerald/30',
}

const NodePanel = ({ node, onClose }) => {
  const { user, addXP } = useAuth()
  const [goals, setGoals] = useState([])
  const [milestones, setMilestones] = useState([])
  const [addingGoal, setAddingGoal] = useState(false)
  const [newGoal, setNewGoal] = useState({ title: '', scope: 'weekly', target: '', unit: '' })
  const [subtasks, setSubtasks] = useState([])
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [taskDescription, setTaskDescription] = useState('')
  const [generatedSteps, setGeneratedSteps] = useState([])

  useEffect(() => {
    if (!node) return
    fetchGoals()
    fetchMilestones()
    fetchSubtasks()
  }, [node])

  const fetchGoals = async () => {
    const { data } = await supabase.from('goals').select('*').eq('node_id', node.id).eq('user_id', user.id)
    setGoals(data || [])
  }

  const fetchMilestones = async () => {
    const { data } = await supabase.from('milestones').select('*').eq('user_id', user.id)
    setMilestones(data || [])
  }

  const fetchSubtasks = async () => {
    const { data } = await supabase.from('subtasks').select('*')
      .eq('user_id', user.id).eq('parent_type', 'node').eq('parent_id', node.id).order('position')
    setSubtasks(data || [])
  }

  const addGoal = async () => {
    if (!newGoal.title || !newGoal.target) return
    await supabase.from('goals').insert({
      ...newGoal,
      node_id: node.id,
      user_id: user.id,
      target: parseFloat(newGoal.target),
    })
    setNewGoal({ title: '', scope: 'weekly', target: '', unit: '' })
    setAddingGoal(false)
    fetchGoals()
  }

  const incrementGoal = async (goal) => {
    const newCurrent = Math.min(goal.current + 1, goal.target)
    const completed = newCurrent >= goal.target
    await supabase.from('goals').update({ current: newCurrent, completed }).eq('id', goal.id)
    if (completed && !goal.completed) await addXP(goal.xp_reward || 50)
    fetchGoals()
  }

  const completeMilestone = async (ms) => {
    if (ms.status === 'done') return
    await supabase.from('milestones').update({ status: 'done' }).eq('id', ms.id)
    await addXP(ms.xp_reward || 100)
    fetchMilestones()
  }

  const breakDownTask = async () => {
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!key || !taskDescription.trim()) return
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a task breakdown assistant. Given a project or task, return ONLY a JSON array of 5-10 short, specific, actionable steps. No markdown, no preamble, just the JSON array of strings.',
        messages: [{ role: 'user', content: taskDescription }],
      }),
    })
    const data = await response.json()
    const text = data?.content?.[0]?.text || '[]'
    const parsed = JSON.parse(text)
    setGeneratedSteps(Array.isArray(parsed) ? parsed : [])
  }

  const saveSubtasks = async () => {
    if (!generatedSteps.length) return
    await supabase.from('subtasks').insert(generatedSteps.map((title, idx) => ({
      user_id: user.id,
      parent_id: node.id,
      parent_type: 'node',
      title,
      position: idx,
    })))
    setShowBreakdown(false)
    setGeneratedSteps([])
    setTaskDescription('')
    fetchSubtasks()
  }

  const toggleSubtask = async (task) => {
    await supabase.from('subtasks').update({ completed: !task.completed }).eq('id', task.id).eq('user_id', user.id)
    fetchSubtasks()
  }

  if (!node) return null

  const colorClass = NODE_COLORS[node.type] || NODE_COLORS.career
  const scopeOrder = ['weekly', 'monthly', 'quarterly', 'yearly', '5yr']

  const nodeTypeMilestones = milestones.filter(m => {
    // Exact match via note string (our new standard)
    if (m.note && m.note.includes(`[Node: ${node.id}]`)) return true
    
    // Fallback keyword matching for legacy default milestones
    const titleLower = m.title.toLowerCase()
    if (node.type === 'career') return titleLower.includes('portfolio') || titleLower.includes('chaarg') || titleLower.includes('email') || titleLower.includes('application')
    if (node.type === 'academic') return titleLower.includes('dab') || titleLower.includes('survey') || titleLower.includes('moi') || titleLower.includes('ielts')
    return false
  })

  return (
    <div className="panel-enter fixed right-0 top-14 bottom-0 w-80 glass border-l border-blue-900/20 z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`p-4 border-b border-blue-900/20 flex items-start justify-between`}>
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${colorClass.split(' ')[0]}`}>{node.type}</p>
          <h2 className="font-display text-starlight tracking-wider">{node.title}</h2>
          <p className="text-xs text-dim font-body mt-1">{node.description}</p>
        </div>
        <button onClick={onClose} className="text-dim hover:text-starlight transition-colors mt-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Goals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display tracking-widest text-dim uppercase flex items-center gap-2">
              <Target className="w-3 h-3" /> Goals
            </p>
            <button onClick={() => setAddingGoal(!addingGoal)} className="text-dim hover:text-nova transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setShowBreakdown(true)} className="mb-2 text-xs text-gold flex items-center gap-1">
            <Zap className="w-3 h-3" /> Break it down
          </button>

          {addingGoal && (
            <div className="mb-3 p-3 bg-cosmic/40 rounded-lg border border-blue-900/20 space-y-2">
              <input placeholder="Goal title" className="w-full bg-transparent text-xs text-starlight border-b border-blue-900/30 outline-none pb-1 font-body"
                value={newGoal.title} onChange={e => setNewGoal(g => ({ ...g, title: e.target.value }))} />
              <div className="flex gap-2">
                <select className="bg-stardust text-xs text-dim rounded px-2 py-1 flex-1"
                  value={newGoal.scope} onChange={e => setNewGoal(g => ({ ...g, scope: e.target.value }))}>
                  {scopeOrder.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input placeholder="Target" type="number" className="bg-transparent text-xs text-starlight border-b border-blue-900/30 outline-none w-16 pb-1"
                  value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: e.target.value }))} />
                <input placeholder="unit" className="bg-transparent text-xs text-dim border-b border-blue-900/30 outline-none w-12 pb-1"
                  value={newGoal.unit} onChange={e => setNewGoal(g => ({ ...g, unit: e.target.value }))} />
              </div>
              <button onClick={addGoal} className="text-xs text-emerald font-body hover:underline">+ Add goal</button>
            </div>
          )}

          <div className="space-y-3">
            {goals.map(goal => {
              const pct = Math.min((goal.current / goal.target) * 100, 100)
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-starlight font-body">{goal.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-dim">{goal.current}/{goal.target} {goal.unit}</span>
                      {!goal.completed && (
                        <button onClick={() => incrementGoal(goal)} className="text-dim hover:text-emerald transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1 bg-stardust rounded-full overflow-hidden">
                    <div className={`h-full rounded-full xp-bar-fill transition-all duration-500 ${goal.completed ? 'bg-emerald' : 'bg-gradient-to-r from-pulsar to-aurora'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-xs font-mono ${colorClass.split(' ')[0]}`}>{goal.scope}</span>
                    {goal.completed && <span className="text-xs text-emerald">+{goal.xp_reward}xp ✦</span>}
                  </div>
                </div>
              )
            })}
            {!goals.length && <p className="text-xs text-dim font-body italic">No goals yet. Add one above.</p>}
          </div>
        </div>

        {!!subtasks.length && (
          <div>
            <p className="text-xs font-display tracking-widest text-dim uppercase mb-2">Subtasks</p>
            <div className="space-y-1">
              {subtasks.map(task => (
                <button key={task.id} onClick={() => toggleSubtask(task)} className="w-full text-left text-xs py-1 text-starlight/90">
                  <span className={task.completed ? 'text-emerald line-through' : 'text-starlight'}>{task.completed ? '✓' : '○'} {task.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Linked milestones */}
        {nodeTypeMilestones.length > 0 && (
          <div>
            <p className="text-xs font-display tracking-widest text-dim uppercase flex items-center gap-2 mb-3">
              <Flag className="w-3 h-3" /> Milestones
            </p>
            <div className="space-y-2">
              {nodeTypeMilestones.map(ms => (
                <div key={ms.id} className={`flex items-start justify-between p-2 rounded-lg border ${ms.status === 'done' ? 'border-emerald/20 bg-emerald/5' : 'border-blue-900/20 bg-stardust/30'}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-body ${ms.status === 'done' ? 'text-dim line-through' : 'text-starlight'}`}>{ms.title}</p>
                    <p className="text-xs font-mono text-dim mt-0.5">{new Date(ms.deadline).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                  </div>
                  {ms.status !== 'done' && (
                    <button onClick={() => completeMilestone(ms)} className="text-dim hover:text-emerald transition-colors ml-2 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showBreakdown && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowBreakdown(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-lg space-y-3">
            <h3 className="font-display text-starlight">Task breakdown</h3>
            <textarea rows={4} value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none"
              placeholder="Describe what you need to break down..." />
            <button onClick={breakDownTask} className="w-full py-2 bg-gold/20 border border-gold/30 text-gold rounded-lg text-sm">BREAK IT DOWN</button>
            {generatedSteps.map((step, idx) => <p key={idx} className="text-xs text-starlight">{idx + 1}. {step}</p>)}
            {!!generatedSteps.length && <button onClick={saveSubtasks} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar rounded-lg text-sm">SAVE TO POLARIS</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default NodePanel
