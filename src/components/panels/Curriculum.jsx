import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ChevronDown, ChevronUp, Plus, X, Check, Circle, Clock, BookOpen } from 'lucide-react'

const NODE_TABS = [
  { id: 'Career', label: 'Career', color: '#3b82f6' },
  { id: 'Academic', label: 'Academic', color: '#8b5cf6' },
  { id: 'Self', label: 'Self', color: '#10b981' },
]

const STATUS_CONFIG = {
  not_started: { icon: Circle, color: 'text-dim', label: 'Not Started' },
  in_progress: { icon: Clock, color: 'text-pulsar', label: 'In Progress' },
  done: { icon: Check, color: 'text-emerald', label: 'Done' },
}

const Curriculum = () => {
  const { user, addXP } = useAuth()
  const [activeTab, setActiveTab] = useState('Career')
  const [chapters, setChapters] = useState([])
  const [topics, setTopics] = useState({})
  const [expanded, setExpanded] = useState({})
  const [addingChapter, setAddingChapter] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [newChapterDesc, setNewChapterDesc] = useState('')
  const [addingTopicFor, setAddingTopicFor] = useState(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')

  useEffect(() => { if (user?.id) fetchAll() }, [user?.id, activeTab])

  const fetchAll = async () => {
    const { data: chapterData } = await supabase
      .from('curriculum_chapters')
      .select('*')
      .eq('user_id', user.id)
      .eq('node_title', activeTab)
      .order('position')
    setChapters(chapterData || [])

    if (chapterData?.length) {
      const { data: topicData } = await supabase
        .from('curriculum_topics')
        .select('*')
        .eq('user_id', user.id)
        .in('chapter_id', chapterData.map(c => c.id))
        .order('position')
      const grouped = {}
      ;(topicData || []).forEach(t => {
        grouped[t.chapter_id] = grouped[t.chapter_id] || []
        grouped[t.chapter_id].push(t)
      })
      setTopics(grouped)
    } else {
      setTopics({})
    }
  }

  const addChapter = async () => {
    if (!newChapterTitle.trim()) return
    await supabase.from('curriculum_chapters').insert({
      user_id: user.id,
      title: newChapterTitle,
      description: newChapterDesc || null,
      node_title: activeTab,
      position: chapters.length,
    })
    setNewChapterTitle('')
    setNewChapterDesc('')
    setAddingChapter(false)
    fetchAll()
  }

  const deleteChapter = async (id) => {
    await supabase.from('curriculum_chapters').delete().eq('id', id)
    fetchAll()
  }

  const addTopic = async (chapterId) => {
    if (!newTopicTitle.trim()) return
    const chapterTopics = topics[chapterId] || []
    await supabase.from('curriculum_topics').insert({
      user_id: user.id,
      chapter_id: chapterId,
      title: newTopicTitle,
      position: chapterTopics.length,
    })
    setNewTopicTitle('')
    setAddingTopicFor(null)
    fetchAll()
  }

  const updateTopicStatus = async (topic, newStatus) => {
    await supabase.from('curriculum_topics').update({ status: newStatus }).eq('id', topic.id)
    if (newStatus === 'done' && topic.status !== 'done') await addXP(25)
    fetchAll()
  }

  const deleteTopic = async (id) => {
    await supabase.from('curriculum_topics').delete().eq('id', id)
    fetchAll()
  }

  const getChapterProgress = (chapterId) => {
    const t = topics[chapterId] || []
    if (!t.length) return 0
    return Math.round((t.filter(x => x.status === 'done').length / t.length) * 100)
  }

  const tabColor = NODE_TABS.find(t => t.id === activeTab)?.color || '#3b82f6'

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-blue-900/20 bg-void/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5" style={{ color: tabColor }} />
          <h2 className="font-display text-2xl text-starlight tracking-wider">Personal Curriculum</h2>
        </div>
        <button onClick={() => setAddingChapter(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-900/20 text-dim hover:text-starlight hover:bg-stardust/30 transition-all text-sm font-body">
          <Plus className="w-4 h-4" /> Add Chapter
        </button>
      </div>

      {/* Node tabs */}
      <div className="flex border-b border-blue-900/20 shrink-0">
        {NODE_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-display tracking-wider transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'text-starlight' 
                : 'text-dim hover:text-starlight border-transparent'
            }`}
            style={activeTab === tab.id ? { borderBottomColor: tab.color, color: tab.color } : {}}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {/* Add chapter form */}
        {addingChapter && (
          <div className="glass border border-dashed border-blue-900/30 rounded-xl p-4 space-y-3">
            <input type="text" placeholder="Chapter title..." value={newChapterTitle}
              onChange={e => setNewChapterTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addChapter()}
              className="w-full bg-transparent border-b border-blue-900/30 text-sm text-starlight outline-none focus:border-pulsar font-body pb-1"
              autoFocus />
            <input type="text" placeholder="Description (optional)" value={newChapterDesc}
              onChange={e => setNewChapterDesc(e.target.value)}
              className="w-full bg-transparent border-b border-blue-900/20 text-xs text-dim outline-none focus:border-pulsar/50 font-body pb-1" />
            <div className="flex gap-2">
              <button onClick={addChapter} className="px-4 py-1.5 bg-pulsar/20 text-pulsar border border-pulsar/30 rounded text-xs font-display hover:bg-pulsar/30 transition-colors">
                ADD
              </button>
              <button onClick={() => setAddingChapter(false)} className="px-4 py-1.5 text-dim text-xs font-display hover:text-starlight transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        )}

        {chapters.length === 0 && !addingChapter && (
          <div className="text-center py-16 text-dim/50 font-body">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No chapters yet for {activeTab}.</p>
            <p className="text-xs mt-1">Click "Add Chapter" to start your curriculum.</p>
          </div>
        )}

        {chapters.map(chapter => {
          const chapterTopics = topics[chapter.id] || []
          const progress = getChapterProgress(chapter.id)
          const isExpanded = expanded[chapter.id] !== false // default expanded

          return (
            <div key={chapter.id} className="glass border border-blue-900/20 rounded-xl overflow-hidden transition-all">
              {/* Chapter header */}
              <div 
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(e => ({ ...e, [chapter.id]: !isExpanded }))}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display"
                    style={{ background: `${tabColor}20`, color: tabColor, border: `1px solid ${tabColor}40` }}>
                    {progress}%
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm text-starlight tracking-wider truncate">{chapter.title}</h3>
                    {chapter.description && (
                      <p className="text-[10px] text-dim font-body truncate">{chapter.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="w-20 h-1.5 bg-stardust rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: tabColor }} />
                  </div>
                  <span className="text-xs font-mono text-dim">{chapterTopics.filter(t => t.status === 'done').length}/{chapterTopics.length}</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-dim" /> : <ChevronDown className="w-4 h-4 text-dim" />}
                </div>
              </div>

              {/* Topics */}
              {isExpanded && (
                <div className="px-5 pb-4 border-t border-blue-900/10 pt-3 space-y-2">
                  {chapterTopics.map(topic => {
                    const cfg = STATUS_CONFIG[topic.status]
                    const StatusIcon = cfg.icon
                    return (
                      <div key={topic.id} className="flex items-center gap-3 group">
                        <button onClick={() => {
                          const nextStatus = topic.status === 'not_started' ? 'in_progress' : topic.status === 'in_progress' ? 'done' : 'not_started'
                          updateTopicStatus(topic, nextStatus)
                        }}
                          className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all border ${
                            topic.status === 'done' ? 'border-emerald bg-emerald text-void' : 
                            topic.status === 'in_progress' ? 'border-pulsar bg-pulsar/20 text-pulsar' :
                            'border-blue-900/40 text-transparent hover:border-blue-900/60'
                          }`}>
                          <StatusIcon className="w-3 h-3" strokeWidth={3} />
                        </button>
                        <span className={`flex-1 text-sm font-body transition-colors ${
                          topic.status === 'done' ? 'text-dim line-through opacity-50' : 'text-starlight'
                        }`}>
                          {topic.title}
                        </span>
                        <span className={`text-[10px] font-mono ${cfg.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          {cfg.label}
                        </span>
                        <button onClick={() => deleteTopic(topic.id)}
                          className="opacity-0 group-hover:opacity-100 text-dim hover:text-danger transition-all p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Add topic */}
                  {addingTopicFor === chapter.id ? (
                    <div className="flex gap-2 mt-2">
                      <input type="text" placeholder="New topic..." value={newTopicTitle}
                        onChange={e => setNewTopicTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addTopic(chapter.id)}
                        className="flex-1 bg-transparent border-b border-blue-900/30 text-xs text-starlight outline-none focus:border-pulsar font-body"
                        autoFocus />
                      <button onClick={() => addTopic(chapter.id)} className="text-pulsar text-xs font-display">ADD</button>
                      <button onClick={() => setAddingTopicFor(null)} className="text-dim text-xs">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTopicFor(chapter.id); setNewTopicTitle('') }}
                      className="flex items-center gap-2 text-dim hover:text-starlight text-xs font-body transition-colors mt-1">
                      <Plus className="w-3 h-3" /> Add topic
                    </button>
                  )}

                  {/* Delete chapter */}
                  <div className="pt-2 border-t border-blue-900/10 mt-3">
                    <button onClick={() => deleteChapter(chapter.id)}
                      className="text-[10px] text-dim hover:text-danger font-mono transition-colors">
                      Delete chapter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Curriculum
