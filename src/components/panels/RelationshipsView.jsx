import { useState } from 'react'
import { Plus, Users, Settings, Check, Phone, Globe, Calendar, Edit2, Trash2, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useContactReminders } from '../../hooks/useContactReminders'
import { useCelebration } from '../../hooks/useCelebration'
import { supabase } from '../../lib/supabase'

const TIER_DEFAULTS = {
  hearth: 2,
  parlour: 7,
  porch: 14,
  yard: 30
}

const TIER_COLORS = {
  hearth: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
  parlour: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  porch: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
  yard: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
}

const TIER_ORDER = ['hearth', 'parlour', 'porch', 'yard']

export default function RelationshipsView() {
  const { user } = useAuth()
  const { celebrate } = useCelebration()
  const { contacts, markReachedOut, fetchContacts } = useContactReminders()
  
  const [activeCategory, setActiveCategory] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '', tier: 'yard', category: '', frequency_days: 30, contact_number: '', social_handle: '', notes: ''
  })
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const categories = ['All', ...new Set(contacts.map(c => c.category).filter(Boolean))]

  const filteredContacts = activeCategory === 'All' 
    ? contacts 
    : contacts.filter(c => c.category === activeCategory)

  const grouped = TIER_ORDER.map(tier => ({
    tier,
    items: filteredContacts.filter(c => c.tier === tier)
  })).filter(g => g.items.length > 0)

  const openModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact)
      setFormData({
        name: contact.name,
        tier: contact.tier,
        category: contact.category || '',
        frequency_days: contact.frequency_days,
        contact_number: contact.contact_number || '',
        social_handle: contact.social_handle || '',
        notes: contact.notes || ''
      })
    } else {
      setEditingContact(null)
      setFormData({
        name: '', tier: 'yard', category: '', frequency_days: 30, contact_number: '', social_handle: '', notes: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleTierChange = (e) => {
    const newTier = e.target.value
    setFormData(prev => ({
      ...prev,
      tier: newTier,
      frequency_days: TIER_DEFAULTS[newTier]
    }))
  }

  const saveContact = async () => {
    if (!formData.name) return
    const payload = {
      user_id: user.id,
      ...formData,
      frequency_days: parseInt(formData.frequency_days) || 30,
      category: formData.category.trim() || null
    }
    if (editingContact) {
      await supabase.from('contacts').update(payload).eq('id', editingContact.id)
    } else {
      await supabase.from('contacts').insert(payload)
    }
    setIsModalOpen(false)
    fetchContacts()
  }

  const deleteContact = async (id) => {
    if (window.confirm("Delete this contact?")) {
      await supabase.from('contacts').delete().eq('id', id)
      fetchContacts()
    }
  }

  const renameCategory = async (oldCat, newCat) => {
    const cleanNew = newCat.trim()
    if (!cleanNew && !window.confirm(`Remove category "${oldCat}" from all contacts?`)) return
    
    // update all contacts with oldCat
    const toUpdate = contacts.filter(c => c.category === oldCat)
    for (const c of toUpdate) {
      await supabase.from('contacts').update({ category: cleanNew || null }).eq('id', c.id)
    }
    fetchContacts()
    if (activeCategory === oldCat) setActiveCategory(cleanNew || 'All')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-starlight text-void' : 'glass text-starlight border border-blue-900/30 hover:bg-blue-900/20'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="glass border border-blue-900/30 p-2 rounded-lg text-dim hover:text-starlight shrink-0">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={() => openModal()} className="glass border border-blue-900/30 px-3 py-1.5 flex items-center gap-2 rounded-lg text-xs font-display text-emerald hover:text-emerald-300 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="glass border border-blue-900/20 rounded-xl p-8 text-center mt-8">
          <Users className="w-8 h-8 text-dim mx-auto mb-3 opacity-50" />
          <p className="text-sm text-dim">No contacts found in this orbit.</p>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.tier} className="space-y-3 mt-6">
          <h3 className="text-xs font-mono text-dim px-2 border-b border-blue-900/20 pb-2">{group.tier} Orbit</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.items.map(contact => (
              <div key={contact.id} className="glass border border-blue-900/20 rounded-xl p-4 overflow-hidden transition-all hover:border-blue-900/40">
                <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}>
                  <div>
                    <h4 className="text-starlight font-body">{contact.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TIER_COLORS[contact.tier]}`}>
                        {contact.tier}
                      </span>
                      <span className={`text-xs ${contact.isOverdue ? 'text-amber-400 font-bold' : 'text-dim'}`}>
                        {contact.isOverdue ? `${contact.daysSince === Infinity ? 'Overdue' : `${contact.daysSince}d overdue`}` : `in ${contact.frequency_days - contact.daysSince}d`}
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); markReachedOut(contact.id); celebrate(); }} className="h-8 w-8 rounded-full bg-blue-900/20 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all shrink-0">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                
                {expandedId === contact.id && (
                  <div className="mt-4 pt-4 border-t border-blue-900/20 space-y-3 animate-in slide-in-from-top-2">
                    <div className="flex flex-wrap gap-4 text-xs text-dim">
                      {contact.contact_number && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3"/> {contact.contact_number}</div>}
                      {contact.social_handle && <div className="flex items-center gap-1.5"><Globe className="w-3 h-3"/> {contact.social_handle}</div>}
                    </div>
                    {contact.notes && <p className="text-xs text-starlight/70 italic border-l-2 border-blue-900/30 pl-2">"{contact.notes}"</p>}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => openModal(contact)} className="text-[10px] bg-blue-900/20 text-sky border border-sky/20 px-3 py-1.5 rounded hover:bg-blue-900/40 flex items-center gap-1.5">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => deleteContact(contact.id)} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded hover:bg-red-500/20 flex items-center gap-1.5">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-void/80 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass border border-blue-900/30 rounded-t-2xl rounded-b-none md:rounded-2xl w-full w-full max-w-full md:max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-blue-900/30 flex justify-between items-center bg-blue-900/10">
              <h3 className="font-display text-starlight">{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-dim hover:text-starlight"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-dim ">Name</label>
                <input className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-dim ">Tier</label>
                  <select className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                    value={formData.tier} onChange={handleTierChange}>
                    <option value="hearth">Hearth (Inner)</option>
                    <option value="parlour">Parlour (Close)</option>
                    <option value="porch">Porch (Casual)</option>
                    <option value="yard">Yard (Distant)</option>
                  </select>
                </div>
                <div className="w-24 space-y-1">
                  <label className="text-xs text-dim ">Freq (days)</label>
                  <input type="number" className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                    value={formData.frequency_days} onChange={e => setFormData({...formData, frequency_days: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-dim ">Category (Tag)</label>
                <input className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                  value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Work, College, Family" list="category-options" />
                <datalist id="category-options">
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-dim ">Phone</label>
                  <input className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                    value={formData.contact_number} onChange={e => setFormData({...formData, contact_number: e.target.value})} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-dim ">Social</label>
                  <input className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50"
                    value={formData.social_handle} onChange={e => setFormData({...formData, social_handle: e.target.value})} placeholder="@username" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-dim ">Notes</label>
                <textarea rows={2} className="w-full bg-stardust/50 text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-nova/50 resize-none"
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>
            </div>
            <div className="p-4 border-t border-blue-900/30 bg-blue-900/5">
              <button onClick={saveContact} disabled={!formData.name} className="w-full py-2 bg-emerald/20 text-emerald border border-emerald/30 rounded-lg font-display tracking-wide disabled:opacity-50 transition-colors">
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-void/80 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="glass border border-blue-900/30 rounded-t-2xl rounded-b-none md:rounded-2xl w-full w-full max-w-full md:max-w-sm overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-display text-starlight">Tag Manager</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-dim hover:text-starlight"><X className="w-4 h-4"/></button>
            </div>
            <p className="text-xs text-dim mb-4">Categories are derived from contacts. Rename or clear them globally here.</p>
            <div className="space-y-2 pt-2 max-h-60 overflow-y-auto scrollbar-hide">
              {categories.filter(c => c !== 'All').map(cat => (
                <div key={cat} className="flex gap-2 items-center">
                  <input className="flex-1 bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded px-3 py-2 outline-none focus:border-nova/50" 
                    defaultValue={cat} 
                    onBlur={(e) => {
                      if (e.target.value !== cat) renameCategory(cat, e.target.value)
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                  />
                  <button onClick={() => renameCategory(cat, '')} className="text-dim hover:text-red-400 p-2 border border-transparent hover:border-red-500/20 hover:bg-red-500/10 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {categories.length <= 1 && <span className="text-xs text-dim italic">No tags exist yet.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
