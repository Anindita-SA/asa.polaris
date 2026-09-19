import React, { useState, useEffect } from 'react'
import { X, Link as LinkIcon, Sparkles, Loader2, AlertCircle, Check, FileText, BookOpen, Newspaper, Headphones, Video, GraduationCap, Film, Book, Tag as TagIcon, Star } from 'lucide-react'
import { autoFetchLinkMetadata } from '../../lib/linkMetadataFetcher'

export const MEDIA_TYPES = [
  { id: 'paper', label: 'Research Paper', icon: FileText, color: 'text-sky border-sky/30 bg-sky/10' },
  { id: 'article', label: 'Article / News', icon: Newspaper, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'book', label: 'Book', icon: Book, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'course', label: 'Course / Lecture', icon: GraduationCap, color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'podcast', label: 'Podcast / Audio', icon: Headphones, color: 'text-pink-400 border-pink-500/30 bg-pink-500/10' },
  { id: 'video', label: 'Video', icon: Video, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  { id: 'film', label: 'Film', icon: Film, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10' },
  { id: 'documentary', label: 'Documentary', icon: Film, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
  { id: 'manga', label: 'Manga', icon: BookOpen, color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
  { id: 'anime', label: 'Anime', icon: Video, color: 'text-red-400 border-red-500/30 bg-red-500/10' }
]

function extractDirectUrl(text) {
  if (!text || typeof text !== 'string') return ''
  const match = text.match(/https?:\/\/[^\s\n)]+/i)
  return match ? match[0] : ''
}

function cleanReviewText(text) {
  if (!text || typeof text !== 'string') return ''
  return text.replace(/^URL:\s*https?:\/\/[^\s\n]+\s*/i, '').trim()
}

const AddMediaModal = ({ onSave, onClose, initialData = null, isEdit = false }) => {
  const [urlInput, setUrlInput] = useState('')
  const [directUrl, setDirectUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [fetchSuccessSource, setFetchSuccessSource] = useState(null)
  const [tagInput, setTagInput] = useState('')

  const [form, setForm] = useState({
    title: '',
    author_or_creator: '',
    media_type: 'paper',
    status: 'want_to',
    date_started: '',
    date_finished: '',
    recommended_by: '',
    rating: null,
    one_line_takeaway: '',
    full_review: '',
    tags: [],
    cover_url: '',
  })

  useEffect(() => {
    if (initialData) {
      const extractedUrl = extractDirectUrl(initialData.full_review) || extractDirectUrl(initialData.one_line_takeaway) || initialData.url || ''
      const cleanedReview = cleanReviewText(initialData.full_review)

      setForm({
        title: initialData.title || '',
        author_or_creator: initialData.author_or_creator || '',
        media_type: initialData.media_type || 'paper',
        status: initialData.status || 'want_to',
        date_started: initialData.date_started || '',
        date_finished: initialData.date_finished || '',
        recommended_by: initialData.recommended_by || '',
        rating: initialData.rating || null,
        one_line_takeaway: initialData.one_line_takeaway || '',
        full_review: cleanedReview,
        tags: Array.isArray(initialData.tags) ? initialData.tags : (initialData.tags ? String(initialData.tags).split(',').map(t => t.trim()).filter(Boolean) : []),
        cover_url: initialData.cover_url || '',
      })
      setDirectUrl(extractedUrl)
      if (initialData.source) {
        setFetchSuccessSource(initialData.source)
      }
    }
  }, [initialData])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAutoFetch = async (targetUrl = urlInput) => {
    const urlToFetch = targetUrl.trim()
    if (!urlToFetch) return
    setFetching(true)
    setFetchError(null)
    setFetchSuccessSource(null)

    try {
      const { metadata, source } = await autoFetchLinkMetadata(urlToFetch)
      setForm(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        author_or_creator: metadata.author_or_creator || prev.author_or_creator,
        media_type: metadata.media_type || prev.media_type,
        status: metadata.status || prev.status,
        date_finished: metadata.date_finished || prev.date_finished,
        recommended_by: metadata.recommended_by || prev.recommended_by,
        one_line_takeaway: metadata.one_line_takeaway || prev.one_line_takeaway,
        full_review: cleanReviewText(metadata.full_review) || prev.full_review,
        tags: Array.isArray(metadata.tags)
          ? Array.from(new Set([...prev.tags, ...metadata.tags]))
          : prev.tags,
        cover_url: metadata.cover_url || prev.cover_url,
      }))
      setDirectUrl(urlToFetch)
      setFetchSuccessSource(source)
    } catch (err) {
      setFetchError(err.message || 'Unable to auto-fetch details. Please enter manually.')
      if (!directUrl) setDirectUrl(urlToFetch)
    } finally {
      setFetching(false)
    }
  }

  const addTag = (tagToAdd) => {
    const cleaned = tagToAdd.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    if (cleaned && !form.tags.includes(cleaned)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, cleaned] }))
    }
    setTagInput('')
  }

  const removeTag = (tagToRemove) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }))
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return

    // Compose full review text cleanly with URL if provided
    let finalReview = form.full_review.trim()
    if (directUrl.trim()) {
      if (!finalReview.includes(directUrl.trim())) {
        finalReview = finalReview ? `${finalReview}\n\nURL: ${directUrl.trim()}` : `URL: ${directUrl.trim()}`
      }
    }

    const payload = {
      ...form,
      full_review: finalReview,
      rating: form.rating ? parseInt(form.rating) : null,
      tags: form.tags
    }

    onSave(payload)
  }

  const isPaper = form.media_type === 'paper'

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-void/85 backdrop-blur-md p-0 md:p-4" onClick={onClose}>
      <div
        className={`glass border rounded-t-2xl md:rounded-2xl p-5 md:p-6 w-full max-w-full md:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide space-y-5 transition-all ${
          isPaper ? 'border-sky/30 shadow-2xl' : 'border-amber-500/25 shadow-2xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between border-b border-pulsar/30 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isPaper ? 'bg-sky/15 text-sky border-sky/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}`}>
              {isPaper ? <FileText className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-starlight">
                {isEdit ? 'Edit Literature / Media Entry' : 'Log Literature or Media'}
              </h2>
              <p className="text-[11px] font-mono text-nova/60">
                {isEdit ? 'Update metadata, findings, citations, and ratings.' : 'Add academic research, articles, books, or media to personal curriculum.'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-nova/60 hover:text-starlight hover:bg-pulsar/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Fetch Bar (Available in both create and edit mode) */}
        <div className="glass border border-pulsar/30 bg-stardust/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-nova/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-Fetch Metadata (DOI, arXiv, ResearchGate, URLs)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nova/60" />
              <input
                type="text"
                placeholder="Paste paper DOI, arXiv, ResearchGate, or article link..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAutoFetch()}
                className="w-full bg-void/70 border border-pulsar/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-starlight outline-none font-mono focus:border-amber-400/60"
              />
            </div>
            <button
              onClick={() => handleAutoFetch()}
              disabled={fetching || !urlInput.trim()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{fetching ? 'Fetching...' : 'Fetch'}</span>
            </button>
          </div>

          {fetchSuccessSource && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              <Check className="w-3 h-3 shrink-0" />
              <span>Metadata successfully populated via {fetchSuccessSource}</span>
            </div>
          )}

          {fetchError && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>

        {/* Essential Metadata: Title & Authors */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Title <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Decentralised Power Systems in Emerging Rural Grids"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl px-3.5 py-2 text-sm font-display text-starlight outline-none focus:border-amber-400/60"
              autoFocus={!isEdit}
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Author(s) / Creator(s)
            </label>
            <input
              type="text"
              placeholder="e.g. Philip Sandwell, Benedict Winchester, et al."
              value={form.author_or_creator}
              onChange={e => set('author_or_creator', e.target.value)}
              className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl px-3.5 py-2 text-xs font-body text-starlight outline-none focus:border-amber-400/60"
            />
          </div>
        </div>

        {/* Media Type Grid Selection */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1.5">
            Category / Media Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {MEDIA_TYPES.map(typeItem => {
              const Icon = typeItem.icon
              const isSelected = form.media_type === typeItem.id
              return (
                <button
                  key={typeItem.id}
                  type="button"
                  onClick={() => set('media_type', typeItem.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all border text-left ${
                    isSelected
                      ? typeItem.color
                      : 'text-nova/60 border-pulsar/30 bg-stardust/20 hover:text-starlight hover:bg-pulsar/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{typeItem.label.split('/')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Status, Rating, Reading URL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/40 rounded-xl px-3 py-2 outline-none font-mono"
            >
              <option value="want_to">Want to Read / Queue</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed / Archived</option>
            </select>
          </div>

          {/* Direct Link */}
          <div className="sm:col-span-2">
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Direct Reading Link / DOI / URL
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nova/60" />
              <input
                type="text"
                placeholder="https://doi.org/... or https://..."
                value={directUrl}
                onChange={e => setDirectUrl(e.target.value)}
                className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-starlight outline-none focus:border-amber-400/60"
              />
            </div>
          </div>
        </div>

        {/* Dates & Source Venue */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Date Started
            </label>
            <input
              type="date"
              value={form.date_started}
              onChange={e => set('date_started', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/40 rounded-xl px-3 py-2 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Date Finished / Published
            </label>
            <input
              type="date"
              value={form.date_finished}
              onChange={e => set('date_finished', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/40 rounded-xl px-3 py-2 outline-none font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
              Venue / Journal / Source
            </label>
            <input
              type="text"
              placeholder="e.g. Nature Energy (2025)"
              value={form.recommended_by}
              onChange={e => set('recommended_by', e.target.value)}
              className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl px-3 py-2 text-xs font-body text-starlight outline-none focus:border-amber-400/60"
            />
          </div>
        </div>

        {/* 5-Star Rating Picker */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
            Rating (1 to 5 Stars)
          </label>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('rating', form.rating === n ? null : n)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                    (form.rating || 0) >= n
                      ? 'bg-amber-500/25 text-amber-400 border-amber-500/40 shadow-sm'
                      : 'bg-stardust/30 text-nova/40 border-pulsar/30 hover:text-amber-300 hover:border-amber-500/30'
                  }`}
                >
                  <Star className={`w-4 h-4 ${(form.rating || 0) >= n ? 'fill-amber-400' : ''}`} />
                </button>
              ))}
            </div>
            {form.rating && (
              <span className="text-xs font-mono text-amber-400/90 ml-1">
                {form.rating} of 5 stars
              </span>
            )}
          </div>
        </div>

        {/* One-line takeaway */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
            One-line Takeaway / Core Finding
          </label>
          <input
            type="text"
            placeholder="Core thesis or takeaway in 1 sentence..."
            value={form.one_line_takeaway}
            onChange={e => set('one_line_takeaway', e.target.value)}
            className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl px-3.5 py-2 text-xs font-body text-starlight outline-none focus:border-amber-400/60"
          />
        </div>

        {/* Abstract / Notes / Full Review */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
            Abstract / Notes / Review
          </label>
          <textarea
            value={form.full_review}
            onChange={e => set('full_review', e.target.value)}
            rows={4}
            placeholder="Full abstract, methodology notes, or reading reflections..."
            className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl px-3.5 py-2 text-xs font-body text-starlight outline-none focus:border-amber-400/60 resize-y leading-relaxed"
          />
        </div>

        {/* Interactive Tag Manager */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-nova/70 block mb-1">
            Topic Tags
          </label>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nova/60" />
              <input
                type="text"
                placeholder="Type tag and press Enter (e.g. power-electronics, microgrids)..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault()
                    if (tagInput.trim()) addTag(tagInput)
                  }
                }}
                className="w-full bg-stardust/40 border border-pulsar/40 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-starlight outline-none focus:border-amber-400/60"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (tagInput.trim()) addTag(tagInput)
              }}
              disabled={!tagInput.trim()}
              className="px-3 py-1.5 rounded-xl text-xs font-mono bg-stardust/60 text-nova/80 border border-pulsar/40 hover:text-starlight hover:border-amber-500/30 disabled:opacity-40"
            >
              Add Tag
            </button>
          </div>

          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-rose-400 transition-colors ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-pulsar/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-mono text-nova/60 hover:text-starlight hover:bg-pulsar/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!form.title.trim()}
            className="px-5 py-2 rounded-xl font-display text-xs uppercase tracking-wider transition-all bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {isEdit ? 'Save Changes' : 'Add to Library'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddMediaModal
