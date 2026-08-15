import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ArrowLeft, Plus, X, BookOpen, Link as LinkIcon, Trash2, ChevronDown, Download, ExternalLink, Calendar, CheckCircle, Sparkles, ShieldCheck } from 'lucide-react'
import TopicCard from './TopicCard'

const IELTS_RESOURCES = [
  {
    name: 'ielts.org Official Free Practice Tests',
    badge: 'Official Exam Interface',
    desc: 'IELTS Progress Check free sample under "Free IELTS Practice Materials". Real computer-delivered exam format.',
    url: 'https://www.ielts.org/for-test-takers/sample-test-questions',
  },
  {
    name: 'British Council Road to IELTS',
    badge: 'Official Calibration',
    desc: 'Free samples for Reading/Listening/Writing with official body difficulty calibration.',
    url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts',
  },
  {
    name: 'Cambridge IELTS Books 17-19',
    badge: 'Retired Question Bank',
    desc: 'Actual retired-question banks examiners pull style from — single most accurate difficulty match.',
    url: null,
    note: 'PDFs widely available in study folder'
  },
  {
    name: 'IELTS Liz (ieltsliz.com)',
    badge: 'Structure & Question Banks',
    desc: 'Best for Writing Task 2 structure and Speaking Part 2/3 question banks (No random YouTube mocks).',
    url: 'https://ieltsliz.com',
  },
  {
    name: 'IDP IELTS Prepare App',
    badge: 'Computer-Delivered Mock',
    desc: 'Free tier full-length timed mocks in actual computer-delivered interface (on-screen typing & reading navigation).',
    url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app',
  },
]

const IELTS_SCHEDULE = [
  // Week 1
  { date: '2026-08-17', week: 1, day: 'Mon', duration: '45m', title: 'Diagnostic Mock (Cambridge 19)', focus: 'Full baseline diagnostic under exam conditions', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-08-18', week: 1, day: 'Tue', duration: '45m', title: 'Targeted Drilling — Weakest Section (Drill 1)', focus: 'Focus 45 mins on weakest diagnostic section', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-08-19', week: 1, day: 'Wed', duration: '45m', title: 'Targeted Drilling — Weakest Section (Drill 2)', focus: 'Deep writing structure or reading question types', url: 'https://ieltsliz.com' },
  { date: '2026-08-20', week: 1, day: 'Thu', duration: '45m', title: 'Targeted Drilling — Weakest Section (Drill 3)', focus: 'Timed section drill (passage or Task 2 essay outline)', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-08-21', week: 1, day: 'Fri', duration: '45m', title: 'Week 1 Review & Error Analysis', focus: 'Review error log before Vignesh research load ramps up', url: 'https://ieltsliz.com' },
  
  // Week 2
  { date: '2026-08-24', week: 2, day: 'Mon', duration: '30m', title: 'Reading & Writing Drilling', focus: 'Reading passage timing (20m) + Task 2 outline (10m)', url: 'https://ieltsliz.com' },
  { date: '2026-08-25', week: 2, day: 'Tue', duration: '30m', title: 'Listening & Speaking Drilling', focus: 'Listening section audio drill + Speaking Part 2 recording', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-08-26', week: 2, day: 'Wed', duration: '30m', title: 'Reading & Writing Drilling', focus: 'Writing Task 2 essay breakdown (opinion/discussion)', url: 'https://ieltsliz.com' },
  { date: '2026-08-27', week: 2, day: 'Thu', duration: '30m', title: 'Listening & Speaking Drilling', focus: 'Speaking Part 3 abstract questions & fluency practice', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
  { date: '2026-08-28', week: 2, day: 'Fri', duration: '30m', title: 'Reading & Writing Timing Check', focus: 'Timed Reading passage (Cambridge 18) + error review', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  
  // Week 3
  { date: '2026-08-31', week: 3, day: 'Mon', duration: '25m', title: 'Maintenance — Writing Task 2 Essay Draft', focus: '1 timed Task 2 essay draft / week (25m)', url: 'https://ieltsliz.com' },
  { date: '2026-09-01', week: 3, day: 'Tue', duration: '25m', title: 'Maintenance — Light Reading Review', focus: 'Review 1 reading passage (light maintenance)', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-09-02', week: 3, day: 'Wed', duration: '25m', title: 'Maintenance — Speaking Part 2 Recording', focus: '1 cue card recording + self-evaluation / week', url: 'https://ieltsliz.com' },
  { date: '2026-09-03', week: 3, day: 'Thu', duration: '25m', title: 'Maintenance — Light Listening Review', focus: 'Listen to 1 section with transcript check (25m)', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-09-04', week: 3, day: 'Fri', duration: '25m', title: 'Maintenance — Vocab & Error Log Polish', focus: 'Academic vocabulary & collocations check (25m)', url: 'https://ieltsliz.com' },
  
  // Week 4
  { date: '2026-09-07', week: 4, day: 'Mon', duration: '45m', title: 'Full Timed Mock (IDP App Computer Interface)', focus: 'Full timed mock on computer interface for typing & navigation', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
  { date: '2026-09-08', week: 4, day: 'Tue', duration: '25m', title: 'Pre-booking — Mock Error Analysis', focus: 'Analyze IDP mock mistake areas & navigation quirks', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
  { date: '2026-09-09', week: 4, day: 'Wed', duration: '25m', title: 'Pre-booking — Writing Structure Polish', focus: 'Light review of essay structures & transitions', url: 'https://ieltsliz.com' },
  { date: '2026-09-10', week: 4, day: 'Thu', duration: '25m', title: 'Pre-booking — Speaking Speed Drills', focus: 'Quick warm-up 1 cue card + 2 Part 3 questions aloud', url: 'https://ieltsliz.com' },
  { date: '2026-09-11', week: 4, day: 'Fri', duration: '20m', title: 'Final Test Strategy & Interface Checklist', focus: 'Final light check of computer interface shortcuts & booking', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
]

const makeGCalUrl = (item) => {
  const startIso = `${item.date.replace(/-/g, '')}T180000`
  const endMin = item.duration === '45m' ? '184500' : item.duration === '30m' ? '183000' : '182500'
  const endIso = `${item.date.replace(/-/g, '')}T${endMin}`
  const text = encodeURIComponent(`IELTS 2026: ${item.title}`)
  const details = encodeURIComponent(`IELTS 2026 4-Week Sprint (Polaris Schedule)\nFocus: ${item.focus}\nDuration: ${item.duration}\nResource: ${item.url || 'Cambridge IELTS Books 17-19'}\n\nNote: Skip random YouTube mocks, use verified 2026 official materials.`)
  return `https://calendar.google.com/calendar/r/eventedit?text=${text}&details=${details}&dates=${startIso}/${endIso}&ctz=Asia/Kolkata`
}

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

  const isIeltsCurriculum = curriculum.title?.toLowerCase().includes('ielts')

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
        .from('pomodoro_logs').select('label, duration_minutes').eq('user_id', user.id)
      if (pomo) {
        const map = {}
        pomo.forEach(p => {
          const match = titles.find(t => p.label?.toLowerCase().includes(t.toLowerCase().slice(0, 20)))
          if (match) map[match] = (map[match] || 0) + (p.duration_minutes || 0)
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
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl text-starlight tracking-wide leading-tight">{curriculum.title}</h1>
            {isIeltsCurriculum && (
              <a 
                href="/ielts_2026_study_schedule.ics" 
                download="ielts_2026_study_schedule.ics"
                className="glass border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all">
                <Download className="w-3.5 h-3.5" /> Download .ICS Sub-Calendar
              </a>
            )}
          </div>
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

      {/* If IELTS Curriculum, render IELTS 2026 Sprint Dashboard */}
      {isIeltsCurriculum && (
        <div className="space-y-6 pt-2">
          
          {/* Sub-Calendar Protection Note */}
          <div className="glass border border-sky/30 bg-sky/5 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-starlight space-y-1">
              <p className="font-display text-sky text-sm">IELTS 2026 Preparation Sprint — Sub-Calendar & GCal Links</p>
              <p className="text-dim leading-relaxed">
                Import <code className="text-sky bg-void/50 px-1 py-0.5 rounded">ielts_2026_study_schedule.ics</code> into your dedicated <b>IELTS sub-calendar</b> in Google Calendar to keep your main calendar clean. You can also click the 1-click <b>+ Add to GCal</b> links on individual sessions below.
              </p>
            </div>
          </div>

          {/* 1. Verified 2026 Free Resources */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-widest text-dim flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Current Verified 2026 Resources (No Random YouTube Mocks)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IELTS_RESOURCES.map((res, i) => (
                <div key={i} className="glass border border-blue-900/30 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky/10 border border-sky/30 text-sky uppercase">
                        {res.badge}
                      </span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <h4 className="text-xs font-display text-starlight leading-snug">{res.name}</h4>
                    <p className="text-[11px] text-dim leading-relaxed">{res.desc}</p>
                  </div>
                  {res.url ? (
                    <a 
                      href={res.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-2 inline-flex items-center justify-center gap-1.5 text-[11px] text-sky hover:text-starlight bg-sky/10 border border-sky/20 py-1.5 rounded-lg transition-colors">
                      Open Resource <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="mt-2 text-center text-[11px] text-dim bg-void/30 border border-blue-900/10 py-1 rounded-lg">
                      Local Cambridge PDFs
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. 4-Week Weekday Schedule */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-widest text-dim flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky" /> Weekday-Only 4-Week Front-Loaded Schedule
            </h3>

            {[1, 2, 3, 4].map(weekNum => {
              const weekSessions = IELTS_SCHEDULE.filter(s => s.week === weekNum)
              const weekLabel = 
                weekNum === 1 ? 'Week 1 — Diagnostic & Targeted Drilling (45 min/day)' :
                weekNum === 2 ? 'Week 2 — Light Drilling (30 min/day, Vignesh research ramps up)' :
                weekNum === 3 ? 'Week 3 — Maintenance Only (25 min/day, 1 Essay + 1 Speaking/week)' :
                'Week 4 — Pre-Booking & Computer Interface Mock (20-25 min/day)'

              return (
                <div key={weekNum} className="glass border border-blue-900/25 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-900/20 pb-2">
                    <h4 className="font-display text-starlight text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky" /> {weekLabel}
                    </h4>
                    <span className="text-[10px] font-mono text-sky bg-sky/10 border border-sky/20 px-2 py-0.5 rounded-full">
                      5 Weekdays
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {weekSessions.map((s, idx) => (
                      <div key={idx} className="bg-void/40 border border-blue-900/20 rounded-lg p-2.5 flex flex-col justify-between space-y-1.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-sky">{s.day} ({s.date.slice(5)})</span>
                            <span className="text-[9px] font-mono text-dim bg-stardust/40 px-1 py-0.5 rounded">{s.duration}</span>
                          </div>
                          <p className="text-[11px] font-display text-starlight leading-snug line-clamp-2">{s.title}</p>
                          <p className="text-[10px] text-dim leading-snug">{s.focus}</p>
                        </div>

                        <div className="pt-1.5 flex flex-col gap-1 text-[10px]">
                          {s.url && (
                            <a 
                              href={s.url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-sky hover:underline flex items-center gap-1">
                              Link <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <a 
                            href={makeGCalUrl(s)} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-amber-400 hover:underline flex items-center gap-1">
                            + Add to GCal <Calendar className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
