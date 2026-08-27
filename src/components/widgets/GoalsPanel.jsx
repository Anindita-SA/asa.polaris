import { getGroqKey } from '../../lib/llm';
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, X, Check, Trophy, Compass, Edit2, Info, Calendar, Zap, MessageSquare, RefreshCw } from 'lucide-react'
import { playChime } from '../../lib/sound'
import { useCelebration } from '../../hooks/useCelebration'
import { useGoalCompletion } from '../../hooks/useGoalCompletion'

const SCOPES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', '5yr']

const SCOPE_COLORS = {
  daily: 'text-sky border-sky/30 bg-sky/10',
  weekly: 'text-emerald border-emerald/30 bg-emerald/10',
  monthly: 'text-pulsar border-pulsar/30 bg-pulsar/10',
  quarterly: 'text-aurora border-aurora/30 bg-aurora/10',
  yearly: 'text-gold border-gold/30 bg-gold/10',
  '5yr': 'text-nova border-nova/30 bg-nova/10',
  side_quest: 'text-orange-400 border-orange-400/30 bg-orange-400/10'
}

const BAR_COLORS = {
  daily: 'bg-emerald',
  weekly: 'bg-pulsar',
  monthly: 'bg-aurora',
  yearly: 'bg-gold'
}

const GoalsPanel = ({ filterNodeId, onJumpToNode }) => {
  const { user, addXP, trackXP, providerToken } = useAuth()
  const { updateGoalProgress } = useGoalCompletion()
  const [goalCategory, setGoalCategory] = useState('campaign') // 'campaign' | 'side_quest'
  const [activeScope, setActiveScope] = useState('daily')
  const [goals, setGoals] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [expandedGoalId, setExpandedGoalId] = useState(null)
  
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditFeedback, setAuditFeedback] = useState(null)

  const emptyForm = { id: null, title: '', target: '', unit: '', scope: 'weekly', xp_reward: 50, parent_goal_id: '', description: '', deadline: '', node_id: filterNodeId || '' }
  const [form, setForm] = useState(emptyForm)
  const [allGoals, setAllGoals] = useState([])
  const [allNodes, setAllNodes] = useState([])

  useEffect(() => { fetchGoals() }, [activeScope, goalCategory, filterNodeId])

  const fetchGoals = async () => {
    const scopeToFetch = goalCategory === 'side_quest' ? 'side_quest' : activeScope
    
    let query = supabase.from('goals').select('*').eq('user_id', user.id).eq('scope', scopeToFetch)
    if (filterNodeId) query = query.eq('node_id', filterNodeId)
    
    const { data } = await query.order('created_at', { ascending: false })
    setGoals(data || [])
    
    const { data: all } = await supabase.from('goals')
      .select('id, title, scope').eq('user_id', user.id)
    setAllGoals(all || [])

    const { data: nodes } = await supabase.from('nodes').select('id, title').eq('user_id', user.id)
    setAllNodes(nodes || [])
  }

  const createGCalEvent = async (goal, silent = false) => {
    if (!providerToken) {
      if (!silent) alert('Google Calendar permission missing. Please log out and sign in again with Google to grant access.')
      return
    }
    const parentName = allGoals.find(g => g.id === goal.parent_goal_id)?.title || 'None'
    const dateStr = goal.deadline || new Date().toISOString().slice(0, 10)
    
    // We create a timed event from 18:00 to 19:00 with reminders
    const startTime = `${dateStr}T18:00:00`
    const endTime = `${dateStr}T19:00:00`
    
    const event = {
      summary: `Goal: ${goal.title}`,
      description: `Goal Context: ${goal.description || ''}\nParent Goal: ${parentName}\nWorkload Target: ${goal.target} ${goal.unit}`,
      start: {
        dateTime: startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 120 }, // 4:00 PM
          { method: 'popup', minutes: 30 }   // 5:30 PM
        ]
      }
    }

    try {
      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      })
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          if (!silent) alert('Google Calendar permission missing. Please log out and sign in again to grant access.')
        } else {
          console.error('GCal Sync Error:', await res.text())
        }
      } else {
        if (!silent) alert('Successfully synced to Google Calendar!')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const saveGoal = async () => {
    if (!form.title || !form.target) return
    const payload = {
      title: form.title,
      target: parseFloat(form.target),
      unit: form.unit,
      scope: goalCategory === 'side_quest' ? 'side_quest' : form.scope,
      xp_reward: parseInt(form.xp_reward),
      parent_goal_id: form.parent_goal_id || null,
      description: form.description || null,
      deadline: form.deadline || null,
      node_id: form.node_id || null,
      user_id: user.id
    }

    let savedGoal = { ...payload }

    if (isEditing && form.id) {
      await supabase.from('goals').update(payload).eq('id', form.id)
      savedGoal.id = form.id
    } else {
      const { data } = await supabase.from('goals').insert(payload).select().single()
      if (data) savedGoal = data
      
      // Auto-sync new goals if we have a token
      if (providerToken && savedGoal.id) {
        createGCalEvent(savedGoal, true)
      }
    }

    setForm(emptyForm)
    setShowModal(false)
    setIsEditing(false)
    fetchGoals()
  }

  const openEditModal = (goal) => {
    setForm({
      id: goal.id,
      title: goal.title,
      target: goal.target,
      unit: goal.unit,
      scope: goal.scope,
      xp_reward: goal.xp_reward,
      parent_goal_id: goal.parent_goal_id || '',
      description: goal.description || '',
      deadline: goal.deadline || '',
      node_id: goal.node_id || filterNodeId || ''
    })
    setIsEditing(true)
    setShowModal(true)
  }

  const updateProgress = async (goal, delta, e) => {
    await updateGoalProgress(goal, delta, (updatedGoal) => {
      setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g))
    }, e)
    fetchGoals()
  }

  const deleteGoal = async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    fetchGoals()
  }

  const syncToGCal = async (goal) => {
    if (providerToken) {
      await createGCalEvent(goal, false)
    } else {
      const text = encodeURIComponent(goal.title)
      const parentName = allGoals.find(g => g.id === goal.parent_goal_id)?.title || 'None'
      const details = encodeURIComponent(`Goal Context: ${goal.description || ''}\nParent Goal: ${parentName}\nWorkload Target: ${goal.target} ${goal.unit}`)
      const dates = goal.deadline ? `${goal.deadline.replace(/-/g, '')}/${goal.deadline.replace(/-/g, '')}` : ''
      let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}`
      if (dates) url += `&dates=${dates}`
      window.open(url, '_blank')
    }
  }

  const auditGoals = async () => {
    setIsAuditing(true)
    setAuditFeedback(null)
    try {
      const prompt = `You are an elite, empathetic AI life coach using a Star-Map Hybrid Algorithm. Review these active goals for the user. Give exactly 2-3 sentences of warm validation, then 2-3 short bullet points of sharp, scannable critique regarding target realisticness, deadlines, or linkages.\n\nGoals: ${JSON.stringify(goals.map(g => ({title: g.title, target: g.target, unit: g.unit, deadline: g.deadline})))}`
      
      const key = getGroqKey()
      if (!key) throw new Error("No Groq API Key")
      
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      setAuditFeedback(data.choices[0].message.content)
    } catch (err) {
      console.error(err)
      setAuditFeedback("Audit unavailable. Please check your Groq API key connection.")
    } finally {
      setIsAuditing(false)
    }
  }

  const migrateGoal = async (id) => {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('goals').update({ deadline: today }).eq('id', id)
    fetchGoals()
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const [hidePastCompleted, setHidePastCompleted] = useState(true)

  const displayScope = goalCategory === 'side_quest' ? 'side_quest' : activeScope

  const filteredGoals = goals.filter(g => {
    if (displayScope === 'daily' && hidePastCompleted) {
      // Hide if it is completed and the deadline was before today
      if (g.completed && g.deadline && g.deadline < todayStr) return false
    }
    return true
  })

  const completedCount = filteredGoals.filter(g => g.completed).length
  const totalXP = filteredGoals.filter(g => g.completed).reduce((s, g) => s + (g.xp_reward || 0), 0)


  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Top Category Toggle */}
        <div className="flex gap-6 border-b border-blue-900/20 pb-2">
          <button onClick={() => setGoalCategory('campaign')} 
            className={`text-sm font-display pb-2 transition-colors ${goalCategory === 'campaign' ? 'text-starlight border-b-2 border-nova' : 'text-dim hover:text-starlight'}`}>
            Main Campaign
          </button>
          <button onClick={() => setGoalCategory('side_quest')} 
            className={`text-sm font-display pb-2 flex items-center gap-2 transition-colors ${goalCategory === 'side_quest' ? 'text-starlight border-b-2 border-gold' : 'text-dim hover:text-starlight'}`}>
            Side Quests <Compass className="w-4 h-4 text-gold" />
          </button>
        </div>

        {/* Scope tabs (Campaign only) */}
        {goalCategory === 'campaign' && (
          <div className="flex gap-1 p-1 bg-stardust/40 rounded-xl border border-blue-900/20 flex-wrap">
            {SCOPES.map(scope => (
              <button key={scope} onClick={() => setActiveScope(scope)}
                className={`flex-1 py-1.5 text-xs font-display rounded-lg transition-all min-w-[70px] ${
                  activeScope === scope ? `${SCOPE_COLORS[scope]} border` : 'text-dim hover:text-starlight'
                }`}>
                {scope === '5yr' ? '5 YR' : scope}
              </button>
            ))}
          </div>
        )}

        {/* Auditor Feature & Filters */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          {filteredGoals.length > 0 ? (
            <div className="flex items-center gap-4 px-1 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-mono text-dim">
                <Trophy className="w-3 h-3 text-gold" />
                {completedCount}/{filteredGoals.length} complete
              </div>
              <div className="flex-1 h-px bg-blue-900/20 mx-4" />
              <span className="text-xs font-mono text-gold">+{totalXP} XP</span>
            </div>
          ) : <div className="flex-1" />}
          
          <div className="flex items-center gap-2">
            {displayScope === 'daily' && (
              <button onClick={() => setHidePastCompleted(!hidePastCompleted)}
                className={`text-xs font-body px-2 py-1.5 rounded-lg border transition-colors ${hidePastCompleted ? 'border-sky/30 text-sky bg-sky/10' : 'border-blue-900/30 text-dim hover:text-starlight'}`}>
                {hidePastCompleted ? 'Hiding Past' : 'Show All'}
              </button>
            )}
            <button onClick={auditGoals} disabled={isAuditing}
              className="flex items-center gap-2 px-3 py-1.5 glass border border-nova/30 rounded-lg text-nova text-xs font-display hover:bg-nova/10 transition-colors">
              {isAuditing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Audit Goals
            </button>
          </div>
        </div>

        {/* Auditor Feedback Drawer */}
        {auditFeedback && (
          <div className="glass border border-nova/20 rounded-xl p-4 bg-nova/5 animate-fade-in relative">
            <button onClick={() => setAuditFeedback(null)} className="absolute top-3 right-3 text-dim hover:text-starlight">
              <X className="w-4 h-4" />
            </button>
            <div className="flex gap-3">
              <MessageSquare className="w-5 h-5 text-nova flex-shrink-0 mt-1" />
              <div className="text-sm font-body text-starlight/80 whitespace-pre-wrap leading-relaxed">
                {auditFeedback}
              </div>
            </div>
          </div>
        )}

        {/* Goals list */}
        <div className="space-y-4">
          {filteredGoals.map(goal => {
            const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0
            const isExpanded = expandedGoalId === goal.id
            const isPastUnfinished = displayScope === 'daily' && !goal.completed && goal.deadline && goal.deadline < todayStr
            return (
              <div key={goal.id} className={`glass glass-hover hover:-translate-y-1 rounded-xl p-4 border ${goal.completed ? 'border-emerald/20 bg-emerald/5' : 'border-blue-900/20'} group transition-all`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-body ${goal.completed ? 'text-dim line-through' : 'text-starlight'}`}>{goal.title}</p>
                      <button onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)} className="text-dim hover:text-pulsar transition-colors">
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {goal.parent_goal_id && (
                      <p className="text-[10px] text-dim/60 font-body flex items-center gap-1 mt-0.5">
                        ↳ Links to: {allGoals.find(g => g.id === goal.parent_goal_id)?.title || 'Unknown'}
                      </p>
                    )}
                    {goal.node_id && (
                      <button onClick={(e) => { e.stopPropagation(); onJumpToNode && onJumpToNode(goal.node_id) }} className="text-[10px] text-nova/80 hover:text-nova transition-colors font-body flex items-center gap-1 mt-0.5">
                        <Compass className="w-3 h-3" /> Node: {allNodes.find(n => n.id === goal.node_id)?.title || 'Unknown'}
                      </button>
                    )}
                    {goal.deadline && !(displayScope === 'daily' && goal.deadline === todayStr) && (
                      <p className={`text-[10px] font-mono mt-1 flex items-center gap-1 ${isPastUnfinished ? 'text-danger/80' : 'text-orange-300/60'}`}>
                        <Calendar className="w-3 h-3" /> Due: {goal.deadline} {isPastUnfinished && '(Overdue)'}
                      </p>
                    )}
                    {goal.completed && <span className="text-xs text-emerald font-mono mt-1 block">+{goal.xp_reward} XP ✦</span>}
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    {isPastUnfinished && (
                      <button onClick={() => migrateGoal(goal.id)} title="Migrate to Today" className="text-dim hover:text-sky p-1">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {displayScope === 'daily' && (
                      <button onClick={() => syncToGCal(goal)} title="Sync to GCal" className="text-dim hover:text-starlight p-1">
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEditModal(goal)} title="Edit Goal" className="text-dim hover:text-pulsar p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="text-dim hover:text-danger p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Whispering Context Accordion */}
                {isExpanded && goal.description && (
                  <div className="mb-4 pl-3 border-l-2 border-pulsar/30 text-xs text-dim italic font-body animate-fade-in">
                    {goal.description}
                  </div>
                )}

                {/* Progress bar */}
                <div className="h-2 bg-stardust rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full xp-bar-fill bg-emerald transition-all duration-500`}
                    style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-dim">
                    {goal.current} / {goal.target} {goal.unit}
                    <span className="text-blue-900/60 mx-1">·</span>
                    <span className={SCOPE_COLORS[displayScope].split(' ')[0]}>{Math.round(pct)}%</span>
                  </span>
                  {goal.completed ? (
                    <button onClick={(e) => updateProgress(goal, -1, e)} title="Undo completion"
                      className="p-1 hover:text-rose-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-2 bg-blue-950/30 rounded-lg p-1 border border-blue-900/40">
                      <button onClick={(e) => updateProgress(goal, -1, e)}
                        className="w-8 h-8 rounded hover:bg-white/5 flex items-center justify-center transition-colors">
                        <span className="text-xl font-light">-</span>
                      </button>
                      <button onClick={(e) => updateProgress(goal, 1, e)}
                        className="w-8 h-8 rounded hover:bg-white/5 flex items-center justify-center transition-colors">
                        <span className="text-xl font-light">+</span>
                      </button>
                      {goal.target > 1 && (
                        <button onClick={(e) => updateProgress(goal, goal.target - goal.current, e)}
                          className="px-2 h-8 rounded hover:bg-white/5 flex items-center justify-center text-xs font-mono transition-colors">
                          Max
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Empty state */}
          {!filteredGoals.length && (
            <div className="text-center py-12">
              <p className="text-dim font-body text-sm italic">No {displayScope} goals yet.</p>
              <p className="text-dim/50 font-body text-xs mt-1">What do you want to accomplish here?</p>
            </div>
          )}
        </div>

        {/* Add button */}
        <button onClick={() => { 
            setForm({ 
              ...emptyForm, 
              scope: activeScope, 
              deadline: activeScope === 'daily' ? new Date().toISOString().slice(0, 10) : '' 
            }); 
            setIsEditing(false); 
            setShowModal(true);
          }}
          className="w-full py-3 border border-dashed border-blue-900/30 rounded-xl text-dim hover:text-nova hover:border-nova/30 transition-all text-sm font-body flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add {displayScope} goal
        </button>
      </div>

      {/* Modal for Add / Edit */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-t-2xl rounded-b-none md:rounded-2xl p-6 w-full w-full max-w-full md:max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight">{isEditing ? 'Edit' : 'New'} {goalCategory === 'side_quest' ? 'Side Quest' : form.scope} Goal</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-dim" /></button>
            </div>
            
            <input placeholder="Goal title" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              
            <textarea placeholder="Why-Now Context / Description (optional)" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body min-h-[60px]"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              
            <div className="flex gap-3">
              <input type="number" placeholder="Target" className="flex-1 bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40"
                value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} />
              <input placeholder="unit (hrs, papers...)" className="flex-1 bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
                value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 flex gap-3 items-center">
                <label className="text-xs text-dim font-body">XP</label>
                <input type="number" className="w-20 bg-stardust/50 text-sm text-gold border border-gold/20 rounded-lg px-3 py-2 outline-none font-mono"
                  value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: e.target.value }))} />
              </div>
              <div className="flex-1 flex gap-3 items-center">
                <label className="text-xs text-dim font-body"><Calendar className="w-3 h-3 inline" /></label>
                <input type="date" className="flex-1 bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none font-mono"
                  value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>

            {goalCategory !== 'side_quest' && form.scope !== '5yr' && (
              <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none font-body"
                value={form.parent_goal_id} onChange={e => setForm(f => ({ ...f, parent_goal_id: e.target.value }))}>
                <option value="">No parent goal</option>
                {allGoals.filter(g => {
                  const ranks = { daily: 0, weekly: 1, monthly: 2, quarterly: 3, yearly: 4, '5yr': 5 }
                  return ranks[g.scope] === ranks[form.scope] + 1
                }).map(g => (
                  <option key={g.id} value={g.id}>{g.title} ({g.scope})</option>
                ))}
              </select>
            )}

            <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none font-body"
              value={form.node_id} onChange={e => setForm(f => ({ ...f, node_id: e.target.value }))}>
              <option value="">No parent node connection</option>
              {allNodes.map(n => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            
            <button onClick={saveGoal}
              className={`w-full py-2 border text-sm font-display rounded-lg transition-colors ${SCOPE_COLORS[displayScope]} hover:opacity-80`}>
              Save Goal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GoalsPanel
