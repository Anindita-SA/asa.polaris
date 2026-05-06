import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getLevelInfo } from '../../data/defaults'
import { Star, LogOut, Edit2, Check, Menu, X } from 'lucide-react'
import IOBalanceBar from '../widgets/IOBalanceBar'

const HUD = ({ activeView, setActiveView }) => {
  const { profile, updateProfile, signOut } = useAuth()
  const [editingAnchor, setEditingAnchor] = useState(false)
  const [editingChapter, setEditingChapter] = useState(false)
  const [anchorText, setAnchorText] = useState('')
  const [chapterText, setChapterText] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    { id: 'progress', label: 'Progress' },
    { id: 'goals', label: 'Goals' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'journal', label: 'Journal' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'curriculum', label: 'Curriculum' },
    { id: 'fitness', label: 'Fitness' },
  ]

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 glass border-b border-blue-900/20">
        {/* ── Row 1: Logo + Clarity Anchor + Nav (desktop) + Bars + Logout ── */}
        <div className="flex items-center h-14 px-4 gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 min-w-fit">
            <Star className="text-gold w-4 h-4" fill="currentColor" />
            <span className="font-display text-sm tracking-[0.2em] text-starlight">POLARIS</span>
          </div>

          <div className="w-px h-6 bg-blue-900/40 hidden sm:block" />

          {/* Clarity anchor + chapter — hidden on mobile */}
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

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`px-2.5 py-1 text-xs font-body rounded transition-all ${activeView === item.id
                  ? 'text-starlight bg-cosmic border border-pulsar/30'
                  : 'text-dim hover:text-starlight'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="w-px h-6 bg-blue-900/40 hidden lg:block" />

          {/* Stacked bars: XP + IO */}
          <div className="flex flex-col gap-0.5 flex-1 min-w-[140px] max-w-[350px]">
            {/* XP row */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-display text-gold tracking-wider whitespace-nowrap hidden sm:inline">{current.name}</span>
              <div className="flex-1 h-1.5 bg-stardust rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-nova rounded-full xp-bar-fill transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-dim whitespace-nowrap">{xp}{next ? `/${next.minXp}` : ''}</span>
              <span className="text-xs font-display text-nova">Lv.{current.level}</span>
            </div>
            {/* IO row */}
            <IOBalanceBar />
          </div>

          {/* Logout */}
          <button onClick={signOut} className="text-dim hover:text-danger transition-colors ml-1 hidden sm:block">
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(v => !v)} className="lg:hidden text-dim hover:text-starlight transition-colors ml-1">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Nav Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 right-0 z-[55] glass border-b border-blue-900/20 lg:hidden">
          <div className="grid grid-cols-3 gap-1 p-3">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); setMobileMenuOpen(false) }}
                className={`px-2 py-2.5 text-sm font-body rounded-lg transition-all text-center ${activeView === item.id
                  ? 'text-starlight bg-cosmic border border-pulsar/30'
                  : 'text-dim hover:text-starlight hover:bg-white/5'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* Mobile-only: clarity anchor + chapter + logout */}
          <div className="px-4 pb-3 pt-1 border-t border-blue-900/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-dim font-body italic truncate">{profile?.clarity_anchor}</p>
                <span className="text-xs font-display tracking-wider text-aurora/70">{profile?.current_chapter}</span>
              </div>
              <button onClick={signOut} className="text-dim hover:text-danger transition-colors ml-3 flex-shrink-0">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HUD