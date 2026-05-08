import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, X, Check, Trophy } from 'lucide-react'

const SCOPES = ['weekly', 'monthly', 'quarterly', 'yearly', '5yr']

const SCOPE_COLORS = {
  weekly: 'text-emerald border-emerald/30 bg-emerald/10',
  monthly: 'text-pulsar border-pulsar/30 bg-pulsar/10',
  quarterly: 'text-aurora border-aurora/30 bg-aurora/10',
  yearly: 'text-gold border-gold/30 bg-gold/10',
  '5yr': 'text-nova border-nova/30 bg-nova/10',
}

const BAR_COLORS = {
  weekly: 'from-emerald to-emerald/60',
  monthly: 'from-pulsar to-nova',
  quarterly: 'from-aurora to-pulsar',
  yearly: 'from-gold to-gold/60',
  '5yr': 'from-nova to-aurora',
}

const GoalsPanel = () => {
  const { user, addXP } = useAuth()
  const [activeScope, setActiveScope] = useState('weekly')
  const [goals, setGoals] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', target: '', unit: '', scope: 'weekly', xp_reward: 50, parent_goal_id: '' })
  const [allGoals, setAllGoals] = useState([])

  useEffect(() => { fetchGoals() }, [activeScope])

  const fetchGoals = async () => {
    const { data } = await supabase.from('goals')
      .select('*').eq('user_id', user.id).eq('scope', activeScope)
      .order('created_at', { ascending: false })
    setGoals(data || [])
    
    const { data: all } = await supabase.from('goals')
      .select('id, title, scope').eq('user_id', user.id)
    setAllGoals(all || [])
  }

  const addGoal = async () => {
    if (!form.title || !form.target) return
    const payload = {
      title: form.title,
      target: parseFloat(form.target),
      unit: form.unit,
      scope: form.scope,
      xp_reward: parseInt(form.xp_reward),
      parent_goal_id: form.parent_goal_id || null,
      user_id: user.id
    }
    await supabase.from('goals').insert(payload)
    setForm({ title: '', target: '', unit: '', scope: activeScope, xp_reward: 50, parent_goal_id: '' })
    setShowModal(false)
    fetchGoals()
  }

  const updateProgress = async (goal, delta) => {
    const newCurrent = Math.max(0, Math.min(goal.current + delta, goal.target))
    const completed = newCurrent >= goal.target
    
    // Optimistic UI
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current: newCurrent, completed } : g))
    
    await supabase.from('goals').update({ current: newCurrent, completed }).eq('id', goal.id)
    if (completed && !goal.completed) await addXP(goal.xp_reward)
    if (!completed && goal.completed) await addXP(-(goal.xp_reward || 0))
    fetchGoals()
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  const completedCount = goals.filter(g => g.completed).length
  const totalXP = goals.filter(g => g.completed).reduce((s, g) => s + (g.xp_reward || 0), 0)

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Scope tabs */}
        <div className="flex gap-1 p-1 bg-stardust/40 rounded-xl border border-blue-900/20">
          {SCOPES.map(scope => (
            <button key={scope} onClick={() => setActiveScope(scope)}
              className={`flex-1 py-1.5 text-xs font-display tracking-wider rounded-lg transition-all ${
                activeScope === scope ? `${SCOPE_COLORS[scope]} border` : 'text-dim hover:text-starlight'
              }`}>
              {scope === '5yr' ? '5 YR' : scope.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Summary row */}
        {goals.length > 0 && (
          <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5 text-xs font-mono text-dim">
              <Trophy className="w-3 h-3 text-gold" />
              {completedCount}/{goals.length} complete
            </div>
            <div className="flex-1 h-px bg-blue-900/20" />
            <span className="text-xs font-mono text-gold">+{totalXP} XP earned</span>
          </div>
        )}

        {/* Goals list */}
        <div className="space-y-4">
          {goals.map(goal => {
            const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0
            return (
              <div key={goal.id} className={`glass rounded-xl p-4 border ${goal.completed ? 'border-emerald/20' : 'border-blue-900/20'} group`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-sm font-body ${goal.completed ? 'text-dim line-through' : 'text-starlight'}`}>{goal.title}</p>
                    {goal.parent_goal_id && (
                      <p className="text-[10px] text-dim/60 font-body flex items-center gap-1 mt-0.5">
                        ↳ Links to: {allGoals.find(g => g.id === goal.parent_goal_id)?.title || 'Unknown'}
                      </p>
                    )}
                    {goal.completed && <span className="text-xs text-emerald font-mono mt-1 block">+{goal.xp_reward} XP ✦</span>}
                  </div>
                  <button onClick={() => deleteGoal(goal.id)} className="text-dim hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-stardust rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full xp-bar-fill bg-gradient-to-r ${BAR_COLORS[activeScope]} transition-all duration-500`}
                    style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-dim">
                    {goal.current} / {goal.target} {goal.unit}
                    <span className="text-blue-900/60 mx-1">·</span>
                    <span className={SCOPE_COLORS[activeScope].split(' ')[0]}>{Math.round(pct)}%</span>
                  </span>
                  {goal.completed ? (
                    <button onClick={() => updateProgress(goal, -1)} title="Undo completion"
                      className="w-5 h-5 rounded border border-emerald/30 text-emerald hover:text-danger text-xs flex items-center justify-center hover:bg-emerald/10 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateProgress(goal, -1)}
                        className="w-5 h-5 rounded border border-blue-900/30 text-dim hover:text-starlight text-xs flex items-center justify-center transition-colors">−</button>
                      <button onClick={() => updateProgress(goal, 1)}
                        className="w-5 h-5 rounded border border-blue-900/30 text-dim hover:text-emerald text-xs flex items-center justify-center transition-colors">+</button>
                      {goal.current + 1 >= goal.target && (
                        <button onClick={() => updateProgress(goal, goal.target - goal.current)}
                          className="w-5 h-5 rounded border border-emerald/30 text-emerald text-xs flex items-center justify-center hover:bg-emerald/10 transition-colors">
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {!goals.length && (
            <div className="text-center py-12">
              <p className="text-dim font-body text-sm italic">No {activeScope} goals yet.</p>
              <p className="text-dim/50 font-body text-xs mt-1">What do you want to accomplish this {activeScope === '5yr' ? '5 years' : activeScope}?</p>
            </div>
          )}
        </div>

        {/* Add button */}
        <button onClick={() => { setForm(f => ({ ...f, scope: activeScope })); setShowModal(true) }}
          className="w-full py-3 border border-dashed border-blue-900/30 rounded-xl text-dim hover:text-nova hover:border-nova/30 transition-all text-sm font-body flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add {activeScope} goal
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display tracking-wider text-starlight">New {activeScope} goal</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-dim" /></button>
            </div>
            <input placeholder="Goal title" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div className="flex gap-3">
              <input type="number" placeholder="Target" className="flex-1 bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40"
                value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
              <input placeholder="unit (hrs, papers...)" className="flex-1 bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
                value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div className="flex gap-3 items-center">
              <label className="text-xs text-dim font-body">XP reward</label>
              <input type="number" className="w-20 bg-stardust/50 text-sm text-gold border border-gold/20 rounded-lg px-3 py-2 outline-none font-mono"
                value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: e.target.value }))} />
            </div>
            {activeScope !== '5yr' && (
              <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none font-body"
                value={form.parent_goal_id} onChange={e => setForm(f => ({ ...f, parent_goal_id: e.target.value }))}>
                <option value="">No parent goal linked</option>
                {allGoals.filter(g => {
                  const ranks = { weekly: 1, monthly: 2, quarterly: 3, yearly: 4, '5yr': 5 }
                  return ranks[g.scope] > ranks[activeScope]
                }).map(g => (
                  <option key={g.id} value={g.id}>{g.title} ({g.scope})</option>
                ))}
              </select>
            )}
            <button onClick={addGoal}
              className={`w-full py-2 border text-sm font-display tracking-wider rounded-lg transition-colors ${SCOPE_COLORS[activeScope]} hover:opacity-80`}>
              ADD GOAL
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoalsPanel
