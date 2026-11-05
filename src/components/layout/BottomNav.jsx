import React from 'react'
import {
  Sun,
  Network,
  Crosshair,
  Target,
  GitCommitHorizontal,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Orbit,
  Anchor,
  Bell,
} from 'lucide-react'

const NAV_ITEMS = [
  { id: 'day_guide', label: 'Day Guide', icon: Sun },
  { id: 'graph', label: 'Constellation', icon: Network },
  { id: 'focus', label: 'Focus', icon: Crosshair },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'timeline', label: 'Timeline', icon: GitCommitHorizontal },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'curriculum', label: 'Curriculum', icon: GraduationCap },
  { id: 'fitness', label: 'Orbit', icon: Orbit },
  { id: 'anchor', label: 'Anchor', icon: Anchor, isSheet: true },
  { id: 'reminders', label: 'Reminders', icon: Bell, isSheet: true },
]

export default function BottomNav({ activeView, setActiveView, onOpenAnchor, onOpenReminders }) {
  const handleItemClick = (e, item) => {
    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    if (item.id === 'anchor') {
      onOpenAnchor?.()
    } else if (item.id === 'reminders') {
      onOpenReminders?.()
    } else {
      setActiveView(item.id)
    }
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/95 backdrop-blur-lg md:hidden border-t border-pulsar/30"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
    >
      <nav 
        className="overflow-x-auto scrollbar-hide flex items-center px-2 py-1.5 gap-1.5" 
        aria-label="Mobile Navigation"
      >
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = !item.isSheet && activeView === item.id

          return (
            <button
              key={item.id}
              onClick={(e) => handleItemClick(e, item)}
              className={`flex flex-col items-center justify-center py-1.5 px-2.5 min-w-[62px] rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 ${
                isActive 
                  ? 'text-amber-400 font-bold bg-pulsar/15 border border-pulsar/40 shadow-sm' 
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-amber-400' : 'text-white/60'} />
              <span className="text-[10px] font-mono uppercase tracking-wider leading-none mt-1 truncate max-w-full">
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
