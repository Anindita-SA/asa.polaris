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
    desc: 'Actual retired-question banks examiners pull style from - single most accurate difficulty match.',
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
  // Week 1: Diagnose & Habit Lock-in (Aug 31 - Sep 4)
  { date: '2026-08-31', week: 1, day: 'Mon', duration: '60m', title: 'Diagnostic Timed Writing Test (Task 1 + Task 2)', focus: 'Full baseline writing test under exam conditions on computer with no help.', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-09-01', week: 1, day: 'Tue', duration: '20m', title: 'Grammar Drill (Articles & Prepositions) + Blocker Setup', focus: '15-min daily grammar de-rusting for articles/prepositions + setup distraction blockers.', url: 'https://ieltsliz.com' },
  { date: '2026-09-02', week: 1, day: 'Wed', duration: '20m', title: 'Grammar Drill (Tense Consistency) + Spoken Fluency', focus: '15-min tense consistency drill + 10-min spoken fluency out loud.', url: 'https://ieltsliz.com' },
  { date: '2026-09-03', week: 1, day: 'Thu', duration: '30m', title: 'On-Screen Typing & Word Count Adaptation', focus: 'Timed typing practice without paper crossing out; monitor on-screen word count.', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
  { date: '2026-09-04', week: 1, day: 'Fri', duration: '40m', title: 'Week 1 Writing Audit against Band Descriptors', focus: 'Evaluate diagnostic essay against official band descriptors (TR, CC, LR, GRA).', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },

  // Week 2: Targeted Writing Reps & Computer Adaptation (Sep 7 - Sep 11)
  { date: '2026-09-07', week: 2, day: 'Mon', duration: '45m', title: 'Timed Writing Rep #1 (Task 2 Focus) + Spoken Fluency', focus: '40-min computer Task 2 essay on coherence/transitions + 10m spoken fluency.', url: 'https://ieltsliz.com' },
  { date: '2026-09-08', week: 2, day: 'Tue', duration: '30m', title: 'Grammar Drill + Timed Writing Rep #2 (Task 1 Focus)', focus: '15-min grammar drill + 20-min computer Task 1 chart report.', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-09-09', week: 2, day: 'Wed', duration: '45m', title: 'Timed Writing Rep #3 (Complex Sentence Structure Focus)', focus: 'Targeting 7 to 8+ jump via complex structures & paragraph cohesion.', url: 'https://ieltsliz.com' },
  { date: '2026-09-10', week: 2, day: 'Thu', duration: '25m', title: 'Spoken Fluency Drills (Accent Drift Guard)', focus: '10-15 min speaking out loud to keep fluency reflexes sharp against dialect drift.', url: 'https://ieltsliz.com' },
  { date: '2026-09-11', week: 2, day: 'Fri', duration: '45m', title: 'Timed Writing Rep #4 + Error Review Log', focus: 'Timed computer writing rep + update writing error log.', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2026-january' },

  // Week 3: Advanced Reps & Complex Structure (Sep 14 - Sep 18)
  { date: '2026-09-14', week: 3, day: 'Mon', duration: '45m', title: 'Timed Writing Rep #5 (Task 2 Coherence)', focus: 'Computer Task 2 essay focusing on paragraph logical progression.', url: 'https://ieltsliz.com' },
  { date: '2026-09-15', week: 3, day: 'Tue', duration: '30m', title: 'Grammar Drill + Spoken Fluency Maintenance', focus: '15-min grammar drill on collocations/prepositions + 10m speaking.', url: 'https://ieltsliz.com' },
  { date: '2026-09-16', week: 3, day: 'Wed', duration: '60m', title: 'Combined Writing Simulation (Task 1 + Task 2 60m)', focus: 'Full 60-min computer writing simulation under strict exam timer.', url: 'https://ielts.idp.com/prepare/article-idp-ielts-prepare-app' },
  { date: '2026-09-17', week: 3, day: 'Thu', duration: '30m', title: 'Spoken Fluency + Reading Passage Timing Drill', focus: '10m speaking out loud + 20m reading passage timing.', url: 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests/road-to-ielts' },
  { date: '2026-09-18', week: 3, day: 'Fri', duration: '45m', title: 'Timed Writing Rep #6 + Error Log Review', focus: 'Review past writing mistakes; rewrite weak paragraphs.', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-december' },

  // Week 4: Full Simulation & Polish (Sep 21 - Sep 25)
  { date: '2026-09-21', week: 4, day: 'Mon', duration: '150m', title: 'Full Computer Mock Test #1 (All Sections Timed)', focus: 'Full simulation test on computer interface under exam conditions.', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-november' },
  { date: '2026-09-22', week: 4, day: 'Tue', duration: '45m', title: 'Deep Review of Mock #1 Writing & Error Log', focus: 'Review Mock #1 writing specifically before producing new essays.', url: 'https://ieltsliz.com' },
  { date: '2026-09-23', week: 4, day: 'Wed', duration: '150m', title: 'Full Computer Mock Test #2 (All Sections Timed)', focus: 'Full simulation test #2 on computer interface under exam conditions.', url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-october' },
  { date: '2026-09-24', week: 4, day: 'Thu', duration: '45m', title: 'Deep Review of Mock #2 Writing & Error Log', focus: 'Review Mock #2 writing & identify final recurring error patterns.', url: 'https://ieltsliz.com' },
  { date: '2026-09-25', week: 4, day: 'Fri', duration: '30m', title: 'Computer Interface & On-Screen Shortcut Polish', focus: 'Final drill of split-screen reading, on-screen text highlighting & shortcuts.', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },

  // Final Polish Week (Sep 28 - Oct 2)
  { date: '2026-09-28', week: 5, day: 'Mon', duration: '30m', title: 'Writing Mistake Log & Grammar Cheat Sheet Review', focus: 'Review compiled error log and grammar rules. No heavy essay writing.', url: 'https://ieltsliz.com' },
  { date: '2026-09-29', week: 5, day: 'Tue', duration: '20m', title: 'Spoken Fluency Light Warm-up', focus: '10-15 min light spoken warm-up to keep fluency loose.', url: 'https://ieltsliz.com' },
  { date: '2026-09-30', week: 5, day: 'Wed', duration: '20m', title: 'Reading & Listening On-Screen Strategy Check', focus: 'Light review of exam strategy and key rules.', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-10-01', week: 5, day: 'Thu', duration: '15m', title: 'Mental Prep & Rest (No Heavy Mocks)', focus: 'Rest brain and review exam timing strategy.', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-10-02', week: 5, day: 'Fri', duration: '15m', title: 'Passport & Exam Logistics Checklist', focus: 'Confirm test center location, ID passport, and time.', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
  { date: '2026-10-03', week: 5, day: 'Sat', duration: '180m', title: 'OFFICIAL EXAM DAY: IELTS Computer-Based Test', focus: 'Official IELTS Exam Day! Target Band 8.0+', url: 'https://www.ielts.org/for-test-takers/sample-test-questions' },
]

const GRADED_MOCK_TESTS = [
  {
    id: 'mock_2026_january',
    title: 'IELTS Mock Test Collection - January 2026',
    badge: 'Auto-Graded Mock',
    desc: 'Auto-graded full-length Listening, Reading, Writing, Speaking tests with instant band score evaluation.',
    url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2026-january',
  },
  {
    id: 'mock_2025_december',
    title: 'IELTS Mock Test Collection - December 2025',
    badge: 'Auto-Graded Mock',
    desc: 'Auto-graded timed test collection with complete answer explanations, audio scripts, and score breakdowns.',
    url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-december',
  },
  {
    id: 'mock_2025_november',
    title: 'IELTS Mock Test Collection - November 2025',
    badge: 'Auto-Graded Mock',
    desc: 'Auto-graded full practice tests to drill test-taking speed, accuracy, and section timing.',
    url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-november',
  },
  {
    id: 'mock_2025_october',
    title: 'IELTS Mock Test Collection - October 2025',
    badge: 'Auto-Graded Mock',
    desc: 'Auto-graded mock exams for evaluating performance across all four test sections before test day.',
    url: 'https://ieltsonlinetests.com/collection/ielts-mock-test-2025-october',
  },
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
  const [completedMocks, setCompletedMocks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('polaris_ielts_completed_mocks') || '{}')
    } catch {
      return {}
    }
  })

  const toggleMockComplete = (mockId) => {
    setCompletedMocks(prev => {
      const next = { ...prev, [mockId]: !prev[mockId] }
      localStorage.setItem('polaris_ielts_completed_mocks', JSON.stringify(next))
      return next
    })
  }

  const downloadIeltsICS = () => {
    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Polaris Ecosystem//IELTS 2026 Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:IELTS 2026 Sprint (Oct 3 Exam)',
      'X-WR-TIMEZONE:Asia/Kolkata'
    ]

    IELTS_SCHEDULE.forEach((s, idx) => {
      const dtStart = `${s.date.replace(/-/g, '')}T180000`
      const durationMin = s.duration.includes('180') ? '210000' : s.duration.includes('150') ? '203000' : s.duration.includes('60') ? '190000' : s.duration.includes('45') ? '184500' : s.duration.includes('40') ? '184000' : s.duration.includes('30') ? '183000' : s.duration.includes('25') ? '182500' : '182000'
      const dtEnd = `${s.date.replace(/-/g, '')}T${durationMin}`
      const uid = `ielts-2026-sprint-session-${idx + 1}@polaris.app`

      icsLines.push('BEGIN:VEVENT')
      icsLines.push(`UID:${uid}`)
      icsLines.push(`DTSTAMP:20260829T130000Z`)
      icsLines.push(`DTSTART;TZID=Asia/Kolkata:${dtStart}`)
      icsLines.push(`DTEND;TZID=Asia/Kolkata:${dtEnd}`)
      icsLines.push(`SUMMARY:IELTS 2026: ${s.title}`)
      icsLines.push(`DESCRIPTION:${s.focus.replace(/\n/g, '\\n')}\\nResource: ${s.url || 'Cambridge Books'}`)
      if (s.url) icsLines.push(`URL:${s.url}`)
      icsLines.push('BEGIN:VALARM')
      icsLines.push('TRIGGER:-PT15M')
      icsLines.push('ACTION:DISPLAY')
      icsLines.push(`DESCRIPTION:Reminder: IELTS 2026: ${s.title} in 15 minutes`)
      icsLines.push('END:VALARM')
      icsLines.push('END:VEVENT')
    })

    icsLines.push('END:VCALENDAR')
    const rawIcs = icsLines.join('\r\n')
    const blob = new Blob([rawIcs], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ielts_2026_study_schedule.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
        className="flex items-center gap-2 text-nova/60 hover:text-starlight transition-colors text-sm font-body"
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
            <span className="text-[9px] font-mono text-nova/60">{doneCount}/{totalCount}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold text-starlight leading-tight">{curriculum.title}</h1>
            {isIeltsCurriculum && (
              <button 
                onClick={downloadIeltsICS}
                className="glass border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all"
                title="Download .ICS file to import into Google Calendar">
                <Download className="w-3.5 h-3.5" /> Download .ICS Sub-Calendar
              </button>
            )}
          </div>
          {curriculum.description && (
            <p className="font-body text-sm text-nova/60 mt-1">{curriculum.description}</p>
          )}
          <div className="flex gap-4 mt-2">
            {curriculum.estimated_hours && (
              <span className="text-xs font-mono text-nova/60">
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
              <p className="font-display text-sky text-sm">IELTS 2026 Preparation Sprint - Sub-Calendar & GCal Links</p>
              <p className="text-nova/60 leading-relaxed">
                Import <code className="text-sky bg-void/70 px-1 py-0.5 rounded">ielts_2026_study_schedule.ics</code> into your dedicated <b>IELTS sub-calendar</b> in Google Calendar to keep your main calendar clean. You can also click the 1-click <b>+ Add to GCal</b> links on individual sessions below.
              </p>
            </div>
          </div>

          {/* 1. Verified 2026 Free Resources */}
          <div className="space-y-3">
            <h3 className="text-lg font-mono text-nova/60 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Current Verified 2026 Resources (No Random YouTube Mocks)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IELTS_RESOURCES.map((res, i) => (
                <div key={i} className="glass border border-pulsar/40 p-3.5 rounded-xl flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky/10 border border-sky/30 text-sky ">
                        {res.badge}
                      </span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    </div>
                    <h4 className="text-lg font-mono uppercase tracking-wider text-starlight leading-snug">{res.name}</h4>
                    <p className="text-[11px] text-nova/60 leading-relaxed">{res.desc}</p>
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
                    <span className="mt-2 text-center text-[11px] text-nova/60 bg-void/60 border border-blue-900/10 py-1 rounded-lg">
                      Local Cambridge PDFs
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Graded Online Mock Test Collections (IELTS Online Tests) with Tick Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-mono text-starlight flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Graded Mock Test Collections (IELTS Online Tests)
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {Object.values(completedMocks).filter(Boolean).length} / {GRADED_MOCK_TESTS.length} Completed
              </span>
            </div>
            <p className="text-[11px] text-nova/60 leading-relaxed">
              Official sample tests are un-graded. These collections are <b>auto-graded</b> with instant band score feedback for Listening, Reading, Writing, and Speaking. Tick them off as you complete each mock set:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GRADED_MOCK_TESTS.map(mock => {
                const isDone = !!completedMocks[mock.id]

                return (
                  <div 
                    key={mock.id} 
                    className={`glass border p-3.5 rounded-xl flex flex-col justify-between space-y-3 transition-all ${
                      isDone 
                        ? 'border-emerald-500/40 bg-emerald-500/5' 
                        : 'border-pulsar/40 hover:border-sky/30'
                    }`}>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                          {mock.badge}
                        </span>

                        {/* Interactive Tick Checkbox */}
                        <button
                          onClick={() => toggleMockComplete(mock.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                            isDone 
                              ? 'bg-emerald-500 text-void font-bold shadow-sm' 
                              : 'bg-stardust/40 text-nova/60 border border-pulsar/40 hover:text-starlight hover:border-sky/40'
                          }`}>
                          <CheckCircle className={`w-3.5 h-3.5 ${isDone ? 'text-void fill-current' : 'text-nova/60'}`} />
                          <span>{isDone ? 'Completed ✓' : 'Mark Completed'}</span>
                        </button>
                      </div>

                      <h4 className={`text-xs font-mono uppercase tracking-wider transition-colors ${isDone ? 'text-emerald-300 line-through' : 'text-starlight'}`}>
                        {mock.title}
                      </h4>
                      <p className="text-[11px] text-nova/60 leading-relaxed">{mock.desc}</p>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-blue-900/15">
                      <a 
                        href={mock.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 text-[11px] text-sky hover:text-starlight bg-sky/10 border border-sky/20 px-3 py-1.5 rounded-lg transition-colors font-mono">
                        Take Graded Mock <ExternalLink className="w-3 h-3" />
                      </a>

                      {isDone && (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                          Graded & Saved
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. 4-Week Weekday Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-mono text-nova/60 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky" /> Weekday-Only 4-Week Front-Loaded Schedule
            </h3>

            {[1, 2, 3, 4].map(weekNum => {
              const weekSessions = IELTS_SCHEDULE.filter(s => s.week === weekNum)
              const weekLabel = 
                weekNum === 1 ? 'Week 1 - Diagnostic & Targeted Drilling (45 min/day)' :
                weekNum === 2 ? 'Week 2 - Light Drilling (30 min/day, Vignesh research ramps up)' :
                weekNum === 3 ? 'Week 3 - Maintenance Only (25 min/day, 1 Essay + 1 Speaking/week)' :
                'Week 4 - Pre-Booking & Computer Interface Mock (20-25 min/day)'

              return (
                <div key={weekNum} className="glass border border-blue-900/25 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-pulsar/30 pb-2">
                    <h4 className="font-display text-starlight text-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky" /> {weekLabel}
                    </h4>
                    <span className="text-xs font-mono text-sky bg-sky/10 border border-sky/20 px-2 py-0.5 rounded-full">
                      5 Weekdays
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {weekSessions.map((s, idx) => (
                      <div key={idx} className="bg-void/40 border border-pulsar/30 rounded-lg p-2.5 flex flex-col justify-between space-y-1.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-sky">{s.day} ({s.date.slice(5)})</span>
                            <span className="text-[9px] font-mono text-nova/60 bg-stardust/40 px-1 py-0.5 rounded">{s.duration}</span>
                          </div>
                          <p className="text-sm font-display font-bold text-starlight leading-snug line-clamp-2">{s.title}</p>
                          <p className="text-xs text-nova/60 leading-snug">{s.focus}</p>
                        </div>

                        <div className="pt-1.5 flex flex-col gap-1 text-xs">
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
          <h2 className="font-display text-xl font-bold text-starlight">Syllabus</h2>
          <button onClick={() => setAddingTopic(true)}
            className="text-nova/60 hover:text-starlight text-xs font-body flex items-center gap-1 transition-colors">
            <Plus className="w-3 h-3" /> Add topic
          </button>
        </div>

        {addingTopic && (
          <div className="glass border border-dashed border-pulsar/40 rounded-xl p-3 space-y-2">
            <input type="text" placeholder="Topic title..." value={newTopic.title}
              onChange={e => setNewTopic(p => ({ ...p, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addTopicHandler()}
              className="w-full bg-transparent border-b border-pulsar/40 text-sm text-starlight outline-none focus:border-pulsar font-body pb-1" autoFocus />
            <div className="flex gap-2 items-center">
              <input type="number" placeholder="Hours" value={newTopic.estimated_hours}
                onChange={e => setNewTopic(p => ({ ...p, estimated_hours: e.target.value }))}
                className="w-20 bg-transparent border-b border-pulsar/40 text-xs text-nova/60 outline-none font-mono pb-1" />
              <button onClick={addTopicHandler} className="px-3 py-1 text-xs font-mono uppercase tracking-wider rounded" style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}>Add</button>
              <button onClick={() => setAddingTopic(false)} className="text-nova/60 text-xs">Cancel</button>
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
              className="absolute top-3 right-3 text-nova/60 hover:text-danger opacity-0 group-hover/topic:opacity-100 transition-all">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {topics.length === 0 && !addingTopic && (
          <div className="text-center py-8 text-nova/60/50 font-body text-sm italic">
            No topics yet. Click "Add topic" to build your syllabus.
          </div>
        )}
      </div>

      {/* Resources - collapsible dropdown */}
      <div className="glass border border-blue-900/15 rounded-xl overflow-hidden">
        <button
          onClick={() => setResourcesOpen(!resourcesOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" style={{ color: accentColor }} />
            <span className="font-display text-sm text-starlight">Resources</span>
            <span className="text-xs font-mono text-nova/60 ml-1">({resources.length})</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-nova/60 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
        </button>

        {resourcesOpen && (
          <div className="px-4 pb-4 space-y-2 border-t border-blue-900/10 pt-3">
            <div className="flex justify-end">
              <button onClick={() => setAddingResource(true)}
                className="text-nova/60 hover:text-starlight text-xs font-body flex items-center gap-1 transition-colors">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {addingResource && (
              <div className="glass border border-dashed border-pulsar/40 rounded-lg p-3 space-y-2">
                <input type="text" placeholder="Title..." value={newResource.title}
                  onChange={e => setNewResource(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-transparent border-b border-pulsar/40 text-xs text-starlight outline-none font-body pb-1" autoFocus />
                <input type="text" placeholder="Author..." value={newResource.author}
                  onChange={e => setNewResource(p => ({ ...p, author: e.target.value }))}
                  className="w-full bg-transparent border-b border-pulsar/30 text-xs text-nova/60 outline-none font-body pb-1" />
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
                  <button onClick={addResourceHandler} className="px-3 py-1 text-xs font-mono uppercase tracking-wider rounded" style={{ background: `${accentColor}20`, color: accentColor }}>Add</button>
                  <button onClick={() => setAddingResource(false)} className="text-nova/60 text-xs">✕</button>
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
                    {r.author && <span className="text-xs font-body text-nova/60">{r.author}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-mono flex items-center gap-1 hover:underline" style={{ color: accentColor }}>
                      <LinkIcon className="w-3 h-3" />
                    </a>
                  )}
                  <button onClick={() => deleteResource(r.id)}
                    className="text-nova/60 hover:text-danger opacity-0 group-hover/res:opacity-100 transition-all">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}

            {resources.length === 0 && !addingResource && (
              <p className="text-xs text-nova/60/50 font-body italic text-center py-2">No resources yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CurriculumView
