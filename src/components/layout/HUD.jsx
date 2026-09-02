import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { getLevelInfo } from '../../data/defaults'
import { Star, LogOut, Edit2, Check, Menu, X, PanelRightClose, PanelRightOpen } from 'lucide-react'
import IOBalanceBar from '../widgets/IOBalanceBar'
import StatsModal from '../modals/StatsModal'

const HUD = ({ activeView, setActiveView, rightPanelOpen, setRightPanelOpen }) => {
  const { profile, updateProfile, signOut } = useAuth()
  const [editingAnchor, setEditingAnchor] = useState(false)
  const [editingChapter, setEditingChapter] = useState(false)
  const [anchorText, setAnchorText] = useState('')
  const [chapterText, setChapterText] = useState('')
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [systemAlerts, setSystemAlerts] = useState([])

  useEffect(() => {
    if (!profile) return;
    const checkSystem = async () => {
      const alerts = [];
      const today = new Date().toLocaleDateString('en-CA');
      
      const { data: brief } = await supabase.from('morning_briefs').select('id').eq('date', today).maybeSingle();
      if (!brief) alerts.push('Morning Brief Scout failed to run or has not run today.');

      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);
      const { count: untriaged } = await supabase.from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'inbox')
        .lt('created_at', yesterday.toISOString());
      
      if (untriaged > 0) alerts.push(`Task Triage offline or falling behind (${untriaged} old tasks in inbox).`);

      setSystemAlerts(alerts);
    };
    checkSystem();
  }, [profile]);

  const xp = profile?.xp || 0
  const { current, next, progress } = getLevelInfo(xp)

  const saveAnchor = async () => {
    await updateProfile({ clarity_anchor: anchorText })
    setEditingAnchor(false)
  }

  const saveChapter = async () => {
    await updateProfile({ current_chapter: chapterText })
    setEditingChapter(false)
  }

  const navItems = [
    { id: 'graph', label: 'Constellation' },
    { id: 'day_guide', label: 'Day Guide' },
    { id: 'focus', label: 'Focus' },
    { id: 'goals', label: 'Goals' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'journal', label: 'Journal' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'fitness', label: 'Orbit' },
  ]

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-pulsar/30">
        {/* ── Row 1: Logo + Clarity Anchor + Nav (desktop) + Bars + Logout ── */}
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-fit">
            <Star className="text-gold w-4 h-4" fill="currentColor" />
            <span className="font-display text-sm tracking-[0.2em] text-starlight">POLARIS</span>
          </div>

          <div className="w-px h-6 bg-blue-900/40 hidden sm:block" />

          {/* Clarity anchor + chapter - hidden on mobile */}
          <div className="hidden sm:flex flex-col flex-1 min-w-0">
            {editingAnchor ? (
              <div className="flex items-center gap-2">
                <input
                  className="bg-transparent border-b border-pulsar text-xs text-starlight outline-none w-full font-body"
                  value={anchorText}
                  onChange={e => setAnchorText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveAnchor()}
                  autoFocus
                />
                <button onClick={saveAnchor}><Check className="w-3 h-3 text-emerald" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setAnchorText(profile?.clarity_anchor || ''); setEditingAnchor(true) }}>
                <p className="text-xs text-nova/60 font-body italic truncate">{profile?.clarity_anchor}</p>
                <Edit2 className="w-3 h-3 text-nova/60 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            )}
            {editingChapter ? (
              <div className="flex items-center gap-2">
                <input
                  className="bg-transparent border-b border-aurora text-xs text-aurora outline-none font-display"
                  value={chapterText}
                  onChange={e => setChapterText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveChapter()}
                  autoFocus
                />
                <button onClick={saveChapter}><Check className="w-3 h-3 text-emerald" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setChapterText(profile?.current_chapter || ''); setEditingChapter(true) }}>
                <span className="text-xs font-mono uppercase tracking-widest text-aurora/70">{profile?.current_chapter}</span>
                <Edit2 className="w-3 h-3 text-aurora/90 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto scrollbar-hide mr-auto max-w-none">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`whitespace-nowrap px-2 py-1 text-xs md:px-2.5 md:text-sm font-body rounded transition-all ${activeView === item.id
                  ? 'text-starlight bg-cosmic border border-pulsar/30'
                  : 'text-nova/60 hover:text-starlight'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="w-px h-6 bg-blue-900/40 hidden lg:block mx-1" />

          {/* Stacked bars: XP + IO */}
          <div onClick={() => setIsStatsOpen(true)} className="relative flex flex-col gap-0.5 flex-1 min-w-[140px] max-w-[350px] cursor-pointer group hover:bg-pulsar/10 p-1 rounded transition-colors -ml-1">
            {systemAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse z-10" />
            )}
            {/* XP row */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-gold whitespace-nowrap hidden sm:inline group-hover:text-nova transition-colors">{current.name}</span>
              <div className="flex-1 h-1.5 bg-stardust rounded-xl overflow-hidden">
                <div
                  className="h-full bg-gold rounded-xl xp-bar-fill transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-nova/60 whitespace-nowrap">{xp}{next ? `/${next.minXp}` : ''}</span>
              <span className="text-xs font-mono uppercase tracking-wider text-nova group-hover:text-gold transition-colors">Lv.{current.level}</span>
            </div>
            {/* IO row */}
            <div className="hidden md:block pointer-events-none">
              <IOBalanceBar />
            </div>
          </div>

          {/* Logout */}
          <button onClick={signOut} className="text-nova/60 hover:text-danger transition-colors ml-1" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isStatsOpen && <StatsModal onClose={() => setIsStatsOpen(false)} systemAlerts={systemAlerts} />}
    </>
  )
}

export default HUD