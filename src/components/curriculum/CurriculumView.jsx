import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ArrowLeft, Plus, X, BookOpen, Link as LinkIcon, Trash2, ChevronDown } from 'lucide-react'
import TopicCard from './TopicCard'

const CurriculumView = ({ curriculum, accentColor, onBack }) => {
  const { user } = useAuth()
  const [topics, setTopics] = useState([])
  const [resources, setResources] = useState([])
  const [addingTopic, setAddingTopic] = useState(false)
  const [addingResource, setAddingResource] = useState(false)
  const [newTopic, setNewTopic] = useState({ title: '', estimated_hours: '' })
  const [newResource, setNewResource] = useState({ title: '', author: '', resource_type: 'book', url: '' })
  const [pomodoroMap, setPomodoroMap] = useState({})
  const [resourcesOpen, setResourcesOpen] = useState(false)

  useEffect(() => { fetchData() }, [curriculum.id])

  const fetchData = async () => {
    const [topicRes, resourceRes] = await Promise.all([
      supabase.from('curriculum_topics').select('*').eq('curriculum_id', curriculum.id).order('position'),
      supabase.from('curriculum_resources').select('*').eq('curriculum_id', curriculum.id).order('created_at'),
    ])
    setTopics(topicRes.data || [])
    setResources(resourceRes.data || [])

    const titles = (topicRes.data || []).map(t => t.title)
    if (titles.length && user?.id) {
      const { data: pomo } = await supabase
        .from('pomodoro_logs').select('label, duration').eq('user_id', user.id)
      if (pomo) {
        const map = {}
        pomo.forEach(p => {
          const match = titles.find(t => p.label?.toLowerCase().includes(t.toLowerCase().slice(0, 20)))
          if (match) map[match] = (map[match] || 0) + (p.duration || 0)
        })
        setPomodoroMap(map)
      }
    }
  }

  const doneCount = topics.filter(t => t.status === 'done').length
  const totalCount = topics.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const totalHours = topics.reduce((s, t) => s + (t.estimated_hours || 0), 0)

  const R = 40, C = 2 * Math.PI * R
  const offset = C - (pct / 100) * C

  const addTopicHandler = async () => {
    if (!newTopic.title.trim()) return
    await supabase.from('curriculum_topics').insert({
      user_id: user.id, curriculum_id: curriculum.id,
      title: newTopic.title, estimated_hours: parseFloat(newTopic.estimated_hours) || null,
      position: topics.length,
    })
    setNewTopic({ title: '', estimated_hours: '' })
    setAddingTopic(false)
    fetchData()
  }

  const addResourceHandler = async () => {
    if (!newResource.title.trim()) return
    await supabase.from('curriculum_resources').insert({
      user_id: user.id, curriculum_id: curriculum.id, ...newResource,
    })
    setNewResource({ title: '', author: '', resource_type: 'book', url: '' })
    setAddingResource(false)
    fetchData()
  }

  const deleteTopic = async (id) => {
    await supabase.from('curriculum_topics').delete().eq('id', id)
    fetchData()
  }

  const deleteResource = async (id) => {
    await supabase.from('curriculum_resources').delete().eq('id', id)
    fetchData()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-dim hover:text-starlight transition-colors text-sm font-body"
      >
        <ArrowLeft className="w-4 h-4" /> Back to shelf
      </button>

      {/* Header with donut */}
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 relative">
          <svg width="100" height="100" className="-rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r={R} fill="none" stroke={accentColor}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              className="donut-ring"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-lg font-mono text-starlight font-medium">{pct}%</span>
            <span className="text-[9px] font-mono text-dim">{doneCount}/{totalCount}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-2">
          <h1 className="font-display text-2xl text-starlight tracking-wide leading-tight">{curriculum.title}</h1>
          {curriculum.description && (
            <p className="font-body text-sm text-dim mt-1">{curriculum.description}</p>
          )}
          <div className="flex gap-4 mt-2">
            {curriculum.estimated_hours && (
              <span className="text-xs font-mono text-dim">
                {curriculum.estimated_hours}h total • {totalHours}h mapped
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Syllabus */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base text-starlight tracking-wider">Syllabus</h2>
          <button onClick={() => setAddingTopic(true)}
            className="text-dim hover:text-starlight text-xs font-body flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Add topic
          </button>
        </div>

        {addingTopic && (
          <div className="glass border border-dashed border-blue-900/30 rounded-xl p-3 space-y-2">
            <input type="text" placeholder="Topic title..." value={newTopic.title}
              onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTopicHandler()}
              className="w-full bg-transparent border-b border-blue-900/30 text-sm text-starlight outline-none focus:border-pulsar font-body pb-1" autoFocus />
            <div className="flex gap-2 items-center">
              <input type="number" placeholder="Hours" value={newTopic.estimated_hours}
                onChange={e => setNewTopic(p => ({ ...p, estimated_hours: e.target.value }))}
                className="w-20 bg-transparent border-b border-blue-900/30 text-xs text-dim outline-none font-mono pb-1" />
              <button onClick={addTopicHandler} className="px-3 py-1 text-xs font-display rounded" style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>ADD</button>
              <button onClick={() => setAddingTopic(false)} className="text-dim text-xs">Cancel</button>
            </div>
          </div>
        )}

        {topics.map(topic => (
          <div key={topic.id} className="relative group/topic">
            <TopicCard
              topic={topic} accentColor={accentColor}
              pomodoroMins={pomodoroMap[topic.title] || 0}
              onUpdate={fetchData}
            />
            <button onClick={() => deleteTopic(topic.id)}
              className="absolute top-3 right-3 text-dim hover:text-danger opacity-0 group-hover/topic:opacity-100 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {topics.length === 0 && !addingTopic && (
          <div className="text-center py-8 text-dim/50 font-body text-sm italic">
            No topics yet. Click "Add topic" to build your syllabus.
          </div>
        )}
      </div>

      {/* Resources — collapsible dropdown */}
      <div className="glass border border-blue-900/15 rounded-xl overflow-hidden">
        <button
          onClick={() => setResourcesOpen(!resourcesOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
            <span className="font-display text-sm text-starlight tracking-wider">Resources</span>
            <span className="text-[10px] font-mono text-dim ml-1">({resources.length})</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-dim transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
        </button>

        {resourcesOpen && (
          <div className="px-4 pb-4 space-y-2 border-t border-blue-900/10 pt-3">
            <div className="flex justify-end">
              <button onClick={() => setAddingResource(true)}
                className="text-dim hover:text-starlight text-xs font-body flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {addingResource && (
              <div className="glass border border-dashed border-blue-900/30 rounded-lg p-3 space-y-2">
                <input type="text" placeholder="Title..." value={newResource.title}
                  onChange={e => setNewResource(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-transparent border-b border-blue-900/30 text-xs text-starlight outline-none font-body pb-1" autoFocus />
                <input type="text" placeholder="Author..." value={newResource.author}
                  onChange={e => setNewResource(p => ({ ...p, author: e.target.value }))}
                  className="w-full bg-transparent border-b border-blue-900/20 text-xs text-dim outline-none font-body pb-1" />
                <div className="flex gap-2 items-center">
                  <select value={newResource.resource_type}
                    onChange={e => setNewResource(p => ({ ...p, resource_type: e.target.value }))}
                    className="bg-stardust/40 text-xs text-starlight border border-blue-900/10 rounded px-2 py-1 outline-none font-body">
                    <option value="book">Book</option>
                    <option value="article">Article</option>
                    <option value="video">Video</option>
                    <option value="course">Course</option>
                    <option value="podcast">Podcast</option>
                  </select>
                  <button onClick={addResourceHandler} className="px-3 py-1 text-xs font-display rounded" style={{ background: `${accentColor}20`, color: accentColor }}>ADD</button>
                  <button onClick={() => setAddingResource(false)} className="text-dim text-xs">✕</button>
                </div>
              </div>
            )}

            {resources.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.02] transition-all group/res">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${accentColor}15`, color: `${accentColor}90` }}>
                    {r.resource_type}
                  </span>
                  <div className="min-w-0">
                    <span className="font-body text-xs text-starlight truncate block">{r.title}</span>
                    {r.author && <span className="text-[10px] font-body text-dim">{r.author}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-mono flex items-center gap-1 hover:underline" style={{ color: accentColor }}>
                      <LinkIcon className="w-3 h-3" />
                    </a>
                  )}
                  <button onClick={() => deleteResource(r.id)}
                    className="text-dim hover:text-danger opacity-0 group-hover/res:opacity-100 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {resources.length === 0 && !addingResource && (
              <p className="text-xs text-dim/50 font-body italic text-center py-2">No resources yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CurriculumView
