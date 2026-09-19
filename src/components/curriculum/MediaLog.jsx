import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { safeMutate } from '../../lib/safeMutate'
import { useAuth } from '../../hooks/useAuth'
import { Plus, Star, ChevronDown, X, BookOpen, ExternalLink, Tag, Sparkles, Link as LinkIcon, FileText, Loader2, AlertCircle, Headphones, Video, Book, Newspaper, Pencil } from 'lucide-react'
import { XP } from '../../data/xpRewards'
import { safeExternalUrl } from '../../lib/urlUtils'
import { autoFetchLinkMetadata } from '../../lib/linkMetadataFetcher'
import AddMediaModal, { MEDIA_TYPES } from './AddMediaModal'

const SUB_VIEWS = [
  { id: 'all', label: 'All Items', icon: BookOpen },
  { id: 'papers', label: 'Research Papers', icon: FileText, type: 'paper' },
  { id: 'articles', label: 'Articles & News', icon: Newspaper, type: 'article' },
  { id: 'books', label: 'Books', icon: Book, type: 'book' },
  { id: 'audio_video', label: 'Audio & Video', icon: Headphones, types: ['podcast', 'video', 'film', 'documentary'] },
]

const STATUS_FILTERS = ['All', 'want_to', 'in_progress', 'done']
const STATUS_LABELS = { want_to: 'Want to', in_progress: 'In Progress', done: 'Done' }
const STATUS_COLORS = { 
  want_to: 'text-nova/60 border-dim/30', 
  in_progress: 'text-pulsar border-pulsar/30', 
  done: 'text-emerald border-emerald/30' 
}
const SORT_OPTIONS = ['date_added', 'rating', 'date_finished', 'title']

function extractUrl(text) {
  if (!text || typeof text !== 'string') return null
  const match = text.match(/https?:\/\/[^\s\n)]+/i)
  return match ? safeExternalUrl(match[0]) : null
}

const MediaLog = () => {
  const { user, addXP } = useAuth()
  const [media, setMedia] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [modalInitialData, setModalInitialData] = useState(null)
  
  // Quick drop state
  const [quickDropUrl, setQuickDropUrl] = useState('')
  const [quickFetching, setQuickFetching] = useState(false)
  const [quickError, setQuickError] = useState(null)

  // Filters & views
  const [activeSubView, setActiveSubView] = useState('all')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('All')
  const [sortBy, setSortBy] = useState('date_added')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { 
    if (user?.id) fetchMedia() 
  }, [user?.id])

  const fetchMedia = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('media_log')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setMedia(data || [])
  }

  const handleQuickDrop = async () => {
    if (!quickDropUrl.trim()) return
    setQuickFetching(true)
    setQuickError(null)

    try {
      const { metadata, source } = await autoFetchLinkMetadata(quickDropUrl.trim())
      setEditingItem(null)
      setModalInitialData({ ...metadata, source })
      setQuickDropUrl('')
      setShowModal(true)
    } catch (err) {
      setQuickError(err.message || 'Could not auto-fetch metadata. Opening manual form...')
      setEditingItem(null)
      setModalInitialData({ full_review: `URL: ${quickDropUrl.trim()}` })
      setShowModal(true)
    } finally {
      setQuickFetching(false)
    }
  }

  const saveMedia = async (form) => {
    if (!user?.id) return
    const payload = { ...form, user_id: user.id }
    
    // Clean empty fields
    if (!payload.date_started) delete payload.date_started
    if (!payload.date_finished) delete payload.date_finished
    if (!payload.recommended_by) delete payload.recommended_by
    if (!payload.one_line_takeaway) delete payload.one_line_takeaway
    if (!payload.full_review) delete payload.full_review
    
    await safeMutate(
      supabase.from('media_log').insert(payload),
      { throwOnError: true, context: 'MediaLog:saveMedia' }
    )
    await addXP(XP.MEDIA_LOG)
    setShowModal(false)
    setEditingItem(null)
    setModalInitialData(null)
    fetchMedia()
  }

  const updateMedia = async (id, form) => {
    if (!user?.id) return
    const payload = { ...form }
    
    // Clean empty fields for update
    if (!payload.date_started) payload.date_started = null
    if (!payload.date_finished) payload.date_finished = null
    if (!payload.recommended_by) payload.recommended_by = null
    if (!payload.one_line_takeaway) payload.one_line_takeaway = null
    if (!payload.full_review) payload.full_review = null
    
    await safeMutate(
      supabase.from('media_log').update(payload).eq('id', id).eq('user_id', user.id),
      { throwOnError: true, context: 'MediaLog:updateMedia' }
    )
    setShowModal(false)
    setEditingItem(null)
    setModalInitialData(null)
    fetchMedia()
  }

  const updateRating = async (id, rating) => {
    if (!user?.id) return
    await safeMutate(
      supabase.from('media_log').update({ rating }).eq('id', id).eq('user_id', user.id),
      { throwOnError: true, context: 'MediaLog:updateRating' }
    )
    setMedia(prev => prev.map(m => m.id === id ? { ...m, rating } : m))
  }

  const updateStatus = async (id, status) => {
    if (!user?.id) return
    const updates = { status }
    if (status === 'in_progress') updates.date_started = new Date().toISOString().slice(0, 10)
    if (status === 'done') updates.date_finished = new Date().toISOString().slice(0, 10)
    await safeMutate(
      supabase.from('media_log').update(updates).eq('id', id).eq('user_id', user.id),
      { throwOnError: true, context: 'MediaLog:updateStatus' }
    )
    fetchMedia()
  }

  const deleteMedia = async (id) => {
    if (!user?.id) return
    await safeMutate(
      supabase.from('media_log').delete().eq('id', id).eq('user_id', user.id),
      { throwOnError: true, context: 'MediaLog:deleteMedia' }
    )
    fetchMedia()
  }

  // Available unique tags
  const allTags = useMemo(() => {
    const set = new Set()
    media.forEach(m => {
      if (Array.isArray(m.tags)) {
        m.tags.forEach(t => {
          if (t && typeof t === 'string') set.add(t.trim())
        })
      }
    })
    return Array.from(set).sort()
  }, [media])

  // Filter + sort
  let filtered = media

  // Apply Sub-View filter
  if (activeSubView === 'papers') {
    filtered = filtered.filter(m => m.media_type === 'paper')
  } else if (activeSubView === 'articles') {
    filtered = filtered.filter(m => m.media_type === 'article')
  } else if (activeSubView === 'books') {
    filtered = filtered.filter(m => m.media_type === 'book')
  } else if (activeSubView === 'audio_video') {
    filtered = filtered.filter(m => ['podcast', 'video', 'film', 'documentary'].includes(m.media_type))
  }

  // Secondary type filter if in 'all' view
  if (activeSubView === 'all' && typeFilter !== 'All') {
    filtered = filtered.filter(m => m.media_type === typeFilter)
  }

  if (statusFilter !== 'All') filtered = filtered.filter(m => m.status === statusFilter)
  if (tagFilter !== 'All') filtered = filtered.filter(m => Array.isArray(m.tags) && m.tags.includes(tagFilter))

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
    if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
    if (sortBy === 'date_finished') return (b.date_finished || '').localeCompare(a.date_finished || '')
    return 0 // date_added is already sorted by created_at desc
  })

  return (
    <div className="space-y-5">
      {/* ── 1. Top Quick-Drop Link Bar ── */}
      <div className="glass border border-amber-500/25 bg-amber-500/5 p-3.5 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-display text-sm text-starlight font-bold">Quick Drop Link</span>
            <span className="text-[10px] font-mono text-nova/60 hidden sm:inline">
              (Auto-fetches ResearchGate, arXiv, DOI, articles, videos)
            </span>
          </div>
          <button
            onClick={() => {
              setModalInitialData(null)
              setShowModal(true)
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-body text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Manual Entry
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nova/60" />
            <input
              type="text"
              placeholder="Paste paper, article, or video URL and press Enter..."
              value={quickDropUrl}
              onChange={e => setQuickDropUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuickDrop()}
              className="w-full bg-void/70 border border-pulsar/30 rounded-xl pl-9 pr-3 py-2 text-xs text-starlight outline-none font-mono focus:border-amber-400/60"
            />
          </div>
          <button
            onClick={handleQuickDrop}
            disabled={quickFetching || !quickDropUrl.trim()}
            className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {quickFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{quickFetching ? 'Fetching...' : 'Auto-Fetch & Add'}</span>
          </button>
        </div>

        {quickError && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{quickError}</span>
          </div>
        )}
      </div>

      {/* ── 2. Category Sub-View Filter Bar ── */}
      <div className="flex items-center gap-1.5 border-b border-pulsar/30 pb-3 overflow-x-auto scrollbar-hide">
        {SUB_VIEWS.map(view => {
          const Icon = view.icon
          const isActive = activeSubView === view.id
          const count = media.filter(m => {
            if (view.id === 'all') return true
            if (view.type) return m.media_type === view.type
            if (view.types) return view.types.includes(m.media_type)
            return false
          }).length

          return (
            <button
              key={view.id}
              onClick={() => {
                setActiveSubView(view.id)
                setTypeFilter('All')
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display tracking-wide transition-all shrink-0 border ${
                isActive
                  ? view.id === 'papers'
                    ? 'bg-sky/20 text-sky border-sky/40 shadow-sm'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                  : 'text-nova/60 border-pulsar/20 hover:text-starlight hover:bg-pulsar/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{view.label}</span>
              <span className="text-[10px] font-mono opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── 3. Filters + Status + Sort Bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Type filter pills (only visible when in 'all' view) */}
        {activeSubView === 'all' && (
          <div className="flex flex-wrap gap-1">
            {['All', ...MEDIA_TYPES.map(m => m.id)].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all border ${
                  typeFilter === t
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : 'text-nova/60 border-pulsar/30 hover:text-starlight hover:bg-pulsar/10'
                }`}
              >
                {t === 'All' ? 'All' : t === 'paper' ? 'Papers' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}

        {activeSubView === 'all' && <div className="w-px h-5 bg-blue-900/30 hidden sm:block" />}

        {/* Status filter */}
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                statusFilter === s
                  ? 'bg-pulsar/20 text-pulsar border-pulsar/30'
                  : 'text-nova/60 border-pulsar/30 hover:text-starlight hover:bg-pulsar/10'
              }`}
            >
              {s === 'All' ? 'All Status' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Tag filter dropdown */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-px h-5 bg-blue-900/30 hidden sm:block" />
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-nova/60" />
              <select
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="bg-stardust/40 text-xs text-nova/60 border border-pulsar/30 rounded-lg px-2 py-1 outline-none font-mono"
              >
                <option value="All">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>
            {tagFilter !== 'All' && (
              <button
                onClick={() => setTagFilter('All')}
                className="text-[10px] font-mono text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                title="Clear tag filter"
              >
                #{tagFilter} <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-stardust/40 text-xs text-nova/60 border border-pulsar/30 rounded-lg px-2 py-1 outline-none font-mono"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* ── 4. Media Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filtered.map(m => {
          const expanded = expandedId === m.id
          const readingUrl = extractUrl(m.full_review) || extractUrl(m.one_line_takeaway)
          const isPaper = m.media_type === 'paper'
          const hasCustomReviewText = m.full_review && (
            !m.full_review.startsWith('URL:') || 
            m.full_review.replace(/^URL:\s*https?:\/\/[^\s\n]+/i, '').trim().length > 0
          )

          return (
            <div
              key={m.id}
              className={`glass glass-hover hover:-translate-y-0.5 rounded-xl p-4 group relative transition-all border ${
                isPaper
                  ? 'border-sky/20 hover:border-sky/40 bg-sky/5'
                  : 'border-amber-500/15 hover:border-amber-500/30'
              }`}
            >
              <div className="flex gap-3">
                {/* Cover / Icon placeholder */}
                <div
                  className="w-12 h-16 rounded-lg flex-shrink-0 flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: m.cover_url ? `url(${m.cover_url}) center/cover` : '#0d1117',
                    border: isPaper ? '1px solid rgba(56,189,248,0.25)' : '1px solid rgba(245,158,11,0.2)',
                  }}
                >
                  {!m.cover_url && (
                    isPaper 
                      ? <FileText className="w-5 h-5 text-sky" />
                      : <BookOpen className="w-5 h-5 text-amber-500/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className={`font-display text-sm font-bold leading-snug truncate ${isPaper ? 'text-starlight' : 'text-starlight'}`}>
                    {m.title}
                  </h4>
                  
                  {m.author_or_creator && (
                    <p className="text-xs font-body text-nova/60 truncate mt-0.5">
                      {m.author_or_creator}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {/* Type badge */}
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${
                        isPaper
                          ? 'bg-sky/15 text-sky border-sky/30'
                          : m.media_type === 'article'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-500/90 border-amber-500/20'
                      }`}
                    >
                      {isPaper ? 'Paper' : m.media_type}
                    </span>

                    {/* Status pill */}
                    <button
                      onClick={() => {
                        const order = ['want_to', 'in_progress', 'done']
                        const next = order[(order.indexOf(m.status) + 1) % 3]
                        updateStatus(m.id, next)
                      }}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border transition-all ${STATUS_COLORS[m.status] || 'text-nova/60 border-dim/30'}`}
                    >
                      {STATUS_LABELS[m.status] || m.status}
                    </button>

                    {/* Citation / Source Venue */}
                    {m.recommended_by && (
                      <span className="text-[9px] font-mono text-nova/60 truncate max-w-[140px]" title={m.recommended_by}>
                        {m.recommended_by}
                      </span>
                    )}
                  </div>

                  {/* Rating stars */}
                  <div className="flex gap-0.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => updateRating(m.id, n)}
                        className={`text-xs transition-colors ${(m.rating || 0) >= n ? 'text-amber-400' : 'text-nova/60/30 hover:text-amber-400/50'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all self-start">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingItem(m)
                      setModalInitialData(m)
                      setShowModal(true)
                    }}
                    className="p-1 rounded-lg text-nova/60 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                    title="Edit entry"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMedia(m.id)
                    }}
                    className="p-1 rounded-lg text-nova/60 hover:text-danger hover:bg-danger/10 transition-all"
                    title="Delete item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* One-liner Takeaway */}
              {m.one_line_takeaway && (
                <div
                  className={`mt-2.5 pl-3 border-l-2 text-[11px] font-body text-starlight/80 leading-relaxed ${
                    isPaper ? 'border-sky/40' : 'border-amber-500/30'
                  }`}
                >
                  {m.one_line_takeaway}
                </div>
              )}

              {/* Direct Reading Link */}
              {readingUrl && (
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={readingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-xs font-mono hover:underline ${
                      isPaper ? 'text-sky hover:text-sky-300' : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isPaper ? 'Read Paper &rarr;' : 'Read Article &rarr;'}</span>
                  </a>
                </div>
              )}

              {/* Expand for Abstract / Review */}
              {hasCustomReviewText && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpandedId(expanded ? null : m.id)}
                    className={`text-xs font-mono flex items-center gap-1 transition-colors ${
                      isPaper ? 'text-sky/70 hover:text-sky' : 'text-amber-500/70 hover:text-amber-400'
                    }`}
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    <span>{expanded ? (isPaper ? 'hide abstract' : 'hide review') : (isPaper ? 'view abstract' : 'read review')}</span>
                  </button>
                  {expanded && (
                    <div className="mt-2 text-xs font-body text-aurora/80 whitespace-pre-wrap pl-3 border-l border-pulsar/30 leading-relaxed">
                      {m.full_review}
                    </div>
                  )}
                </div>
              )}

              {/* Tags with clickable filter toggle */}
              {m.tags?.length > 0 && (
                <div className="flex gap-1 mt-2.5 flex-wrap">
                  {m.tags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => setTagFilter(tagFilter === tag ? 'All' : tag)}
                      title={`Filter by #${tag}`}
                      className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full transition-all border ${
                        tagFilter === tag
                          ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                          : 'bg-stardust/50 text-nova/60 border-blue-900/15 hover:text-amber-300 hover:border-amber-500/30'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 glass border border-pulsar/20 rounded-2xl p-6">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-amber-500/20" />
          <p className="text-sm font-body text-nova/60 italic">No media entries match your filters.</p>
          <p className="text-xs font-mono text-nova/40 mt-1">Paste a link above or click Manual Entry to add one.</p>
        </div>
      )}

      {showModal && (
        <AddMediaModal
          initialData={modalInitialData}
          isEdit={Boolean(editingItem)}
          onSave={editingItem ? (data) => updateMedia(editingItem.id, data) : saveMedia}
          onClose={() => {
            setShowModal(false)
            setEditingItem(null)
            setModalInitialData(null)
          }}
        />
      )}
    </div>
  )
}

export default MediaLog
