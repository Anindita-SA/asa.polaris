import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { X, Target, Flag, Plus, Check } from 'lucide-react'

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

  useEffect(() => {
    if (!node) return
    fetchGoals()
    fetchMilestones()
  }, [node])

  const fetchGoals = async () => {
    const { data } = await supabase.from('goals').select('*').eq('node_id', node.id).eq('user_id', user.id)
    setGoals(data || [])
  }

  const fetchMilestones = async () => {
    const { data } = await supabase.from('milestones').select('*').eq('user_id', user.id)
    setMilestones(data || [])
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

  if (!node) return null

  const colorClass = NODE_COLORS[node.type] || NODE_COLORS.career
  const scopeOrder = ['weekly', 'monthly', 'quarterly', 'yearly', '5yr']

  const nodeTypeMilestones = milestones.filter(m => {
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
    </div>
  )
}

export default NodePanel
