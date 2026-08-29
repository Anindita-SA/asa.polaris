import React, { useRef } from 'react'
import { Network, Crosshair, TrendingUp, Target, GitCommitHorizontal, BookOpen, CalendarDays, GraduationCap, Orbit, Sun } from 'lucide-react'

const TABS = [
  { id: 'graph', label: 'Constellation', icon: Network },
  { id: 'day_guide', label: 'Day Guide', icon: Sun },
  { id: 'focus', label: 'Focus', icon: Crosshair },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'timeline', label: 'Timeline', icon: GitCommitHorizontal },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'curriculum', label: 'Curriculum', icon: GraduationCap },
  { id: 'fitness', label: 'Orbit', icon: Orbit },
]

export default function BottomNav({ activeView, setActiveView }) {
  const handleClick = (e, id) => {
    setActiveView(id)
    const el = e.currentTarget
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, 50)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#030712]/90 backdrop-blur-md md:hidden border-t border-pulsar/30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex flex-row items-center overflow-x-auto scrollbar-hide px-2 py-2 gap-2" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              onClick={(e) => handleClick(e, tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] flex-shrink-0 rounded-lg transition-all ${
                isActive 
                  ? 'text-amber-400 bg-pulsar/10' 
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-mono uppercase tracking-wider leading-none mt-1">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
