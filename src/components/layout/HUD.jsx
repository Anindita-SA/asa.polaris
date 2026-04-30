import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getLevelInfo } from '../../data/defaults'
import { Star, LogOut, Edit2, Check, Timer, Settings } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useEffect } from 'react'

const HUD = ({ activeView, setActiveView, onOpenSettings }) => {
  const { profile, user, updateProfile, signOut } = useAuth()
  const [editingAnchor, setEditingAnchor] = useState(false)
  const [editingChapter, setEditingChapter] = useState(false)
  const [anchorText, setAnchorText] = useState('')
  const [chapterText, setChapterText] = useState('')
  const [todayMinutes, setTodayMinutes] = useState(0)

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
    { id: 'focus', label: 'Focus' },
    { id: 'goals', label: 'Goals' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'journal', label: 'Journal' },
    { id: 'fitness', label: 'Fitness' },
  ]

  useEffect(() => {
    const fetchTodayFocus = async () => {
      if (!user?.id) return
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('pomodoro_logs')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .eq('date', today)
      const total = (data || []).reduce((sum, row) => sum + (row.duration_minutes || 0), 0)
      setTodayMinutes(total)
    }
    fetchTodayFocus()
  }, [user?.id, activeView])

  return (
    <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-blue-900/20">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-fit">
          <Star className="text-gold w-4 h-4" />
          <span className="font-display text-sm tracking-[0.2em] text-starlight">POLARIS</span>
        </div>

        <div className="w-px h-6 bg-blue-900/40" />

        {/* Clarity anchor */}
        <div className="flex-1 min-w-0">
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
              <p className="text-xs text-dim font-body italic truncate">{profile?.clarity_anchor}</p>
              <Edit2 className="w-3 h-3 text-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          )}
          {editingChapter ? (
            <div className="flex items-center gap-2">
              <input
                className="bg-transparent border-b border-aurora text-xs text-aurora outline-none font-display tracking-wider"
                value={chapterText}
                onChange={e => setChapterText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveChapter()}
                autoFocus
              />
              <button onClick={saveChapter}><Check className="w-3 h-3 text-emerald" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group cursor-pointer" onClick={() => { setChapterText(profile?.current_chapter || ''); setEditingChapter(true) }}>
              <span className="text-xs font-display tracking-wider text-aurora/70">{profile?.current_chapter}</span>
              <Edit2 className="w-3 h-3 text-aurora/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`px-3 py-1 text-xs font-body rounded transition-all ${
                activeView === item.id
                  ? 'text-starlight bg-cosmic border border-pulsar/30'
                  : 'text-dim hover:text-starlight'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="w-px h-6 bg-blue-900/40" />

        <div className="flex items-center gap-1 min-w-fit text-dim">
          <Timer className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">
            {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
          </span>
        </div>

        <div className="w-px h-6 bg-blue-900/40" />

        {/* XP bar */}
        <div className="flex items-center gap-2 min-w-fit">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-display text-gold tracking-wider">{current.name}</p>
            <p className="text-xs text-dim font-mono">{xp} XP {next && `/ ${next.minXp}`}</p>
          </div>
          <div className="w-20 h-1.5 bg-stardust rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-nova rounded-full xp-bar-fill transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-display text-nova">Lv.{current.level}</span>
        </div>

        <button onClick={onOpenSettings} className="text-dim hover:text-nova transition-colors ml-1">
          <Settings className="w-4 h-4" />
        </button>
        <button onClick={signOut} className="text-dim hover:text-danger transition-colors ml-1">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default HUD
