import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Check, Flag, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

const statusConfig = {
  upcoming: { color: 'text-dim border-blue-900/30 bg-stardust/30', icon: Clock, label: 'Upcoming' },
  'in-progress': { color: 'text-pulsar border-pulsar/30 bg-pulsar/5', icon: Flag, label: 'In Progress' },
  done: { color: 'text-emerald border-emerald/30 bg-emerald/5', icon: Check, label: 'Done' },
  overdue: { color: 'text-danger border-danger/30 bg-danger/5', icon: AlertCircle, label: 'Overdue' },
}

const Timeline = () => {
  const { user, addXP } = useAuth()
  const [milestones, setMilestones] = useState([])
  const [expanded, setExpanded] = useState(false)

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

  const now = new Date()
  const upcoming = milestones.filter(m => m.status !== 'done')
  const done = milestones.filter(m => m.status === 'done')
  const nextMilestone = upcoming[0]
  const percentDone = milestones.length ? Math.round((done.length / milestones.length) * 100) : 0

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">

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
                  <div className={`absolute -left-[2.1rem] top-4 w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    ms.status === 'done' ? 'border-emerald bg-emerald/30' :
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

                      {/* Note */}
                      <input
                        placeholder="Add a note..."
                        defaultValue={ms.note || ''}
                        onBlur={e => updateNote(ms.id, e.target.value)}
                        className="mt-2 w-full bg-transparent text-xs text-dim border-b border-transparent focus:border-blue-900/30 outline-none font-body italic placeholder:text-blue-900/40"
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
    </div>
  )
}

export default Timeline
