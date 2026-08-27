import { useState } from 'react'
import { X } from 'lucide-react'

const MEDIA_TYPES = ['book', 'film', 'documentary', 'podcast', 'article', 'course', 'manga', 'anime']

const AddMediaModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({
    title: '', author_or_creator: '', media_type: 'book',
    status: 'want_to', date_started: '', date_finished: '',
    recommended_by: '', rating: null, one_line_takeaway: '',
    full_review: '', tags: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.title.trim()) return
    const payload = {
      ...form,
      rating: form.rating ? parseInt(form.rating) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-void/80 backdrop-blur-sm p-0 md:p-4" onClick={onClose}>
      <div className="glass border border-amber-500/20 rounded-t-2xl rounded-b-none md:rounded-2xl p-6 w-full w-full max-w-full md:max-w-lg max-h-[85vh] overflow-y-auto scrollbar-hide space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-starlight ">Log Media</h2>
          <button onClick={onClose} className="text-dim hover:text-starlight transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Title */}
        <input type="text" placeholder="Title *" value={form.title} onChange={e => set('title', e.target.value)}
          className="w-full bg-transparent border-b border-amber-500/30 text-sm text-starlight outline-none focus:border-amber-400 font-body pb-2" autoFocus />

        {/* Author */}
        <input type="text" placeholder="Author / Creator" value={form.author_or_creator} onChange={e => set('author_or_creator', e.target.value)}
          className="w-full bg-transparent border-b border-blue-900/30 text-sm text-dim outline-none focus:border-amber-400/50 font-body pb-2" />

        {/* Type + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Type</label>
            <select value={form.media_type} onChange={e => set('media_type', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body">
              {MEDIA_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body">
              <option value="want_to">Want to</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Started</label>
            <input type="date" value={form.date_started} onChange={e => set('date_started', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-mono" />
          </div>
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Finished</label>
            <input type="date" value={form.date_finished} onChange={e => set('date_finished', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-mono" />
          </div>
        </div>

        {/* Rating + Recommended by */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Rating (1-5)</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => set('rating', n)}
                  className={`w-8 h-8 rounded-lg text-sm font-mono transition-all ${
                    form.rating >= n
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/40'
                      : 'bg-stardust/30 text-dim border border-blue-900/20 hover:bg-stardust/50'
                  }`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-mono text-dim block mb-1">Recommended by</label>
            <input type="text" placeholder="Friend's name" value={form.recommended_by} onChange={e => set('recommended_by', e.target.value)}
              className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body" />
          </div>
        </div>

        {/* One-liner */}
        <div>
          <label className="text-[10px] font-mono text-dim block mb-1">One-line takeaway</label>
          <input type="text" value={form.one_line_takeaway} onChange={e => set('one_line_takeaway', e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body" />
        </div>

        {/* Full review */}
        <div>
          <label className="text-[10px] font-mono text-dim block mb-1">Full review</label>
          <textarea value={form.full_review} onChange={e => set('full_review', e.target.value)} rows={3}
            className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body resize-none" />
        </div>

        {/* Tags */}
        <div>
          <label className="text-[10px] font-mono text-dim block mb-1">Tags (comma separated)</label>
          <input type="text" placeholder="stoicism, philosophy" value={form.tags} onChange={e => set('tags', e.target.value)}
            className="w-full bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded-lg px-3 py-2 outline-none font-body" />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit}
          className="w-full py-2.5 rounded-xl font-display text-sm transition-all bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30">
          Log Media
        </button>
      </div>
    </div>
  )
}

export default AddMediaModal
