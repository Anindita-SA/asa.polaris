import { useState, useEffect } from 'react'
import { X, Link as LinkIcon, Sparkles, Loader2, AlertCircle, Check } from 'lucide-react'
import { autoFetchLinkMetadata } from '../../lib/linkMetadataFetcher'

export const MEDIA_TYPES = ['paper', 'article', 'book', 'podcast', 'video', 'course', 'film', 'documentary', 'manga', 'anime']

const AddMediaModal = ({ onSave, onClose, initialData = null }) => {
  const [urlInput, setUrlInput] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [fetchSuccessSource, setFetchSuccessSource] = useState(null)

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
    tags: '',
    cover_url: '',
  })

  useEffect(() => {
    if (initialData) {
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
        full_review: initialData.full_review || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
        cover_url: initialData.cover_url || '',
      })
      if (initialData.source) {
        setFetchSuccessSource(initialData.source)
      }
    }
  }, [initialData])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAutoFetch = async () => {
    if (!urlInput.trim()) return
    setFetching(true)
    setFetchError(null)
    setFetchSuccessSource(null)

    try {
      const { metadata, source } = await autoFetchLinkMetadata(urlInput.trim())
      setForm(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        author_or_creator: metadata.author_or_creator || prev.author_or_creator,
        media_type: metadata.media_type || prev.media_type,
        status: metadata.status || prev.status,
        date_finished: metadata.date_finished || prev.date_finished,
        recommended_by: metadata.recommended_by || prev.recommended_by,
        one_line_takeaway: metadata.one_line_takeaway || prev.one_line_takeaway,
        full_review: metadata.full_review || prev.full_review,
        tags: Array.isArray(metadata.tags) ? metadata.tags.join(', ') : (metadata.tags || prev.tags),
        cover_url: metadata.cover_url || prev.cover_url,
      }))
      setFetchSuccessSource(source)
    } catch (err) {
      setFetchError(err.message || 'Unable to auto-fetch details. Please enter manually.')
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = () => {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      rating: form.rating ? parseInt(form.rating) : null,
      tags: form.tags
        ? form.tags.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')).filter(Boolean)
        : [],
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-void/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="glass border border-amber-500/20 rounded-t-2xl rounded-b-none md:rounded-xl p-6 w-full max-w-full md:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-hide space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base text-starlight">Log Media or Paper</h2>
          </div>
          <button onClick={onClose} className="text-nova/60 hover:text-starlight transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Fetch from URL bar */}
        <div className="bg-stardust/40 border border-pulsar/30 rounded-xl p-3 space-y-2">
          <label className="text-[11px] font-mono text-nova/60 flex items-center gap-1.5">
            <LinkIcon className="w-3 h-3 text-amber-400" /> Auto-Fetch from Link (ResearchGate, arXiv, DOI, Article, Video)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste paper or article link..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAutoFetch()}
              className="flex-1 bg-void/60 border border-pulsar/30 rounded-lg px-3 py-1.5 text-xs text-starlight outline-none font-mono focus:border-amber-400/50"
            />
            <button
              onClick={handleAutoFetch}
              disabled={fetching || !urlInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{fetching ? 'Fetching...' : 'Fetch'}</span>
            </button>
          </div>

          {fetchSuccessSource && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-md">
              <Check className="w-3 h-3 shrink-0" />
              <span>Auto-filled via {fetchSuccessSource}</span>
            </div>
          )}

          {fetchError && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fetchError}</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-mono text-nova/60 block mb-1">Title *</label>
          <input
            type="text"
            placeholder="e.g. Opportunities for decentralised solar power..."
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full bg-transparent border-b border-amber-500/30 text-sm text-starlight outline-none focus:border-amber-400 font-body pb-2"
            autoFocus
          />
        </div>

        {/* Author */}
        <div>
          <label className="text-xs font-mono text-nova/60 block mb-1">Author(s) / Creator(s)</label>
          <input
            type="text"
            placeholder="e.g. Philip Sandwell, Benedict Winchester, et al."
            value={form.author_or_creator}
            onChange={e => set('author_or_creator', e.target.value)}
            className="w-full bg-transparent border-b border-pulsar/40 text-sm text-nova/60 outline-none focus:border-amber-400/50 font-body pb-2"
          />
        </div>

        {/* Type + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Type</label>
            <select
              value={form.media_type}
              onChange={e => set('media_type', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body"
            >
              {MEDIA_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'paper' ? 'Research Paper' : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body"
            >
              <option value="want_to">Want to Read</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Started Date</label>
            <input
              type="date"
              value={form.date_started}
              onChange={e => set('date_started', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Finished / Published</label>
            <input
              type="date"
              value={form.date_finished}
              onChange={e => set('date_finished', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-mono"
            />
          </div>
        </div>

        {/* Rating + Source / Recommended by */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Rating (1-5)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set('rating', n)}
                  className={`w-8 h-8 rounded-lg text-sm font-mono transition-all ${
                    form.rating >= n
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                      : 'bg-stardust/30 text-nova/60 border border-pulsar/30 hover:bg-stardust/50'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono text-nova/60 block mb-1">Source / Journal / Venue</label>
            <input
              type="text"
              placeholder="e.g. Nature Communications (2025)"
              value={form.recommended_by}
              onChange={e => set('recommended_by', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body"
            />
          </div>
        </div>

        {/* One-liner Takeaway / TL;DR */}
        <div>
          <label className="text-xs font-mono text-nova/60 block mb-1">One-line takeaway / Key finding</label>
          <input
            type="text"
            placeholder="Core thesis or takeaway in 1 sentence..."
            value={form.one_line_takeaway}
            onChange={e => set('one_line_takeaway', e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body"
          />
        </div>

        {/* Full Review / Abstract / Reading Link */}
        <div>
          <label className="text-xs font-mono text-nova/60 block mb-1">Abstract / Review / Reading Link</label>
          <textarea
            value={form.full_review}
            onChange={e => set('full_review', e.target.value)}
            rows={3}
            placeholder="Full abstract and reading URL (URL: https://...)"
            className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-body resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs font-mono text-nova/60 block mb-1">Tags (comma separated)</label>
          <input
            type="text"
            placeholder="solar-power, microgrids, research-paper"
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-pulsar/30 rounded-lg px-3 py-2 outline-none font-mono"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim()}
          className="w-full py-2.5 rounded-xl font-display text-sm transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save to Library
        </button>
      </div>
    </div>
  )
}

export default AddMediaModal
