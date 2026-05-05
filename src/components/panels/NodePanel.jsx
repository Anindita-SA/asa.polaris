import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { X, Target, Flag, Plus, Check, Zap, ChevronRight, ChevronDown, Pencil, Trash2 } from 'lucide-react'

// ─── Colours ────────────────────────────────────────────────────────────────
const TYPE_META = {
  root:     { label: 'Root',     color: 'text-gold   border-gold/30',     dot: 'bg-gold'    },
  career:   { label: 'Node',     color: 'text-pulsar border-pulsar/30',   dot: 'bg-pulsar'  },
  academic: { label: 'Node',     color: 'text-aurora border-aurora/30',   dot: 'bg-aurora'  },
  self:     { label: 'Node',     color: 'text-emerald border-emerald/30', dot: 'bg-emerald' },
  subnode:  { label: 'Subnode',  color: 'text-nova   border-nova/30',     dot: 'bg-nova'    },
  topic:    { label: 'Topic',    color: 'text-dim    border-blue-900/30', dot: 'bg-stardust/60' },
}

const meta = (type) => TYPE_META[type] || TYPE_META.career

// ─── Inline editable label ──────────────────────────────────────────────────
const InlineEdit = ({ value, onSave, className = '' }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  if (!editing) return (
    <span className={className} onDoubleClick={() => { setDraft(value); setEditing(true) }}>{value}</span>
  )
  return (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft.trim() && draft !== value) onSave(draft.trim()) }}
      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditing(false) }}
      className="bg-transparent border-b border-pulsar/60 outline-none text-starlight w-full"
    />
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
const NodePanel = ({ node, onClose, onRefreshGraph }) => {
  const { user, addXP } = useAuth()
  const [goals, setGoals]         = useState([])
  const [milestones, setMilestones] = useState([])
  const [children, setChildren]   = useState([])   // subnodes / topics
  const [expanded, setExpanded]   = useState({})   // subnode id → bool
  const [addingGoal, setAddingGoal] = useState(false)
  const [newGoal, setNewGoal]     = useState({ title: '', scope: 'weekly', target: '', unit: '' })
  const [subtasks, setSubtasks]   = useState([])
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [taskDescription, setTaskDescription] = useState('')
  const [generatedSteps, setGeneratedSteps]   = useState([])
  // Add-child forms
  const [addingChild, setAddingChild] = useState(null) // { parentId, level: 'subnode'|'topic' }
  const [newChildTitle, setNewChildTitle] = useState('')

  const fetchAll = useCallback(async () => {
    if (!node) return
    const [g, m, s, c] = await Promise.all([
      supabase.from('goals').select('*').eq('node_id', node.id).eq('user_id', user.id),
      supabase.from('milestones').select('*').eq('user_id', user.id),
      supabase.from('subtasks').select('*').eq('user_id', user.id).eq('parent_type', 'node').eq('parent_id', node.id).order('position'),
      supabase.from('nodes').select('*').eq('user_id', user.id),
    ])
    setGoals(g.data || [])
    setMilestones(m.data || [])
    setSubtasks(s.data || [])
    // Build children tree: direct children of this node
    const allNodes = c.data || []
    const directChildren = allNodes.filter(n => n.parent_id === node.id)
    // For each subnode, attach topics
    const tree = directChildren.map(sub => ({
      ...sub,
      topics: allNodes.filter(n => n.parent_id === sub.id),
    }))
    setChildren(tree)
  }, [node, user.id])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Node edits ──────────────────────────────────────────────────────────────
  const updateNodeField = async (field, value) => {
    await supabase.from('nodes').update({ [field]: value }).eq('id', node.id)
    onRefreshGraph && onRefreshGraph()
  }

  const deleteNode = async (id) => {
    if (!confirm('Delete this node and all its children? This cannot be undone.')) return
    await supabase.from('nodes').delete().eq('id', id)
    onRefreshGraph && onRefreshGraph()
    fetchAll()
  }

  // ── Add child ───────────────────────────────────────────────────────────────
  const addChild = async () => {
    if (!newChildTitle.trim() || !addingChild) return
    const { parentId, level } = addingChild
    await supabase.from('nodes').insert({
      user_id: user.id,
      title: newChildTitle.trim(),
      type: level,          // 'subnode' or 'topic'
      parent_id: parentId,
      x_pos: 0.4 + Math.random() * 0.2,
      y_pos: 0.4 + Math.random() * 0.2,
    })
    setNewChildTitle('')
    setAddingChild(null)
    onRefreshGraph && onRefreshGraph()
    fetchAll()
  }

  // ── Goals ───────────────────────────────────────────────────────────────────
  const addGoal = async () => {
    if (!newGoal.title || !newGoal.target) return
    await supabase.from('goals').insert({ ...newGoal, node_id: node.id, user_id: user.id, target: parseFloat(newGoal.target) })
    setNewGoal({ title: '', scope: 'weekly', target: '', unit: '' })
    setAddingGoal(false)
    fetchAll()
  }

  const incrementGoal = async (goal) => {
    const newCurrent = Math.min(goal.current + 1, goal.target)
    const completed = newCurrent >= goal.target
    await supabase.from('goals').update({ current: newCurrent, completed }).eq('id', goal.id)
    if (completed && !goal.completed) await addXP(goal.xp_reward || 50)
    fetchAll()
  }

  // ── Milestones ──────────────────────────────────────────────────────────────
  const completeMilestone = async (ms) => {
    await supabase.from('milestones').update({ status: 'done' }).eq('id', ms.id)
    await addXP(ms.xp_reward || 100)
    fetchAll()
  }

  const nodeTypeMilestones = milestones.filter(m => {
    if (m.note && m.note.includes(`[Node: ${node.id}]`)) return true
    const t = m.title.toLowerCase()
    if (node.type === 'career')   return t.includes('portfolio') || t.includes('email') || t.includes('application')
    if (node.type === 'academic') return t.includes('dab') || t.includes('survey') || t.includes('ielts')
    return false
  })

  // ── AI Task breakdown ───────────────────────────────────────────────────────
  const breakDownTask = async () => {
    const key = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!key || !taskDescription.trim()) return
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        system: 'Return ONLY a JSON array of 5-10 short actionable steps. No markdown.',
        messages: [{ role: 'user', content: taskDescription }],
      }),
    })
    const data = await res.json()
    try { setGeneratedSteps(JSON.parse(data?.content?.[0]?.text || '[]')) } catch { setGeneratedSteps([]) }
  }

  const saveSubtasks = async () => {
    await supabase.from('subtasks').insert(generatedSteps.map((title, idx) => ({
      user_id: user.id, parent_id: node.id, parent_type: 'node', title, position: idx,
    })))
    setShowBreakdown(false); setGeneratedSteps([]); setTaskDescription(''); fetchAll()
  }

  const toggleSubtask = async (task) => {
    await supabase.from('subtasks').update({ completed: !task.completed }).eq('id', task.id)
    fetchAll()
  }

  if (!node) return null

  const { color: colorClass } = meta(node.type)
  const scopeOrder = ['weekly', 'monthly', 'quarterly', 'yearly', '5yr']

  return (
    <div className="panel-enter fixed right-0 top-14 bottom-0 w-80 glass border-l border-blue-900/20 z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-blue-900/20 flex items-start justify-between flex-shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <p className={`text-xs font-mono uppercase tracking-widest mb-1 ${colorClass.split(' ')[0]}`}>
            {meta(node.type).label}
          </p>
          <InlineEdit value={node.title} className="font-display text-starlight tracking-wider block truncate"
            onSave={v => updateNodeField('title', v)} />
          <InlineEdit value={node.description || 'No description'} className="text-xs text-dim font-body mt-1 block"
            onSave={v => updateNodeField('description', v)} />
          <p className="text-[10px] text-dim/50 font-mono mt-1">Double-click to edit</p>
        </div>
        <button onClick={onClose} className="text-dim hover:text-starlight transition-colors mt-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ── Hierarchy ───────────────────────────────────────────────── */}
        {node.type !== 'topic' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-display tracking-widest text-dim uppercase">
                {node.type === 'subnode' ? 'Topics' : 'Subnodes'}
              </p>
              <button
                onClick={() => setAddingChild({ parentId: node.id, level: node.type === 'subnode' ? 'topic' : 'subnode' })}
                className="text-dim hover:text-nova transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {addingChild?.parentId === node.id && (
              <div className="flex gap-2 mb-3">
                <input autoFocus placeholder={addingChild.level === 'subnode' ? 'New subnode...' : 'New topic...'}
                  value={newChildTitle} onChange={e => setNewChildTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addChild(); if (e.key === 'Escape') setAddingChild(null) }}
                  className="flex-1 bg-stardust/10 text-xs text-starlight border border-blue-900/30 rounded-lg px-3 py-1.5 outline-none focus:border-pulsar/40 font-body" />
                <button onClick={addChild} className="text-emerald hover:text-emerald/70 transition-colors">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="space-y-1">
              {node.type !== 'subnode' && children.map(sub => (
                <div key={sub.id}>
                  {/* Subnode row */}
                  <div className="flex items-center gap-2 group py-1 px-2 rounded-lg hover:bg-white/5">
                    <button onClick={() => setExpanded(e => ({ ...e, [sub.id]: !e[sub.id] }))}
                      className="text-dim w-4 flex-shrink-0">
                      {expanded[sub.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta('subnode').dot}`} />
                    <InlineEdit value={sub.title} className="text-xs text-starlight flex-1 min-w-0"
                      onSave={async v => { await supabase.from('nodes').update({ title: v }).eq('id', sub.id); fetchAll(); onRefreshGraph && onRefreshGraph() }} />
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setAddingChild({ parentId: sub.id, level: 'topic' })}
                        className="text-dim hover:text-nova p-0.5"><Plus className="w-3 h-3" /></button>
                      <button onClick={() => deleteNode(sub.id)}
                        className="text-dim hover:text-danger p-0.5"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Add topic under subnode */}
                  {addingChild?.parentId === sub.id && (
                    <div className="flex gap-2 ml-6 mb-1">
                      <input autoFocus placeholder="New topic..."
                        value={newChildTitle} onChange={e => setNewChildTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addChild(); if (e.key === 'Escape') setAddingChild(null) }}
                        className="flex-1 bg-stardust/10 text-xs text-starlight border border-blue-900/30 rounded-lg px-3 py-1 outline-none focus:border-pulsar/40 font-body" />
                      <button onClick={addChild} className="text-emerald"><Check className="w-3.5 h-3.5" /></button>
                    </div>
                  )}

                  {/* Topics */}
                  {expanded[sub.id] && sub.topics.map(topic => (
                    <div key={topic.id} className="flex items-center gap-2 group ml-6 py-0.5 px-2 rounded-lg hover:bg-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-stardust/50 flex-shrink-0 ml-0.5" />
                      <InlineEdit value={topic.title} className="text-xs text-dim flex-1 min-w-0"
                        onSave={async v => { await supabase.from('nodes').update({ title: v }).eq('id', topic.id); fetchAll(); onRefreshGraph && onRefreshGraph() }} />
                      <button onClick={() => deleteNode(topic.id)}
                        className="text-dim hover:text-danger p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {/* If it's a subnode, show topics directly */}
              {node.type === 'subnode' && children.map(topic => (
                <div key={topic.id} className="flex items-center gap-2 group py-0.5 px-2 rounded-lg hover:bg-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-stardust/50 flex-shrink-0 ml-1" />
                  <InlineEdit value={topic.title} className="text-xs text-dim flex-1 min-w-0"
                    onSave={async v => { await supabase.from('nodes').update({ title: v }).eq('id', topic.id); fetchAll(); onRefreshGraph && onRefreshGraph() }} />
                  <button onClick={() => deleteNode(topic.id)}
                    className="text-dim hover:text-danger p-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}

              {children.length === 0 && (
                <p className="text-xs text-dim italic font-body pl-1">
                  No {node.type === 'subnode' ? 'topics' : 'subnodes'} yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Goals ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-display tracking-widest text-dim uppercase flex items-center gap-2">
              <Target className="w-3 h-3" /> Goals
            </p>
            <button onClick={() => setAddingGoal(!addingGoal)} className="text-dim hover:text-nova transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={() => setShowBreakdown(true)} className="mb-2 text-xs text-gold flex items-center gap-1 hover:underline">
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
                    <div className={`h-full rounded-full transition-all duration-500 ${goal.completed ? 'bg-emerald' : 'bg-gradient-to-r from-pulsar to-aurora'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className={`text-xs font-mono ${colorClass.split(' ')[0]}`}>{goal.scope}</span>
                    {goal.completed && <span className="text-xs text-emerald">+{goal.xp_reward}xp ✦</span>}
                  </div>
                </div>
              )
            })}
            {!goals.length && <p className="text-xs text-dim font-body italic">No goals yet.</p>}
          </div>
        </div>

        {/* ── Subtasks ────────────────────────────────────────────────── */}
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

        {/* ── Milestones ──────────────────────────────────────────────── */}
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

        {/* ── Delete node ─────────────────────────────────────────────── */}
        {node.type !== 'root' && (
          <button onClick={() => deleteNode(node.id)}
            className="w-full text-xs text-danger/50 hover:text-danger border border-danger/10 hover:border-danger/30 rounded-lg py-2 transition-all font-body flex items-center justify-center gap-2">
            <Trash2 className="w-3 h-3" /> Delete this {meta(node.type).label}
          </button>
        )}
      </div>

      {/* ── AI Breakdown modal ──────────────────────────────────────────── */}
      {showBreakdown && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowBreakdown(false)}>
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
