import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, Star, ChevronDown, X, BookOpen } from 'lucide-react'
import { XP } from '../../data/xpRewards'
import AddMediaModal from './AddMediaModal'

const TYPE_FILTERS = ['All', 'book', 'film', 'documentary', 'podcast', 'article', 'course', 'manga', 'anime']
const STATUS_FILTERS = ['All', 'want_to', 'in_progress', 'done']
const STATUS_LABELS = { want_to: 'Want to', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS = { want_to: 'text-dim border-dim/30', in_progress: 'text-pulsar border-pulsar/30', done: 'text-emerald border-emerald/30' }
const SORT_OPTIONS = ['date_added', 'rating', 'date_finished', 'title']

const MediaLog = () => {
  const { user, addXP } = useAuth()
  const [media, setMedia] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('date_added')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { if (user?.id) fetchMedia() }, [user?.id])

  const fetchMedia = async () => {
    const { data } = await supabase.from('media_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setMedia(data || [])
  }

  const saveMedia = async (form) => {
    const payload = { ...form, user_id: user.id }
    // Clean empty strings
    if (!payload.date_started) delete payload.date_started
    if (!payload.date_finished) delete payload.date_finished
    if (!payload.recommended_by) delete payload.recommended_by
    if (!payload.one_line_takeaway) delete payload.one_line_takeaway
    if (!payload.full_review) delete payload.full_review
    await supabase.from('media_log').insert(payload)
    await addXP(XP.MEDIA_LOG)
    setShowModal(false)
    fetchMedia()
  }

  const updateRating = async (id, rating) => {
    await supabase.from('media_log').update({ rating }).eq('id', id)
    setMedia(prev => prev.map(m => m.id === id ? { ...m, rating } : m))
  }

  const updateStatus = async (id, status) => {
    const updates = { status }
    if (status === 'in_progress') updates.date_started = new Date().toISOString().slice(0, 10)
    if (status === 'done') updates.date_finished = new Date().toISOString().slice(0, 10)
    await supabase.from('media_log').update(updates).eq('id', id)
    fetchMedia()
  }

  const deleteMedia = async (id) => {
    await supabase.from('media_log').delete().eq('id', id)
    fetchMedia()
  }

  // Filter + sort
  let filtered = media
  if (typeFilter !== 'All') filtered = filtered.filter(m => m.media_type === typeFilter)
  if (statusFilter !== 'All') filtered = filtered.filter(m => m.status === statusFilter)

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
    if (sortBy === 'date_finished') return (b.date_finished || '').localeCompare(a.date_finished || '')
    return 0 // date_added is already sorted by created_at desc
  })

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Type filter */}
        <div className="flex flex-wrap gap-1">
          {TYPE_FILTERS.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                typeFilter === t
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'text-dim border-blue-900/20 hover:text-starlight hover:bg-white/5'
              }`}>
              {t === 'All' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-blue-900/30 hidden sm:block" />

        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all border ${
                statusFilter === s
                  ? 'bg-pulsar/20 text-pulsar border-pulsar/30'
                  : 'text-dim border-blue-900/20 hover:text-starlight hover:bg-white/5'
              }`}>
              {s === 'All' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-stardust/40 text-[10px] text-dim border border-blue-900/20 rounded-lg px-2 py-1 outline-none font-mono">
          {SORT_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>

        {/* Add button */}
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25 transition-all">
          <Plus className="w-3.5 h-3.5" /> Log
        </button>
      </div>

      {/* Media grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(m => {
          const expanded = expandedId === m.id
          return (
            <div key={m.id} className="glass glass-hover hover:-translate-y-1 border border-amber-500/10 rounded-xl p-4 group relative transition-all hover:bg-white/[0.03]">
              <div className="flex gap-3">
                {/* Cover placeholder */}
                <div className="w-12 h-16 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: m.cover_url ? `url(${m.cover_url}) center/cover` : 'linear-gradient(135deg, #F59E0B15, #F59E0B08, rgba(10,15,30,0.8))',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}>
                  {!m.cover_url && <BookOpen className="w-4 h-4 text-amber-500/40" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm text-starlight tracking-wide truncate">{m.title}</h4>
                  {m.author_or_creator && <p className="text-[10px] font-body text-dim truncate">{m.author_or_creator}</p>}

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {/* Type badge */}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500/80 border border-amber-500/20">
                      {m.media_type}
                    </span>

                    {/* Status pill */}
                    <button onClick={() => {
                      const order = ['want_to', 'in_progress', 'done']
                      const next = order[(order.indexOf(m.status) + 1) % 3]
                      updateStatus(m.id, next)
                    }}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border transition-all ${STATUS_COLORS[m.status] || 'text-dim border-dim/30'}`}>
                      {STATUS_LABELS[m.status] || m.status}
                    </button>

                    {m.recommended_by && (
                      <span className="text-[9px] font-body text-dim italic">rec: {m.recommended_by}</span>
                    )}
                  </div>

                  {/* Rating stars */}
                  <div className="flex gap-0.5 mt-1.5">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => updateRating(m.id, n)}
                        className={`text-xs transition-colors ${(m.rating || 0) >= n ? 'text-amber-400' : 'text-dim/30 hover:text-amber-400/50'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Delete */}
                <button onClick={() => deleteMedia(m.id)} className="text-dim hover:text-danger opacity-0 group-hover:opacity-100 transition-all self-start">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* One-liner */}
              {m.one_line_takeaway && (
                <div className="mt-2.5 pl-3 border-l-2 border-amber-500/30 text-[11px] font-body text-starlight/60 italic">
                  {m.one_line_takeaway}
                </div>
              )}

              {/* Expand for full review */}
              {m.full_review && (
                <>
                  <button onClick={() => setExpandedId(expanded ? null : m.id)}
                    className="text-[10px] font-mono text-amber-500/60 mt-2 flex items-center gap-1 hover:text-amber-400 transition-colors">
                    <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    {expanded ? 'hide review' : 'read review'}
                  </button>
                  {expanded && (
                    <div className="mt-2 text-xs font-body text-starlight/50 whitespace-pre-wrap pl-3 border-l border-blue-900/20">
                      {m.full_review}
                    </div>
                  )}
                </>
              )}

              {/* Tags */}
              {m.tags?.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {m.tags.map((tag, i) => (
                    <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded-full bg-stardust/50 text-dim border border-blue-900/15">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-amber-500/20" />
          <p className="text-sm font-body text-dim italic">No media entries match your filters.</p>
        </div>
      )}

      {showModal && <AddMediaModal onSave={saveMedia} onClose={() => setShowModal(false)} />}
    </div>
  )
}

export default MediaLog
