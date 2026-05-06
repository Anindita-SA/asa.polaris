import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Check, Flag, Clock, AlertCircle, ChevronDown, ChevronUp, Zap, Plus, X } from 'lucide-react'

const statusConfig = {
  upcoming: { color: 'text-dim border-blue-900/30 bg-stardust/30', icon: Clock, label: 'Upcoming' },
  'in-progress': { color: 'text-pulsar border-pulsar/30 bg-pulsar/5', icon: Flag, label: 'In Progress' },
  done: { color: 'text-emerald border-emerald/30 bg-emerald/5', icon: Check, label: 'Done' },
  overdue: { color: 'text-danger border-danger/30 bg-danger/5', icon: AlertCircle, label: 'Overdue' },
}

const Timeline = () => {
  const { user, addXP } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [nodes, setNodes] = useState([])
  const [expanded, setExpanded] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', deadline: '', linkedNode: '' })

  const [subtasks, setSubtasks] = useState({})
  const [breakdownTarget, setBreakdownTarget] = useState(null)
  const [taskDescription, setTaskDescription] = useState('')
  const [generatedSteps, setGeneratedSteps] = useState([])
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => { fetchMilestones() }, [])

  const fetchMilestones = async () => {
    const { data } = await supabase.from('milestones').select('*').eq('user_id', user.id).order('deadline')
    // Auto-flag overdue
    const now = new Date()
    const processed = (data || []).map(m => ({
      ...m,
      status: m.status !== 'done' && new Date(m.deadline) < now ? 'overdue' : m.status
    }))
    setMilestones(processed)

    const { data: nodeData } = await supabase.from('nodes').select('*').eq('user_id', user.id)
    setNodes(nodeData || [])

    const { data: subData } = await supabase.from('subtasks').select('*').eq('user_id', user.id).eq('parent_type', 'milestone').order('position')
    const grouped = {}
      ; (subData || []).forEach(row => {
        grouped[row.parent_id] = grouped[row.parent_id] || []
        grouped[row.parent_id].push(row)
      })
    setSubtasks(grouped)
  }

  const addMilestone = async () => {
    if (!addForm.title || !addForm.deadline) return
    const note = addForm.linkedNode ? `[Node: ${addForm.linkedNode}]` : ''
    await supabase.from('milestones').insert({
      user_id: user.id,
      title: addForm.title,
      deadline: addForm.deadline,
      status: 'upcoming',
      xp_reward: 100,
      note,
    })
    setAddForm({ title: '', deadline: '', linkedNode: '' })
    setShowAddModal(false)
    fetchMilestones()
  }

  const updateStatus = async (ms, status) => {
    await supabase.from('milestones').update({ status }).eq('id', ms.id)
    if (status === 'done' && ms.status !== 'done') await addXP(ms.xp_reward || 100)
    fetchMilestones()
  }

  const updateNote = async (id, note) => {
    await supabase.from('milestones').update({ note }).eq('id', id)
  }

  const getDaysUntil = (deadline) => {
    const diff = new Date(deadline) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const [aiLoading, setAiLoading] = useState(false)

  const breakDownTask = async () => {
    const key = import.meta.env.VITE_GROQ_API_KEY
    if (!key || !taskDescription.trim()) return
    setAiLoading(true)

    const systemPrompt = `You are an ADHD-friendly task coach for a university student named Anindita who is studying EEE at NIT Trichy, India. She is working toward MSc applications in Europe, research papers, hardware projects, and creative work.

Your job is to break down a task or project into TINY, CONCRETE, DOPAMINE-FRIENDLY steps that feel achievable — not overwhelming.

Rules:
- Return ONLY a valid JSON array of strings. No markdown, no explanation, no preamble.
- Each step must be a single, clear physical or digital action (e.g., "Open KiCad and load CHAARG-L schematic" not "Work on PCB").
- Keep each step completable in 5-15 minutes max.
- Use encouraging, specific language. Say "Open Zotero and tag 3 papers as 'DAB control'" not "Organize papers".
- Include the FIRST tiny step to overcome inertia (e.g., "Open the file", "Create a blank document titled X").
- Add time estimates in parentheses like "(~5 min)" at the end of each step.
- Return 5-8 steps. Never more than 10.
- If the task is vague, make reasonable assumptions and pick the most impactful interpretation.`

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Break this down into ADHD-friendly micro-steps: "${taskDescription}"` },
          ],
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }),
      })
      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content || '[]'
      const parsed = JSON.parse(text)
      // Handle both { steps: [...] } and plain [...] formats
      const steps = Array.isArray(parsed) ? parsed : (parsed.steps || parsed.tasks || Object.values(parsed)[0] || [])
      setGeneratedSteps(steps)
    } catch (err) {
      console.error('AI breakdown failed:', err)
      setGeneratedSteps(['⚠ AI breakdown failed — try again or add steps manually'])
    } finally {
      setAiLoading(false)
    }
  }

  const saveSubtasks = async () => {
    if (!generatedSteps.length || !breakdownTarget) return
    const maxPos = subtasks[breakdownTarget.id]?.length || 0
    await supabase.from('subtasks').insert(generatedSteps.map((title, idx) => ({
      user_id: user.id,
      parent_id: breakdownTarget.id,
      parent_type: 'milestone',
      title,
      position: maxPos + idx,
    })))
    setGeneratedSteps([])
    fetchMilestones()
  }

  const addManualSubtask = async () => {
    if (!newSubtask.trim() || !breakdownTarget) return
    const maxPos = subtasks[breakdownTarget.id]?.length || 0
    await supabase.from('subtasks').insert({
      user_id: user.id,
      parent_id: breakdownTarget.id,
      parent_type: 'milestone',
      title: newSubtask.trim(),
      position: maxPos,
    })
    setNewSubtask('')
    fetchMilestones()
  }

  const toggleSubtask = async (task) => {
    await supabase.from('subtasks').update({ completed: !task.completed }).eq('id', task.id).eq('user_id', user.id)
    fetchMilestones()
  }

  const deleteSubtask = async (id) => {
    await supabase.from('subtasks').delete().eq('id', id).eq('user_id', user.id)
    fetchMilestones()
  }

  const now = new Date()
  const upcoming = milestones.filter(m => m.status !== 'done')
  const done = milestones.filter(m => m.status === 'done')
  const nextMilestone = upcoming[0]
  const percentDone = milestones.length ? Math.round((done.length / milestones.length) * 100) : 0

  return (
    <div className="h-full overflow-y-auto p-6 relative">
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex justify-end mb-4">
          <button onClick={() => setShowAddModal(true)} className="glass border border-pulsar/30 text-pulsar hover:bg-pulsar/20 transition-all rounded-lg px-4 py-2 text-sm font-display tracking-wider flex items-center gap-2">
            <Plus className="w-4 h-4" /> ADD MILESTONE
          </button>
        </div>

        {/* Next up banner */}
        {nextMilestone && (
          <div className="glass border border-pulsar/20 rounded-xl p-4 bg-pulsar/5">
            <p className="text-xs font-mono text-pulsar/60 uppercase tracking-widest mb-1">Next milestone</p>
            <p className="text-sm text-starlight font-body">{nextMilestone.title}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs font-mono text-dim">{new Date(nextMilestone.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className={`text-xs font-mono ${getDaysUntil(nextMilestone.deadline) < 30 ? 'text-gold' : 'text-dim'}`}>
                {getDaysUntil(nextMilestone.deadline) > 0 ? `${getDaysUntil(nextMilestone.deadline)} days` : 'overdue'}
              </span>
            </div>
          </div>
        )}

        <button onClick={() => setExpanded(v => !v)} className="glass border border-blue-900/20 rounded-xl p-4 w-full text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-starlight font-body">{done.length} / {milestones.length} milestones complete</p>
            {expanded ? <ChevronUp className="w-4 h-4 text-dim" /> : <ChevronDown className="w-4 h-4 text-dim" />}
          </div>
          <div className="h-1.5 bg-stardust rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald to-pulsar transition-all duration-500" style={{ width: `${percentDone}%` }} />
          </div>
        </button>

        {/* Timeline */}
        {expanded && <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-pulsar/30 via-blue-900/20 to-transparent" />

          <div className="space-y-3 pl-10">
            {milestones.map((ms, i) => {
              const config = statusConfig[ms.status] || statusConfig.upcoming
              const Icon = config.icon
              const daysUntil = getDaysUntil(ms.deadline)

              return (
                <div key={ms.id} className={`relative glass rounded-xl p-4 border ${config.color} group`}>
                  {/* Timeline dot */}
                  <div className={`absolute -left-[2.1rem] top-4 w-3 h-3 rounded-full border-2 flex-shrink-0 ${ms.status === 'done' ? 'border-emerald bg-emerald/30' :
                    ms.status === 'overdue' ? 'border-danger bg-danger/30' :
                      ms.status === 'in-progress' ? 'border-pulsar bg-pulsar/30' :
                        'border-dim bg-stardust'
                    }`} />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-3 h-3 flex-shrink-0 ${config.color.split(' ')[0]}`} />
                        <p className={`text-sm font-body ${ms.status === 'done' ? 'line-through text-dim' : 'text-starlight'}`}>{ms.title}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono text-dim">
                        <span>{new Date(ms.deadline).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                        {ms.status !== 'done' && (
                          <span className={daysUntil < 0 ? 'text-danger' : daysUntil < 60 ? 'text-gold' : ''}>
                            {daysUntil > 0 ? `${daysUntil}d away` : `${Math.abs(daysUntil)}d overdue`}
                          </span>
                        )}
                        {ms.xp_reward && <span className="text-gold/60">+{ms.xp_reward}xp</span>}
                      </div>

                      {/* Subtasks */}
                      {subtasks[ms.id]?.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {subtasks[ms.id].map(task => (
                            <div key={task.id} className="flex items-center justify-between group/task">
                              <button onClick={() => toggleSubtask(task)} className="flex items-start text-xs text-left">
                                <span className={task.completed ? 'text-emerald line-through' : 'text-starlight/90'}>
                                  <span className="font-mono mr-1 inline-block w-4 text-center">{task.completed ? '✓' : '○'}</span>
                                  {task.title}
                                </span>
                              </button>
                              <button onClick={() => deleteSubtask(task.id)} className="text-dim hover:text-danger opacity-0 group-hover/task:opacity-100 transition-opacity p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button onClick={() => { setBreakdownTarget(ms); setTaskDescription(ms.title); setGeneratedSteps([]); setNewSubtask(''); }} className="text-xs text-gold mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Zap className="w-3 h-3" /> Add tasks / Break it down
                      </button>

                      {/* Note */}
                      <input
                        placeholder="Add a note..."
                        defaultValue={ms.note || ''}
                        onBlur={e => updateNote(ms.id, e.target.value)}
                        className="mt-3 w-full bg-transparent text-xs text-dim border-b border-transparent focus:border-blue-900/30 outline-none font-body italic placeholder:text-blue-900/40"
                      />
                    </div>

                    {/* Status toggle */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={ms.status === 'overdue' ? 'upcoming' : ms.status}
                        onChange={e => updateStatus(ms, e.target.value)}
                        className="bg-stardust text-xs text-dim rounded px-2 py-1 border border-blue-900/20 outline-none"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="in-progress">In Progress</option>
                        <option value="done">Done ✦</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>}

        {/* Done section */}
        {done.length > 0 && (
          <div className="border-t border-blue-900/20 pt-4">
            <p className="text-xs font-mono text-emerald/60 uppercase tracking-widest mb-3">Completed ({done.length})</p>
          </div>
        )}
      </div>

      {breakdownTarget && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setBreakdownTarget(null)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight">Tasks for: {breakdownTarget.title}</h3>
              <button onClick={() => setBreakdownTarget(null)}><X className="w-4 h-4 text-dim hover:text-starlight" /></button>
            </div>

            <div className="flex gap-2">
              <input placeholder="Add a simple task..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addManualSubtask()}
                className="flex-1 bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
              <button onClick={addManualSubtask} className="px-3 bg-pulsar/20 border border-pulsar/30 text-pulsar hover:bg-pulsar/30 transition-colors rounded-lg"><Plus className="w-4 h-4" /></button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-blue-900/20"></div></div>
              <div className="relative flex justify-center text-xs"><span className="bg-[#0b101e] px-2 text-dim font-mono uppercase tracking-widest">or AI breakdown</span></div>
            </div>

            <textarea rows={2} value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none" placeholder="Describe the task for AI..." />
            <button onClick={breakDownTask} disabled={aiLoading} className="w-full py-2 bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 transition-colors rounded-lg text-sm disabled:opacity-50 disabled:cursor-wait">
              {aiLoading ? '⏳ BREAKING IT DOWN...' : 'GENERATE STEPS'}
            </button>

            {generatedSteps.length > 0 && (
              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-2">
                {generatedSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input value={step} onChange={e => { const newSteps = [...generatedSteps]; newSteps[idx] = e.target.value; setGeneratedSteps(newSteps); }} className="flex-1 bg-transparent text-xs text-starlight outline-none border-b border-blue-900/30 focus:border-pulsar/50 pb-1" />
                    <button onClick={() => setGeneratedSteps(generatedSteps.filter((_, i) => i !== idx))} className="text-dim hover:text-danger"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            {!!generatedSteps.length && <button onClick={saveSubtasks} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar rounded-lg text-sm tracking-wider font-display hover:bg-pulsar/30 transition-colors mt-2">SAVE AI TASKS</button>}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight tracking-wider">New Milestone</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-4 h-4 text-dim hover:text-starlight" /></button>
            </div>
            <input placeholder="Milestone Title" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
            <input type="date" value={addForm.deadline} onChange={e => setAddForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
            <select value={addForm.linkedNode} onChange={e => setAddForm(f => ({ ...f, linkedNode: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none">
              <option value="">Link to Node (Optional)</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
            </select>
            <button onClick={addMilestone} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar text-sm font-display tracking-wider rounded-lg hover:bg-pulsar/30 transition-colors">
              CREATE
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default Timeline
