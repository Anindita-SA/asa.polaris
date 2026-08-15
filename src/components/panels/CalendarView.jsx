import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useGoogleCalendarSync } from '../../hooks/useGoogleCalendarSync'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCcw, Download, ExternalLink, BookOpen, CheckCircle, ShieldCheck, Sparkles, Database, Archive, Check, X, BellRing, Layers } from 'lucide-react'

const GOOGLE_COLORS = {
  '1': '#a4bdfc', // Lavender
  '2': '#7ae7bf', // Sage
  '3': '#dbadff', // Grape
  '4': '#ff887c', // Flamingo
  '5': '#fbd75b', // Banana
  '6': '#ffb878', // Tangerine
  '7': '#46d6db', // Peacock
  '8': '#e1e1e1', // Graphite
  '9': '#5484ed', // Blueberry
  '10': '#51b749', // Basil
  '11': '#dc2127', // Tomato
}

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

const CalendarView = () => {
  const { providerToken, signInWithGoogle } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('sprint') // 'sprint' | 'gcal' | 'backups'

  // Hybrid Sync & Backup Hook
  const {
    syncedEvents,
    proposedEvents,
    backups,
    isSyncing,
    autoSyncEnabled,
    lastSyncedAt,
    setAutoSync,
    syncNow,
    createBackup,
    approveProposedEvent,
    rejectProposedEvent
  } = useGoogleCalendarSync()

  const fetchEvents = async (date) => {
    if (!providerToken) return
    
    setLoading(true)
    setError(null)
    
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    
    try {
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime`, {
        headers: {
          Authorization: `Bearer ${providerToken}`
        }
      })
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Google Calendar access expired or denied. Please reconnect.')
        }
        throw new Error('Failed to fetch events.')
      }
      
      const data = await res.json()
      setEvents(data.items || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents(currentWeek)
  }, [currentWeek, providerToken])

  const start = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 border-b border-blue-900/20 bg-void/50 backdrop-blur-sm z-10 shrink-0 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-sky" />
            <h2 className="font-display text-2xl text-starlight tracking-wider">
              {activeTab === 'sprint' ? 'IELTS 2026 Sprint & Sub-Calendar' : format(start, 'MMMM yyyy')}
            </h2>
          </div>
          <p className="text-xs text-dim mt-0.5">
            {activeTab === 'sprint' ? 'Weekday-only 4-week front-loaded schedule with current 2026 resources' : 'Google Calendar live grid view'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab switches */}
          <div className="flex glass border border-blue-900/30 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('sprint')} 
              className={`px-3 py-1.5 rounded-md text-xs font-display transition-all ${activeTab === 'sprint' ? 'bg-sky/20 text-sky border border-sky/30' : 'text-dim hover:text-starlight'}`}>
              IELTS 2026 Sprint
            </button>
            <button 
              onClick={() => setActiveTab('gcal')} 
              className={`px-3 py-1.5 rounded-md text-xs font-display transition-all ${activeTab === 'gcal' ? 'bg-sky/20 text-sky border border-sky/30' : 'text-dim hover:text-starlight'}`}>
              Google Calendar
            </button>
            <button 
              onClick={() => setActiveTab('backups')} 
              className={`px-3 py-1.5 rounded-md text-xs font-display transition-all flex items-center gap-1.5 ${activeTab === 'backups' ? 'bg-sky/20 text-sky border border-sky/30' : 'text-dim hover:text-starlight'}`}>
              <Database className="w-3 h-3" /> Backups ({backups.length})
            </button>
          </div>

          {/* Sync & Backup Toolbar */}
          <button
            onClick={syncNow}
            disabled={isSyncing}
            className="glass border border-sky/30 text-sky hover:bg-sky/20 px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Sync Google Calendar to Supabase Database">
            <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync GCal → DB'}
          </button>

          <button
            onClick={() => createBackup()}
            className="glass border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all"
            title="Create Full Schedule Snapshot Backup (.ICS & Database)">
            <Archive className="w-3.5 h-3.5" /> Snapshot Backup
          </button>

          <a 
            href="/ielts_2026_study_schedule.ics" 
            download="ielts_2026_study_schedule.ics"
            className="glass border border-blue-900/30 text-dim hover:text-starlight px-3 py-1.5 rounded-lg text-xs font-display flex items-center gap-1.5 transition-all">
            <Download className="w-3.5 h-3.5" /> .ICS File
          </a>

          {activeTab === 'gcal' && (
            <div className="flex items-center gap-2">
              <button onClick={() => fetchEvents(currentWeek)} disabled={loading}
                className="p-2 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="h-4 w-px bg-blue-900/30 mx-1" />
              <button onClick={() => setCurrentWeek(d => subWeeks(d, 1))}
                className="p-1.5 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentWeek(new Date())}
                className="px-2.5 py-1 rounded-lg hover:bg-stardust/30 text-xs font-display tracking-widest text-dim hover:text-starlight transition-colors uppercase border border-blue-900/20">
                Today
              </button>
              <button onClick={() => setCurrentWeek(d => addWeeks(d, 1))}
                className="p-1.5 rounded-lg hover:bg-stardust/30 text-dim hover:text-starlight transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Proposed Schedule Staging Review Bar (Main Control in User's Hand) */}
      {proposedEvents.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <BellRing className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <b className="font-display">Staged Proposed Schedule:</b> You have {proposedEvents.length} proposed session(s) awaiting your review and approval.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {proposedEvents.map(pe => (
              <div key={pe.id} className="glass border border-amber-500/30 rounded px-2 py-1 text-[11px] flex items-center gap-2 text-starlight">
                <span>{pe.summary}</span>
                <button 
                  onClick={() => approveProposedEvent(pe.id)} 
                  className="text-emerald-400 hover:text-emerald-300 p-0.5" 
                  title="Approve & Commit">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => rejectProposedEvent(pe.id)} 
                  className="text-red-400 hover:text-red-300 p-0.5" 
                  title="Reject">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'backups' ? (
        /* Backups & Controls View */
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <div className="glass border border-blue-900/30 p-5 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display text-starlight text-base">Main Control & Backup Vault</h3>
              </div>
              <button
                onClick={() => createBackup()}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 rounded-xl text-xs font-display flex items-center gap-2 transition-all">
                <Archive className="w-4 h-4" /> Create Snapshot Now
              </button>
            </div>
            <p className="text-xs text-dim leading-relaxed">
              All your schedules are versioned and backed up. When you click <b>"Create Snapshot Now"</b>, Polaris generates an un-deletable version entry in Supabase and triggers a clean <code className="text-sky bg-void/50 px-1 py-0.5 rounded">.ICS</code> file download for your local archives.
            </p>

            <div className="pt-2 flex items-center gap-4 text-xs text-starlight">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded border-blue-900/40 bg-void/50 text-sky focus:ring-sky"
                />
                <span>Auto-sync Google Calendar to Supabase when active</span>
              </label>
              {lastSyncedAt && <span className="text-dim text-[11px]">Last synced: {lastSyncedAt}</span>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-dim">Saved Schedule Snapshots ({backups.length})</h4>
            {backups.length === 0 ? (
              <div className="text-center py-8 glass border border-blue-900/20 rounded-xl text-dim text-xs">
                No saved snapshots yet. Click "Create Snapshot Now" above to generate your first backup.
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map(b => (
                  <div key={b.id} className="glass border border-blue-900/20 p-4 rounded-xl flex items-center justify-between hover:border-sky/30 transition-all">
                    <div>
                      <h5 className="text-sm font-display text-starlight">{b.snapshot_name}</h5>
                      <p className="text-xs text-dim mt-0.5">
                        {b.event_count} events · Created {new Date(b.created_at).toLocaleDateString()} at {new Date(b.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
                      Backed Up
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'sprint' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Sub-Calendar Info Alert */}
          <div className="glass border border-sky/30 bg-sky/5 p-4 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-sky shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-starlight space-y-1">
              <p className="font-display text-sky text-sm">Sub-Calendar Protection & Main Control Architecture</p>
              <p className="text-dim leading-relaxed">
                Your primary calendar is protected. You have full manual control to preview, edit, or commit any proposed schedule. To keep your main calendar clean, click <span className="text-emerald-400 font-semibold">".ICS File"</span> or <span className="text-emerald-400 font-semibold">"Snapshot Backup"</span> above to download <code className="text-sky bg-void/50 px-1 py-0.5 rounded">ielts_2026_study_schedule.ics</code>, then import it into a dedicated sub-calendar in Google Calendar.
              </p>
            </div>
          </div>

          {/* 1. Verified 2026 Free Resources Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-widest text-dim flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Current Verified 2026 Resources (No Random YouTube Mocks)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {IELTS_RESOURCES.map((res, i) => (
                <div key={i} className="glass border border-blue-900/30 p-4 rounded-xl flex flex-col justify-between hover:border-sky/40 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky/10 border border-sky/30 text-sky uppercase">
                        {res.badge}
                      </span>
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    </div>
                    <h4 className="text-sm font-display text-starlight leading-snug">{res.name}</h4>
                    <p className="text-xs text-dim leading-relaxed">{res.desc}</p>
                    {res.note && <p className="text-[11px] text-amber-400/80 italic">{res.note}</p>}
                  </div>
                  {res.url ? (
                    <a 
                      href={res.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs text-sky hover:text-starlight bg-sky/10 border border-sky/20 py-1.5 rounded-lg transition-colors">
                      Open Resource <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="mt-3 text-center text-xs text-dim bg-void/30 border border-blue-900/10 py-1.5 rounded-lg">
                      Local Cambridge PDFs
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. 4-Week Weekday Schedule */}
          <div className="space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-widest text-dim flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky" /> Weekday-Only 4-Week Study Schedule (Front-Loaded)
            </h3>

            {[1, 2, 3, 4].map(weekNum => {
              const weekSessions = IELTS_SCHEDULE.filter(s => s.week === weekNum)
              const weekLabel = 
                weekNum === 1 ? 'Week 1 — Diagnostic & Targeted Drilling (45 min/day)' :
                weekNum === 2 ? 'Week 2 — Light Drilling (30 min/day, Vignesh research ramps up)' :
                weekNum === 3 ? 'Week 3 — Maintenance Only (25 min/day, 1 Essay + 1 Speaking/week)' :
                'Week 4 — Pre-Booking & Computer Interface Mock (20-25 min/day)'

              return (
                <div key={weekNum} className="glass border border-blue-900/25 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-900/20 pb-3">
                    <h4 className="font-display text-starlight text-base flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky" /> {weekLabel}
                    </h4>
                    <span className="text-xs font-mono text-sky bg-sky/10 border border-sky/20 px-2.5 py-1 rounded-full">
                      5 Weekdays
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {weekSessions.map((s, idx) => (
                      <div key={idx} className="bg-void/40 border border-blue-900/20 rounded-lg p-3 flex flex-col justify-between space-y-2 hover:border-sky/30 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-sky">{s.day} ({s.date.slice(5)})</span>
                            <span className="text-[10px] font-mono text-dim bg-stardust/40 px-1.5 py-0.5 rounded">{s.duration}</span>
                          </div>
                          <p className="text-xs font-display text-starlight leading-snug line-clamp-2">{s.title}</p>
                          <p className="text-[11px] text-dim leading-snug">{s.focus}</p>
                        </div>

                        <div className="pt-2 flex flex-col gap-1 text-[11px]">
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
                            + Add to GCal <CalendarIcon className="w-2.5 h-2.5" />
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
      ) : (
        /* Google Calendar Tab */
        <div className="flex-1 overflow-y-auto p-8 pb-16 scrollbar-hide">
          {!providerToken || error?.includes('reconnect') ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <CalendarIcon className="w-16 h-16 text-dim mb-4" />
              <h2 className="font-display text-2xl text-starlight tracking-wider mb-2">Connect Google Calendar</h2>
              <p className="font-body text-dim mb-6 max-w-sm">
                To view your schedule and reminders inside Polaris, we need read access to your Google Calendar.
              </p>
              <button 
                onClick={signInWithGoogle}
                className="px-6 py-3 glass border border-blue-900/30 rounded-xl text-starlight font-body hover:bg-stardust/40 transition-colors flex items-center gap-2">
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="flex gap-6 min-w-[900px] min-h-[550px]">
              {days.map(day => {
                const isToday = isSameDay(day, new Date())
                const dayEvents = events.filter(e => {
                  const eStart = e.start?.dateTime || e.start?.date
                  return eStart && isSameDay(new Date(eStart), day)
                })

                return (
                  <div key={day.toISOString()} className="flex-1 flex flex-col min-w-[150px]">
                    <div className={`pb-4 border-b-2 mb-4 sticky top-0 bg-void/90 pt-2 z-10 ${isToday ? 'border-starlight' : 'border-blue-900/20'}`}>
                      <p className={`text-xs font-display tracking-widest uppercase mb-1 ${isToday ? 'text-starlight font-bold' : 'text-slate-400/60'}`}>
                        {format(day, 'EEE')}
                      </p>
                      <p className={`text-3xl font-display ${isToday ? 'text-starlight' : 'text-slate-300/80'}`}>
                        {format(day, 'd')}
                      </p>
                    </div>

                    <div className="flex-1 space-y-3">
                      {loading ? (
                        <div className="animate-pulse space-y-3">
                          <div className="h-16 bg-stardust/20 rounded-xl" />
                          <div className="h-16 bg-stardust/20 rounded-xl" />
                        </div>
                      ) : dayEvents.length === 0 ? (
                        <div className="text-center pt-8 text-dim/30 font-body text-sm">
                          No events
                        </div>
                      ) : (
                        dayEvents.map(event => {
                          const isAllDay = !event.start.dateTime
                          const startTime = isAllDay ? 'All day' : format(new Date(event.start.dateTime), 'h:mm a')
                          const color = GOOGLE_COLORS[event.colorId] || '#3b82f6'

                          return (
                            <div key={event.id} 
                              className="glass rounded-xl p-3 border border-blue-900/15 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                              style={{ 
                                borderLeftColor: color, 
                                borderLeftWidth: 4,
                                backgroundColor: `${color}0d`
                              }}>
                              <p className="text-xs font-mono mb-1 text-slate-400/70">{startTime}</p>
                              <p className="text-sm font-body text-starlight leading-tight line-clamp-2">
                                {event.summary || '(No title)'}
                              </p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CalendarView

