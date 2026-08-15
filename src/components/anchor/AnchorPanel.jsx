import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { computeWSJFScore } from '../../hooks/useWSJFScore'
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  History, 
  Play, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Sun, 
  Sparkles, 
  Pause,
  Inbox,
  Search,
  Trash2,
  Send,
  Flame,
  Target,
  Archive
} from 'lucide-react'

const DEFAULT_EULOGY = `Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education -- not academic learning in general -- and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff.`

const TINY_CUES = [
  "Open the file and read the title out loud.",
  "Put your hands on the keyboard. Don't type yet.",
  "Write one sentence, even if it's draft quality.",
  "Open the required browser tab. That's the whole step.",
  "Set a 2-minute timer and just touch the task.",
  "Move your physical body into position at your desk."
];

const checkReassess = (task) => {
  if (!task.created_at) return false;
  const created = new Date(task.created_at);
  const now = new Date();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
};

const getDefaultCoords = (quadrant) => {
  switch (quadrant) {
    case 'urgent_important': return { x: 300, y: 200 };
    case 'important_not_urgent': return { x: 900, y: 200 };
    case 'urgent_not_important': return { x: 300, y: 600 };
    case 'neither': return { x: 900, y: 600 };
    default: return { x: 500, y: 380 };
  }
};

const AnchorPanel = ({ collapsed, onToggle, mobile = false, onOpenDayGuide }) => {
  const { user, profile, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('os') // 'os' | 'vomit'

  // Operating System State
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [editingEulogy, setEditingEulogy] = useState(false)
  const [editingMission, setEditingMission] = useState(false)
  const [editingChapter, setEditingChapter] = useState(false)
  const [eulogyText, setEulogyText] = useState('')
  const [versionLabel, setVersionLabel] = useState('')

  // Queue & Vomit Tasks State
  const [allTasks, setAllTasks] = useState([])
  const [activeTask, setActiveTask] = useState(null)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [tinyCue, setTinyCue] = useState('')

  // TASK VOMIT State
  const [newTitle, setNewTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [bucketFilter, setBucketFilter] = useState('all') // 'all' | 'reassess' | 'recent'
  const [dumpStatus, setDumpStatus] = useState(null)

  // Fetch Eulogies
  const fetchEulogies = async () => {
    if (!user) return
    const { data } = await supabase
      .from('eulogies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setHistory(data || [])
    setLatest(data?.[0] || null)
  }

  // Fetch All Tasks
  const fetchAllTasks = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    setAllTasks(data || [])
  }, [user])

  useEffect(() => {
    fetchEulogies()
    fetchAllTasks()
  }, [fetchAllTasks])

  // Realtime sync for tasks
  useEffect(() => {
    if (!user) return
    const channelName = `anchor-tasks-${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchAllTasks())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, fetchAllTasks])

  // Derived OS Queue (Active / Scheduled top tasks sorted by WSJF)
  const osQueue = useMemo(() => {
    const active = allTasks.filter(t => t.status === 'active' || t.status === 'scheduled' || (t.quadrant !== null && t.status !== 'done'))
    const scored = active.map(t => ({
      ...t,
      score: computeWSJFScore(t).score
    })).sort((a, b) => b.score - a.score)
    return scored.slice(0, 5)
  }, [allTasks])

  // Derived TASK VOMIT Backlog (Unsorted items: quadrant is null & status !== 'done')
  const vomitBacklog = useMemo(() => {
    let list = allTasks.filter(t => t.quadrant === null && t.status !== 'done')
    if (searchQuery.trim()) {
      list = list.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()))
    }
    if (bucketFilter === 'reassess') {
      list = list.filter(t => checkReassess(t))
    } else if (bucketFilter === 'recent') {
      list = list.slice(0, 10)
    }
    return list
  }, [allTasks, searchQuery, bucketFilter])

  // Timer Interval for Launch Pad
  useEffect(() => {
    let interval = null
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const startTaskLaunch = (task) => {
    setActiveTask(task)
    setTimerSeconds(0)
    setIsTimerRunning(true)
    setTinyCue(TINY_CUES[Math.floor(Math.random() * TINY_CUES.length)])
  }

  const markTaskDone = async (taskId) => {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    if (activeTask?.id === taskId) {
      setActiveTask(null)
      setIsTimerRunning(false)
    }
    fetchAllTasks()
  }

  const handleDumpTask = async (e) => {
    if (e) e.preventDefault()
    const title = newTitle.trim()
    if (!title || !user) return

    setDumpStatus('saving')
    try {
      const newTask = { title, status: 'inbox', quadrant: null, user_id: user.id }
      const { data, error } = await supabase.from('tasks').insert([newTask]).select().single()
      if (error) throw error
      setAllTasks(prev => [data, ...prev])
      setNewTitle('')
      setDumpStatus('saved')
      setTimeout(() => setDumpStatus(null), 1500)
    } catch (err) {
      console.error('Error dumping task:', err)
      setDumpStatus(null)
    }
  }

  const deployFromVomitBucket = async (task, targetQuadrant = 'urgent_important') => {
    const coords = getDefaultCoords(targetQuadrant)
    const offsetCoords = {
      x: coords.x + (Math.random() * 100 - 50),
      y: coords.y + (Math.random() * 100 - 50),
    }

    setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, quadrant: targetQuadrant, canvasX: offsetCoords.x, canvasY: offsetCoords.y } : t))
    try {
      await supabase.from('tasks').update({ quadrant: targetQuadrant }).eq('id', task.id)
    } catch (err) {
      console.error('Error deploying task:', err)
      fetchAllTasks()
    }
  }

  const deleteTask = async (taskId) => {
    setAllTasks(prev => prev.filter(t => t.id !== taskId))
    try {
      await supabase.from('tasks').delete().eq('id', taskId)
    } catch (err) {
      console.error('Error deleting task:', err)
      fetchAllTasks()
    }
  }

  const saveEulogy = async () => {
    if (!eulogyText.trim()) return
    await supabase.from('eulogies').insert({
      user_id: user.id,
      content: eulogyText.trim(),
      version_label: versionLabel || `Updated ${new Date().toLocaleDateString('en-GB')}`,
      written_date: new Date().toISOString().slice(0, 10),
    })
    setEditingEulogy(false)
    setVersionLabel('')
    fetchEulogies()
  }

  if (collapsed && !mobile) {
    return (
      <button onClick={onToggle} className="hidden md:flex absolute left-2 top-3 z-50 glass border border-blue-900/30 rounded-full w-9 h-9 items-center justify-center text-dim hover:text-starlight shadow-xl transition-transform hover:scale-105 cursor-pointer">
        <ChevronRight className="w-4 h-4" />
      </button>
    )
  }

  const topTask = osQueue[0]

  return (
    <div className={mobile ? "flex-1 overflow-y-auto" : "hidden md:flex flex-shrink-0 z-30 w-80 glass border-r border-blue-900/20 flex-col h-full overflow-hidden"}>
      {/* Top Header & Sub-Tabs */}
      <div className="p-3.5 border-b border-blue-900/20 space-y-3 bg-white/5 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs tracking-widest text-starlight flex items-center gap-2 uppercase">
            <Sun className="w-4 h-4 text-amber-400" /> Day Operating System
          </h3>
          {!mobile && (
            <button onClick={onToggle} className="text-dim hover:text-starlight p-1">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sub-tab pills: OPERATING SYSTEM vs TASK VOMIT */}
        <div className="glass border border-blue-900/30 p-1 rounded-xl flex items-center gap-1">
          <button
            onClick={() => setActiveTab('os')}
            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-display tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'os'
                ? 'bg-cosmic text-starlight border border-amber-400/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'text-dim hover:text-starlight'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>OPERATING SYSTEM</span>
          </button>

          <button
            onClick={() => setActiveTab('vomit')}
            className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-display tracking-wider transition-all flex items-center justify-center gap-1.5 relative ${
              activeTab === 'vomit'
                ? 'bg-cosmic text-starlight border border-gold/40 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'text-dim hover:text-starlight'
            }`}
          >
            <Inbox className="w-3 h-3 text-gold" />
            <span>TASK VOMIT</span>
            {vomitBacklog.length > 0 && (
              <span className="text-[9px] font-mono bg-amber-400/20 text-amber-400 px-1 rounded-full">
                {vomitBacklog.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-3.5 space-y-4">
        {activeTab === 'os' ? (
          <>
            {/* TODAY'S TASK (ACTION QUEUE - DO NOW) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Do Now (Today's Pick)
                </p>
                {onOpenDayGuide && (
                  <button
                    onClick={onOpenDayGuide}
                    className="text-[10px] font-mono text-nova hover:underline flex items-center gap-1"
                  >
                    <span>Day Guide</span> <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Active Launch Pad Banner */}
              {activeTask ? (
                <div className="glass border-2 border-amber-400 bg-amber-400/10 rounded-xl p-3 space-y-2 shadow-lg animate-pulse-slow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">Launch Pad Active</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-starlight">{activeTask.title}</p>
                  
                  {tinyCue && (
                    <p className="text-[10px] text-amber-200/90 italic bg-amber-400/20 p-2 rounded-lg border border-amber-400/30 leading-snug">
                      <strong>First Step:</strong> {tinyCue}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className="px-2 py-1 rounded bg-stardust text-xs text-starlight border border-blue-900/30 flex items-center gap-1"
                    >
                      {isTimerRunning ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                      <span>{isTimerRunning ? 'Pause' : 'Resume'}</span>
                    </button>
                    <button
                      onClick={() => markTaskDone(activeTask.id)}
                      className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-[#0c0f14] flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </button>
                  </div>
                </div>
              ) : topTask ? (
                <div className="glass border border-amber-400/30 bg-amber-400/5 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-starlight truncate max-w-[170px]">
                      {topTask.title}
                    </span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-400/20 px-1.5 py-0.5 rounded">
                      WSJF {topTask.score}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-dim pt-1 border-t border-blue-900/20">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-emerald-400" /> {topTask.estimated_minutes || 30}m
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => startTaskLaunch(topTask)}
                        className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-[#0c0f14] font-bold text-[11px] flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3 fill-current" /> Start
                      </button>
                      <button
                        onClick={() => markTaskDone(topTask.id)}
                        className="p-1 rounded text-dim hover:text-emerald-400"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass border border-dashed border-blue-900/30 rounded-xl p-4 text-center text-xs text-dim italic">
                  No active tasks in queue. Add tasks to TASK VOMIT!
                </div>
              )}

              {/* Upcoming Queue List */}
              {osQueue.length > 1 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-dim">Next Up Queue</p>
                  {osQueue.slice(1, 5).map((t, idx) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-blue-900/10 text-xs">
                      <span className="text-starlight/90 truncate max-w-[160px]">#{idx + 2} {t.title}</span>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-dim">
                        <span>{t.estimated_minutes || 30}m</span>
                        <button onClick={() => startTaskLaunch(t)} className="text-amber-400 hover:text-white p-0.5">
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EULOGY & MISSION SECTION */}
            <div className="space-y-2 pt-2 border-t border-blue-900/20">
              <p className="text-[10px] font-mono uppercase tracking-widest text-dim">Eulogy</p>
              <div className="glass border border-blue-900/20 rounded-xl p-3">
                <p className="text-xs text-starlight/90 whitespace-pre-wrap font-body leading-relaxed">{latest?.content || DEFAULT_EULOGY}</p>
                <button onClick={() => { setEulogyText(latest?.content || DEFAULT_EULOGY); setEditingEulogy(true) }} className="mt-2 text-[11px] text-nova flex items-center gap-1 hover:underline">
                  <Edit2 className="w-3 h-3" /> New version
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-dim">Mission Statement</p>
              {editingMission ? (
                <textarea rows={3} className="w-full bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none"
                  defaultValue={profile?.clarity_anchor || 'You hold the steering wheel. Polaris is your GPS.'}
                  onBlur={async e => { await updateProfile({ clarity_anchor: e.target.value }); setEditingMission(false) }} />
              ) : (
                <button onClick={() => setEditingMission(true)} className="w-full text-left glass border border-blue-900/20 rounded-xl p-2.5 text-xs text-starlight/90 leading-relaxed">
                  {profile?.clarity_anchor || 'You hold the steering wheel. Polaris is your GPS.'}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-dim">North Star</p>
              {editingChapter ? (
                <input className="w-full bg-stardust/50 text-xs text-aurora border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
                  defaultValue={profile?.current_chapter || 'Chapter I: The Foundation'}
                  onBlur={async e => { await updateProfile({ current_chapter: e.target.value }); setEditingChapter(false) }} />
              ) : (
                <button onClick={() => setEditingChapter(true)} className="w-full text-left glass border border-blue-900/20 rounded-xl p-2.5 text-xs text-aurora/90">
                  {profile?.current_chapter || 'Chapter I: The Foundation'}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-dim flex items-center gap-1"><History className="w-3 h-3" /> Eulogy History</p>
              <div className="space-y-1.5">
                {history.map(item => (
                  <div key={item.id} className="glass border border-blue-900/20 rounded-lg p-2 flex items-center justify-between">
                    <p className="text-xs text-nova truncate">{item.version_label || 'Version'}</p>
                    <p className="text-[10px] font-mono text-dim">{item.written_date}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* =================================================================== */
          /* TASK VOMIT INTEGRATED BACKLOG SUB-TAB                            */
          /* =================================================================== */
          <div className="space-y-3">
            {/* Quick Dump Input */}
            <form onSubmit={handleDumpTask} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Dump thoughts here (Press Enter)..."
                  className="flex-1 bg-stardust/50 border border-blue-900/30 focus:border-gold text-starlight text-xs rounded-xl px-3 py-2 outline-none font-body"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim() || dumpStatus === 'saving'}
                  className="bg-gold hover:bg-gold/90 disabled:opacity-50 text-void font-display text-xs px-3 py-2 rounded-xl shrink-0 cursor-pointer shadow-md"
                >
                  {dumpStatus === 'saving' ? '...' : 'DUMP'}
                </button>
              </div>
            </form>

            {/* Search & Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-dim absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search backlog..."
                  className="w-full bg-void/60 border border-blue-900/30 text-starlight text-[11px] rounded-lg pl-8 pr-3 py-1.5 outline-none font-body"
                />
              </div>

              <div className="flex items-center gap-1 text-[9px] font-mono">
                <button
                  onClick={() => setBucketFilter('all')}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    bucketFilter === 'all'
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 font-bold'
                      : 'border-blue-900/30 text-dim hover:text-starlight'
                  }`}
                >
                  ALL ({allTasks.filter(t => t.quadrant === null && t.status !== 'done').length})
                </button>
                <button
                  onClick={() => setBucketFilter('reassess')}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    bucketFilter === 'reassess'
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 font-bold'
                      : 'border-blue-900/30 text-dim hover:text-starlight'
                  }`}
                >
                  REASSESS
                </button>
                <button
                  onClick={() => setBucketFilter('recent')}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    bucketFilter === 'recent'
                      ? 'bg-amber-400/20 text-amber-400 border-amber-400/40 font-bold'
                      : 'border-blue-900/30 text-dim hover:text-starlight'
                  }`}
                >
                  RECENT
                </button>
              </div>
            </div>

            {/* Task Backlog List */}
            <div className="space-y-2 pt-1">
              {vomitBacklog.map((task) => (
                <div key={task.id} className="glass border border-blue-900/20 hover:border-gold/30 rounded-xl p-2.5 space-y-2 transition-all group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-starlight font-body leading-snug flex-1">{task.title}</p>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-dim hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete thought"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Deploy Quick Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-blue-900/20">
                    <span className="text-[9px] font-mono text-dim">Deploy to matrix:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deployFromVomitBucket(task, 'urgent_important')}
                        className="px-1.5 py-0.5 rounded bg-amber-400/10 hover:bg-amber-400/30 border border-amber-400/30 text-amber-400 text-[9px] font-mono"
                        title="Do First (Urgent & Important)"
                      >
                        DO FIRST
                      </button>
                      <button
                        onClick={() => deployFromVomitBucket(task, 'important_not_urgent')}
                        className="px-1.5 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-[9px] font-mono"
                        title="Schedule (Strategic)"
                      >
                        STRATEGIC
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {vomitBacklog.length === 0 && (
                <div className="text-center p-6 border border-dashed border-blue-900/20 rounded-xl glass space-y-1">
                  <Inbox className="w-6 h-6 text-dim mx-auto" />
                  <p className="text-xs text-dim italic font-body">No thoughts in TASK VOMIT backlog.</p>
                  <p className="text-[10px] text-dim/60 font-mono">Dump all raw ideas above!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingEulogy && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={e => e.target === e.currentTarget && setEditingEulogy(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-t-2xl rounded-b-none md:rounded-2xl p-5 w-full max-w-full md:max-w-2xl space-y-3">
            <h3 className="font-display text-starlight text-sm">Save new eulogy version</h3>
            <input className="w-full bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none" placeholder="Version label"
              value={versionLabel} onChange={e => setVersionLabel(e.target.value)} />
            <textarea rows={8} className="w-full bg-stardust/50 text-xs text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none"
              value={eulogyText} onChange={e => setEulogyText(e.target.value)} />
            <button onClick={saveEulogy} className="w-full py-2 bg-pulsar/20 border border-[#3ea8a0]/30 text-[#3ea8a0] text-xs font-display rounded-lg">
              SAVE NEW VERSION
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnchorPanel

