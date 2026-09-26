import { useState, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { offlineUpdate } from '../../lib/offlineApi'
import { useAuth } from '../../hooks/useAuth'
import { Check, Circle, Clock, Zap, ChevronRight, ExternalLink, Award } from 'lucide-react'
import { XP } from '../../data/xpRewards'
import { safeExternalUrl } from '../../lib/urlUtils'

const STATUS_CFG = {
  not_started:  { icon: Circle, color: 'text-nova/60',     bg: 'border-blue-900/40 text-transparent hover:border-blue-900/60', label: 'Not Started' },
  in_progress:  { icon: Clock,  color: 'text-pulsar',  bg: 'border-pulsar bg-pulsar/20 text-pulsar', label: 'In Progress' },
  done:         { icon: Check,  color: 'text-emerald', bg: 'border-emerald bg-emerald text-void', label: 'Done' },
}

const extractScoreInfo = (title, notes) => {
  const combined = `${title || ''} ${notes || ''}`
  if (!combined.trim()) return null

  const bandMatch = combined.match(/\bBand:?\s*([0-9](?:\.[0-9])?)\b/i)
  const band = bandMatch ? bandMatch[1] : null

  const fracMatch = combined.match(/(?:Score:?\s*)?(\b\d{1,2}\s*\/\s*\d{1,2}\b)/i)
  let rawScore = null
  if (fracMatch) {
    rawScore = fracMatch[1].replace(/\s+/g, '')
  } else {
    const numMatch = combined.match(/\bScore:?\s*(\d{1,2}(?:\.\d+)?)\b/i)
    if (numMatch) {
      rawScore = numMatch[1]
    }
  }

  if (!band && !rawScore) return null
  return { band, rawScore }
}

const extractUrlFromNotes = (notes) => {
  if (!notes || typeof notes !== 'string') return null
  const match = notes.match(/https?:\/\/[^\s),]+/i)
  if (match) {
    return safeExternalUrl(match[0])
  }
  return null
}

const TopicCard = ({ topic, accentColor, pomodoroMins = 0, onUpdate }) => {
  const { user, trackXP } = useAuth()
  const [notes, setNotes] = useState(topic.notes || '')
  const [saving, setSaving] = useState(false)
  const notesRef = useRef(null)

  const scoreInfo = useMemo(() => extractScoreInfo(topic.title, notes), [topic.title, notes])
  const extractedUrl = useMemo(() => extractUrlFromNotes(notes), [notes])

  const cfg = STATUS_CFG[topic.status] || STATUS_CFG.not_started
  const StatusIcon = cfg.icon

  const cycleStatus = async () => {
    if (!user?.id) return
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

    await offlineUpdate('curriculum_topics', topic.id, updates)
    trackXP(topic.status === 'done', newStatus === 'done', XP.TOPIC_COMPLETE)
    onUpdate()
  }

  const saveNotes = async () => {
    if (!user?.id || notes === (topic.notes || '')) return
    setSaving(true)
    await offlineUpdate('curriculum_topics', topic.id, { notes })
    setSaving(false)
  }

  const updateDate = async (field, value) => {
    if (!user?.id) return
    await offlineUpdate('curriculum_topics', topic.id, { [field]: value || null })
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
              topic.status === 'done' ? 'text-nova/60 line-through opacity-50' : 'text-starlight'
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

            {scoreInfo?.band && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold inline-flex items-center gap-1 ${
                parseFloat(scoreInfo.band) >= 8.0
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
              }`}>
                <Award className="w-3 h-3" /> Band {scoreInfo.band}
              </span>
            )}

            {scoreInfo?.rawScore && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gold/15 border border-gold/30 text-gold font-semibold">
                Score: {scoreInfo.rawScore}
              </span>
            )}

            {extractedUrl && (
              <a
                href={extractedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] font-mono text-sky hover:text-starlight bg-sky/10 border border-sky/20 px-2 py-0.5 rounded transition-colors"
                title="Open Link"
                onClick={(e) => e.stopPropagation()}
              >
                <span>{extractedUrl.toLowerCase().includes('score') ? 'Score Report ->' : 'Practice Link ->'}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            {topic.estimated_hours && (
              <span className="text-xs font-mono text-nova/60">
                {topic.estimated_hours}h estimated
              </span>
            )}
            {pomodoroMins > 0 && (
              <span className="text-xs font-mono text-pulsar/70 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> {pomodoroMins}m logged
              </span>
            )}
            {topic.date_started && (
              <input
                type="date"
                value={topic.date_started || ''}
                onChange={e => updateDate('date_started', e.target.value)}
                className="text-xs font-mono text-nova/60 bg-transparent border-none outline-none cursor-pointer"
                title="Date started"
              />
            )}
            {topic.date_completed && (
              <input
                type="date"
                value={topic.date_completed || ''}
                onChange={e => updateDate('date_completed', e.target.value)}
                className="text-xs font-mono text-emerald/70 bg-transparent border-none outline-none cursor-pointer"
                title="Date completed"
              />
            )}
            <span className={`text-xs font-mono ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
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
            className="topic-notes w-full mt-2 text-[11px] font-body text-nova/80 bg-transparent border border-transparent rounded-lg px-2 py-1.5 resize-none transition-all placeholder:text-nova/60/30"
          />
          {saving && <span className="text-[9px] font-mono text-pulsar/50">saving...</span>}
        </div>
      </div>
    </div>
  )
}

export default TopicCard
