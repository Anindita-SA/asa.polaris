import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { BookOpen, Plus, Sparkles } from 'lucide-react'
import BookSpine from './BookSpine'
import CurriculumView from './CurriculumView'
import MediaLog from './MediaLog'
import { CURRICULUM_CATEGORIES, SEED_CURRICULA, SEED_MEDIA_LOG } from '../../data/curriculumDefaults'

const TABS = [
  { id: 'Career',      label: 'Career',      color: '#3B82F6' },
  { id: 'Academic',    label: 'Academic',     color: '#8B5CF6' },
  { id: 'Self',        label: 'Self',         color: '#10B981' },
  { id: 'Media & Lit', label: 'Media & Lit',  color: '#F59E0B' },
]

const CurriculumShelf = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Career')
  const [categories, setCategories] = useState([])
  const [curricula, setCurricula] = useState([])
  const [selectedCurriculum, setSelectedCurriculum] = useState(null)
  const [addingCurriculum, setAddingCurriculum] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '', estimated_hours: '' })
  const [seeding, setSeeding] = useState(false)
  const [flippingId, setFlippingId] = useState(null)
  const shelfRef = useRef(null)

  // Horizontal scroll via mouse wheel
  useEffect(() => {
    const el = shelfRef.current
    if (!el) return
    const handler = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [curricula])

  const seedLibrary = async () => {
    if (!user?.id || seeding) return
    setSeeding(true)
    try {
      const catMap = {}
      for (const cat of CURRICULUM_CATEGORIES) {
        const { data: ins } = await supabase.from('curriculum_categories').insert({
          user_id: user.id, title: cat.title, accent_color: cat.accent_color, position: cat.position,
        }).select('id, title').single()
        if (ins) catMap[ins.title] = ins.id
      }
      for (let i = 0; i < SEED_CURRICULA.length; i++) {
        const c = SEED_CURRICULA[i]
        const categoryId = catMap[c.category]
        if (!categoryId) continue
        const { data: curr } = await supabase.from('curricula').insert({
          user_id: user.id, category_id: categoryId, title: c.title,
          description: c.description, estimated_hours: c.estimated_hours, position: i,
        }).select('id').single()
        if (!curr?.id) continue
        if (c.topics?.length) {
          await supabase.from('curriculum_topics').insert(
            c.topics.map((t, idx) => ({
              user_id: user.id, curriculum_id: curr.id, title: t.title,
              estimated_hours: t.estimated_hours || null,
              is_recommended_next: t.is_recommended_next || false, position: idx,
            }))
          )
        }
        if (c.resources?.length) {
          await supabase.from('curriculum_resources').insert(
            c.resources.map(r => ({
              user_id: user.id, curriculum_id: curr.id, title: r.title,
              author: r.author || null, resource_type: r.resource_type || 'book', url: r.url || null,
            }))
          )
        }
      }
      await supabase.from('media_log').insert(SEED_MEDIA_LOG.map(m => ({ user_id: user.id, ...m })))
      fetchAll()
    } catch (e) { console.error('Seed error:', e) }
    finally { setSeeding(false) }
  }

  useEffect(() => {
    if (user?.id) fetchAll()
  }, [user?.id, activeTab])

  const fetchAll = async () => {
    const { data: cats } = await supabase.from('curriculum_categories')
      .select('*').eq('user_id', user.id).order('position')
    setCategories(cats || [])

    const cat = (cats || []).find(c => c.title === activeTab)
    if (!cat) { setCurricula([]); return }

    let { data: currs } = await supabase.from('curricula')
      .select('*').eq('category_id', cat.id).order('position')

    // Auto-seed IELTS 2026 Preparation Sprint if missing under Career
    if (activeTab === 'Career' && cat.id && (!currs || !currs.some(c => c.title?.includes('IELTS')))) {
      try {
        const ieltsSeed = SEED_CURRICULA.find(c => c.title.includes('IELTS'))
        if (ieltsSeed) {
          const { data: newCurr } = await supabase.from('curricula').insert({
            user_id: user.id,
            category_id: cat.id,
            title: ieltsSeed.title,
            description: ieltsSeed.description,
            estimated_hours: ieltsSeed.estimated_hours,
            position: (currs?.length || 0)
          }).select('*').single()

          if (newCurr?.id) {
            if (ieltsSeed.topics?.length) {
              await supabase.from('curriculum_topics').insert(
                ieltsSeed.topics.map((t, idx) => ({
                  user_id: user.id, curriculum_id: newCurr.id, title: t.title,
                  estimated_hours: t.estimated_hours || null,
                  is_recommended_next: t.is_recommended_next || false, position: idx,
                }))
              )
            }
            if (ieltsSeed.resources?.length) {
              await supabase.from('curriculum_resources').insert(
                ieltsSeed.resources.map(r => ({
                  user_id: user.id, curriculum_id: newCurr.id, title: r.title,
                  author: r.author || null, resource_type: r.resource_type || 'book', url: r.url || null,
                }))
              )
            }
            // Refetch after insertion
            const { data: refetched } = await supabase.from('curricula')
              .select('*').eq('category_id', cat.id).order('position')
            currs = refetched
          }
        }
      } catch (e) {
        console.warn('Auto-seed IELTS error:', e)
      }
    }

    if (currs?.length) {
      const currIds = currs.map(c => c.id)
      const { data: topics } = await supabase.from('curriculum_topics')
        .select('curriculum_id, status').in('curriculum_id', currIds)
      const topicMap = {}
      ;(topics || []).forEach(t => {
        if (!topicMap[t.curriculum_id]) topicMap[t.curriculum_id] = { total: 0, done: 0 }
        topicMap[t.curriculum_id].total++
        if (t.status === 'done') topicMap[t.curriculum_id].done++
      })
      currs.forEach(c => {
        c._topicCount = topicMap[c.id]?.total || 0
        c._doneCount = topicMap[c.id]?.done || 0
      })
    }
    setCurricula(currs || [])
  }

  const openBook = (curriculum) => {
    setFlippingId(curriculum.id)
    setTimeout(() => {
      setSelectedCurriculum(curriculum)
      setFlippingId(null)
    }, 500)
  }

  const addCurriculum = async () => {
    if (!newForm.title.trim()) return
    const cat = categories.find(c => c.title === activeTab)
    if (!cat) return
    await supabase.from('curricula').insert({
      user_id: user.id, category_id: cat.id, title: newForm.title,
      description: newForm.description || null,
      estimated_hours: parseInt(newForm.estimated_hours) || null,
      position: curricula.length,
    })
    setNewForm({ title: '', description: '', estimated_hours: '' })
    setAddingCurriculum(false)
    fetchAll()
  }

  const tabColor = TABS.find(t => t.id === activeTab)?.color || '#3B82F6'

  // Interior view — matches other pages' layout
  if (selectedCurriculum) {
    return (
      <div className="h-full overflow-y-auto p-6 relative">
        <CurriculumView
          curriculum={selectedCurriculum}
          accentColor={tabColor}
          onBack={() => { setSelectedCurriculum(null); fetchAll() }}
        />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Header — matches other pages */}
      <div className="p-6 pb-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" style={{ color: tabColor }} />
            <h2 className="font-display text-2xl text-starlight tracking-wider">Personal Curriculum</h2>
          </div>
          {activeTab !== 'Media & Lit' && (
            <button onClick={() => setAddingCurriculum(true)}
              className="glass border border-blue-900/20 text-dim hover:text-starlight hover:bg-stardust/30 transition-all rounded-lg px-4 py-2 text-sm font-body flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Book
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="max-w-4xl mx-auto flex border-b border-blue-900/20">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedCurriculum(null) }}
              className={`flex-1 py-3 text-sm font-display tracking-wider transition-all border-b-2 ${
                activeTab === tab.id ? 'text-starlight' : 'text-dim hover:text-starlight border-transparent'
              }`}
              style={activeTab === tab.id ? { borderBottomColor: tab.color, color: tab.color } : {}}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'Media & Lit' ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <MediaLog />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center">
            {/* Add curriculum form */}
            {addingCurriculum && (
              <div className="px-6">
                <div className="max-w-4xl mx-auto glass border border-dashed border-blue-900/30 rounded-xl p-4 space-y-3 mb-4">
                  <input type="text" placeholder="Curriculum title..." value={newForm.title}
                    onChange={e => setNewForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCurriculum()}
                    className="w-full bg-transparent border-b border-blue-900/30 text-sm text-starlight outline-none focus:border-pulsar font-body pb-1" autoFocus />
                  <input type="text" placeholder="Description (optional)" value={newForm.description}
                    onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-transparent border-b border-blue-900/20 text-xs text-dim outline-none font-body pb-1" />
                  <div className="flex gap-3 items-center">
                    <input type="number" placeholder="Est. hours" value={newForm.estimated_hours}
                      onChange={e => setNewForm(p => ({ ...p, estimated_hours: e.target.value }))}
                      className="w-24 bg-transparent border-b border-blue-900/20 text-xs text-dim outline-none font-mono pb-1" />
                    <button onClick={addCurriculum} className="px-4 py-1.5 text-xs font-display rounded-lg" style={{ background: `${tabColor}20`, color: tabColor, border: `1px solid ${tabColor}40` }}>ADD</button>
                    <button onClick={() => setAddingCurriculum(false)} className="text-dim text-xs hover:text-starlight transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Bookshelf — single horizontal scrollable row */}
            {curricula.length > 0 ? (
              <div className="flex flex-col items-center">
                <div
                  ref={shelfRef}
                  className="w-full overflow-x-auto scrollbar-hide"
                  style={{ scrollBehavior: 'smooth' }}
                >
                  <div className="flex gap-8 px-16 py-10 w-max">
                    {curricula.map(c => (
                      <BookSpine
                        key={c.id}
                        curriculum={c}
                        accentColor={tabColor}
                        isFlipping={flippingId === c.id}
                        onClick={openBook}
                      />
                    ))}
                  </div>
                </div>

                {/* Shelf edge — decorative line */}
                <div className="w-full max-w-4xl mx-auto px-16">
                  <div className="h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${tabColor}25, transparent)` }} />
                </div>
              </div>
            ) : !addingCurriculum && (
              <div className="text-center py-16 text-dim/50 font-body">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">No curricula yet for {activeTab}.</p>
                {categories.length === 0 ? (
                  <button onClick={seedLibrary} disabled={seeding}
                    className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl font-display text-sm tracking-wider transition-all bg-pulsar/20 text-pulsar border border-pulsar/30 hover:bg-pulsar/30 disabled:opacity-50">
                    <Sparkles className="w-4 h-4" /> {seeding ? 'Seeding...' : 'Seed Library'}
                  </button>
                ) : (
                  <p className="text-xs mt-1">Click "New Book" to start your collection.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CurriculumShelf
