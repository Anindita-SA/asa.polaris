import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Check, Circle, Clock, Zap, ChevronRight } from 'lucide-react'
import { XP } from '../../data/xpRewards'

const STATUS_CFG = {
  not_started:  { icon: Circle, color: 'text-dim',     bg: 'border-blue-900/40 text-transparent hover:border-blue-900/60', label: 'Not Started' },
  in_progress:  { icon: Clock,  color: 'text-pulsar',  bg: 'border-pulsar bg-pulsar/20 text-pulsar', label: 'In Progress' },
  done:         { icon: Check,  color: 'text-emerald', bg: 'border-emerald bg-emerald text-void', label: 'Done' },
}

const TopicCard = ({ topic, accentColor, pomodoroMins = 0, onUpdate }) => {
  const { trackXP } = useAuth()
  const [notes, setNotes] = useState(topic.notes || '')
  const [saving, setSaving] = useState(false)
  const notesRef = useRef(null)

  const cfg = STATUS_CFG[topic.status] || STATUS_CFG.not_started
  const StatusIcon = cfg.icon

  const cycleStatus = async () => {
    const order = ['not_started', 'in_progress', 'done']
    const idx = order.indexOf(topic.status)
    const newStatus = order[(idx + 1) % 3]

    const updates = { status: newStatus }
    if (newStatus === 'in_progress' && !topic.date_started) {
      updates.date_started = new Date().toISOString().slice(0, 10)
    }
    if (newStatus === 'done' && !topic.date_completed) {
      updates.date_completed = new Date().toISOString().slice(0, 10)
    }

    await supabase.from('curriculum_topics').update(updates).eq('id', topic.id)
    trackXP(topic.status === 'done', newStatus === 'done', XP.TOPIC_COMPLETE)
    onUpdate()
  }

  const saveNotes = async () => {
    if (notes === (topic.notes || '')) return
    setSaving(true)
    await supabase.from('curriculum_topics').update({ notes }).eq('id', topic.id)
    setSaving(false)
  }

  const updateDate = async (field, value) => {
    await supabase.from('curriculum_topics').update({ [field]: value || null }).eq('id', topic.id)
    onUpdate()
  }

  return (
    <div className="glass glass-hover hover:-translate-y-1 border border-blue-900/15 rounded-xl p-4 group transition-all hover:bg-white/[0.03]">
      <div className="flex items-start gap-3">
        {/* Status button */}
        <button
          onClick={cycleStatus}
          className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-all border mt-0.5 ${cfg.bg}`}
        >
          <StatusIcon className="w-3.5 h-3.5" strokeWidth={3} />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-body text-sm transition-colors ${
              topic.status === 'done' ? 'text-dim line-through opacity-50' : 'text-starlight'
            }`}>
              {topic.title}
            </span>

            {topic.is_recommended_next && topic.status === 'not_started' && (
              <span
                className="text-[9px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}
              >
                <ChevronRight className="w-2.5 h-2.5" /> Start Here
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {topic.estimated_hours && (
              <span className="text-[10px] font-mono text-dim">
                {topic.estimated_hours}h estimated
              </span>
            )}
            {pomodoroMins > 0 && (
              <span className="text-[10px] font-mono text-pulsar/70 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> {pomodoroMins}m logged
              </span>
            )}
            {topic.date_started && (
              <input
                type="date"
                value={topic.date_started || ''}
                onChange={e => updateDate('date_started', e.target.value)}
                className="text-[10px] font-mono text-dim bg-transparent border-none outline-none cursor-pointer"
                title="Date started"
              />
            )}
            {topic.date_completed && (
              <input
                type="date"
                value={topic.date_completed || ''}
                onChange={e => updateDate('date_completed', e.target.value)}
                className="text-[10px] font-mono text-emerald/70 bg-transparent border-none outline-none cursor-pointer"
                title="Date completed"
              />
            )}
            <span className={`text-[10px] font-mono ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
              {cfg.label}
            </span>
          </div>

          {/* Notes field */}
          <textarea
            ref={notesRef}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes..."
            rows={1}
            className="topic-notes w-full mt-2 text-[11px] font-body text-starlight/70 bg-transparent border border-transparent rounded-lg px-2 py-1.5 resize-none transition-all placeholder:text-dim/30"
          />
          {saving && <span className="text-[9px] font-mono text-pulsar/50">saving…</span>}
        </div>
      </div>
    </div>
  )
}

export default TopicCard
