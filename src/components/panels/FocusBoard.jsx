import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Flame, Archive, Plus, X, ArrowUp, Check } from 'lucide-react'

const CATEGORIES = ['academic', 'portfolio', 'application', 'health', 'creative', 'research']

const FocusBoard = () => {
  const { user, addXP } = useAuth()
  const [focusItems, setFocusItems] = useState([])
  const [backburner, setBackburner] = useState([])
  const [showModal, setShowModal] = useState(null) // 'focus' | 'backburner'
  const [form, setForm] = useState({ title: '', category: 'academic', why_now: '', why_deferred: '', context_snapshot: '', revisit_after: '' })

  useEffect(() => {
    fetchFocus()
    fetchBackburner()
  }, [])

  const fetchFocus = async () => {
    const { data } = await supabase.from('focus_items').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at')
    setFocusItems(data || [])
  }

  const fetchBackburner = async () => {
    const { data } = await supabase.from('backburner').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setBackburner(data || [])
  }

  const addFocus = async () => {
    if (focusItems.length >= 3) return
    if (!form.title) return
    await supabase.from('focus_items').insert({ title: form.title, category: form.category, why_now: form.why_now, user_id: user.id })
    setForm(f => ({ ...f, title: '', why_now: '' }))
    setShowModal(null)
    fetchFocus()
  }

  const completeFocus = async (item) => {
    await supabase.from('focus_items').update({ status: 'done' }).eq('id', item.id)
    await addXP(75)
    fetchFocus()
  }

  const sendToBackburner = async (item) => {
    await supabase.from('focus_items').update({ status: 'backburned' }).eq('id', item.id)
    await supabase.from('backburner').insert({ title: item.title, user_id: user.id, why_deferred: 'From active focus', context_snapshot: item.why_now })
    fetchFocus()
    fetchBackburner()
  }

  const addBackburner = async () => {
    if (!form.title) return
    await supabase.from('backburner').insert({ title: form.title, why_deferred: form.why_deferred, context_snapshot: form.context_snapshot, revisit_after: form.revisit_after || null, user_id: user.id })
    setForm(f => ({ ...f, title: '', why_deferred: '', context_snapshot: '', revisit_after: '' }))
    setShowModal(null)
    fetchBackburner()
  }

  const promoteToFocus = async (item) => {
    if (focusItems.length >= 3) { alert('Max 3 active focus items. Complete or backburner one first.'); return }
    await supabase.from('focus_items').insert({ title: item.title, category: 'academic', why_now: item.context_snapshot, user_id: user.id })
    await supabase.from('backburner').delete().eq('id', item.id)
    fetchFocus()
    fetchBackburner()
  }

  const deleteBackburner = async (id) => {
    await supabase.from('backburner').delete().eq('id', id)
    fetchBackburner()
  }

  const slots = [0, 1, 2]

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Active Focus */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display tracking-widest text-starlight flex items-center gap-2">
              <Flame className="w-4 h-4 text-gold" /> Active Focus
            </h2>
            <span className="text-xs font-mono text-dim">{focusItems.length}/3</span>
          </div>

          <div className="grid gap-3">
            {slots.map(i => {
              const item = focusItems[i]
              return item ? (
                <div key={item.id} className="glass glass-hover p-4 rounded-xl border border-blue-900/20 relative group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-mono border ${
                          item.category === 'academic' ? 'border-aurora/30 text-aurora' :
                          item.category === 'portfolio' ? 'border-pulsar/30 text-pulsar' :
                          'border-emerald/30 text-emerald'
                        }`}>{item.category}</span>
                      </div>
                      <p className="text-sm text-starlight font-body">{item.title}</p>
                      {item.why_now && <p className="text-xs text-dim mt-1 italic">"{item.why_now}"</p>}
                    </div>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => completeFocus(item)} title="Complete" className="text-dim hover:text-emerald transition-colors p-1"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => sendToBackburner(item)} title="Backburner" className="text-dim hover:text-gold transition-colors p-1"><Archive className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className={`border border-dashed border-blue-900/30 rounded-xl p-4 flex items-center justify-center ${focusItems.length <= i ? 'opacity-60' : 'opacity-20'}`}>
                  {focusItems.length <= i && i === focusItems.length ? (
                    <button onClick={() => setShowModal('focus')} className="flex items-center gap-2 text-dim hover:text-nova transition-colors text-xs font-body">
                      <Plus className="w-3.5 h-3.5" /> Add focus item
                    </button>
                  ) : (
                    <span className="text-dim text-xs">slot {i + 1}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Backburner */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display tracking-widest text-starlight flex items-center gap-2">
              <Archive className="w-4 h-4 text-dim" /> Backburner
            </h2>
            <button onClick={() => setShowModal('backburner')} className="text-dim hover:text-nova transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {backburner.map(item => (
              <div key={item.id} className="glass p-3 rounded-lg border border-blue-900/10 group flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-starlight/80 font-body">{item.title}</p>
                  {item.why_deferred && <p className="text-xs text-dim mt-0.5">Why deferred: {item.why_deferred}</p>}
                  {item.context_snapshot && <p className="text-xs text-dim/70 mt-0.5 italic truncate">"{item.context_snapshot}"</p>}
                  {item.revisit_after && <p className="text-xs font-mono text-aurora/60 mt-1">revisit after {new Date(item.revisit_after).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => promoteToFocus(item)} title="Promote to Focus" className="text-dim hover:text-pulsar transition-colors p-1"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => deleteBackburner(item.id)} className="text-dim hover:text-danger transition-colors p-1"><X className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
            {!backburner.length && <p className="text-xs text-dim italic font-body">Nothing deferred yet. Things you're not doing now go here.</p>}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display tracking-wider text-starlight">{showModal === 'focus' ? 'New Focus Item' : 'Add to Backburner'}</h3>
              <button onClick={() => setShowModal(null)}><X className="w-4 h-4 text-dim hover:text-starlight" /></button>
            </div>

            <input placeholder="Title" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            {showModal === 'focus' ? (
              <>
                <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
                  value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Why now? (optional)" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
                  value={form.why_now} onChange={e => setForm(f => ({ ...f, why_now: e.target.value }))} />
                <button onClick={addFocus} disabled={focusItems.length >= 3} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar text-sm font-display tracking-wider rounded-lg hover:bg-pulsar/30 transition-colors disabled:opacity-40">
                  {focusItems.length >= 3 ? 'FOCUS FULL (max 3)' : 'ADD TO FOCUS'}
                </button>
              </>
            ) : (
              <>
                <input placeholder="Why deferred?" className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body"
                  value={form.why_deferred} onChange={e => setForm(f => ({ ...f, why_deferred: e.target.value }))} />
                <textarea placeholder="Context snapshot — what you know so far" rows={2} className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body resize-none"
                  value={form.context_snapshot} onChange={e => setForm(f => ({ ...f, context_snapshot: e.target.value }))} />
                <input type="date" className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
                  value={form.revisit_after} onChange={e => setForm(f => ({ ...f, revisit_after: e.target.value }))} />
                <button onClick={addBackburner} className="w-full py-2 bg-gold-dim/20 border border-gold/20 text-gold text-sm font-display tracking-wider rounded-lg hover:bg-gold-dim/30 transition-colors">
                  DEFER TO BACKBURNER
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FocusBoard
