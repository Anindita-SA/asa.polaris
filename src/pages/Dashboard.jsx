import { useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Anchor, Bell } from 'lucide-react'
import HUD from '../components/layout/HUD'
import Starfield from '../components/layout/Starfield'
import ConstellationGraph from '../components/graph/ConstellationGraph'
import NodePanel from '../components/panels/NodePanel'
import FocusBoard from '../components/panels/FocusBoard'
import GoalsPanel from '../components/widgets/GoalsPanel'
import Timeline from '../components/panels/Timeline'
import Journal from '../components/journal/Journal'
import FitnessBridge from '../components/panels/FitnessBridge'
import AnchorPanel from '../components/anchor/AnchorPanel'
import ProgressDashboard from '../components/widgets/ProgressDashboard'
import PomodoroTimer from '../components/widgets/PomodoroTimer'
import CalendarView from '../components/panels/CalendarView'
import Curriculum from '../components/panels/Curriculum'
import RemindersPanel from '../components/panels/RemindersPanel'
import DayGuideView from '../components/views/DayGuideView'
import BottomNav from '../components/layout/BottomNav'
import BottomSheet from '../components/layout/BottomSheet'

const Dashboard = () => {
  const [activeView, setActiveView] = useState('graph')
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [anchorCollapsed, setAnchorCollapsed] = useState(true)
  const [mobileSheet, setMobileSheet] = useState(null) // 'reminders', 'anchor', null
  const graphRef = useRef(null)
  const refreshGraph = () => graphRef.current?.refresh()

  const jumpToNode = async (nodeId) => {
    const { supabase } = await import('../lib/supabase')
    const { data } = await supabase.from('nodes').select('*').eq('id', nodeId).single()
    if (data) {
      setSelectedNode(data)
      setActiveView('graph')
    }
  }

  const renderView = () => {
    switch (activeView) {
      case 'day_guide': return <DayGuideView />
      case 'focus': return <FocusBoard />
      case 'goals': return <GoalsPanel filterNodeId={selectedNode?.id} onJumpToNode={jumpToNode} />
      case 'timeline': return <Timeline filterNodeId={selectedNode?.id} onJumpToNode={jumpToNode} />
      case 'journal': return <Journal />
      case 'calendar': return <CalendarView />
      case 'curriculum': return <Curriculum />
      case 'fitness': return <FitnessBridge />
      default: return null
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden flex flex-col">
      <Starfield />
      <div className="relative z-50">
        <HUD activeView={activeView} setActiveView={setActiveView} />
      </div>

      <div className="relative z-10 flex-1 flex mt-14 overflow-hidden">
        {/* Left column (Desktop only, handles own toggle inside) */}
        <AnchorPanel collapsed={anchorCollapsed} onToggle={() => setAnchorCollapsed(v => !v)} onOpenDayGuide={() => setActiveView('day_guide')} />

        {/* Right Panel Floating Toggle Button (Desktop only) */}
        <button onClick={() => setRightPanelOpen(v => !v)} className="hidden md:flex absolute right-2 top-3 z-50 glass border border-blue-900/30 rounded-full w-9 h-9 items-center justify-center text-dim hover:text-starlight shadow-xl transition-transform hover:scale-105 cursor-pointer">
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Center column (Canvas / Views) */}
        <div className="flex-1 relative overflow-hidden pb-16 md:pb-0">
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeView === 'graph' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <ConstellationGraph ref={graphRef} onNodeSelect={setSelectedNode} />
          </div>

          {activeView !== 'graph' && (
            <div className="absolute inset-0 overflow-hidden">
              {renderView()}
            </div>
          )}
        </div>

        {/* Mobile Full Screen Node Overlay */}
        <div className="md:hidden">
          {activeView === 'graph' && selectedNode && (
            <div className="fixed inset-0 z-[45] glass flex flex-col pt-14">
              <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} onRefreshGraph={refreshGraph} />
            </div>
          )}
        </div>

        {/* Right column slot (Fixed 320px = w-80 on Desktop, hidden on Mobile) */}
        <div className={`hidden md:flex flex-shrink-0 glass z-20 flex-col relative overflow-hidden transition-all duration-300 ${rightPanelOpen ? 'w-80 border-l border-blue-900/20' : 'w-0 opacity-0 border-l-0'}`}>
          <div className="flex-1 relative overflow-y-auto scrollbar-hide">
            {activeView === 'graph' && selectedNode ? (
              <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} onRefreshGraph={refreshGraph} />
            ) : (
              <RemindersPanel onOpenDayGuide={() => setActiveView('day_guide')} />
            )}
          </div>

          {/* Pomodoro Timer pinned to bottom on desktop */}
          <div className="flex-shrink-0 border-t border-blue-900/20">
            <PomodoroTimer />
          </div>
        </div>

        {/* Mobile Floating Triggers (Top Right) */}
        <button onClick={() => setMobileSheet('anchor')} className="fixed top-20 right-4 z-50 md:hidden glass border border-blue-900/30 rounded-full flex items-center justify-center text-dim hover:text-starlight shadow-lg">
          <Anchor className="w-5 h-5" />
        </button>
        <button onClick={() => setMobileSheet('reminders')} className="fixed top-32 right-4 z-50 md:hidden glass border border-blue-900/30 rounded-full flex items-center justify-center text-dim hover:text-starlight shadow-lg">
          <Bell className="w-5 h-5" />
        </button>

        {/* Mobile Bottom Sheet Backdrop */}
        <BottomSheet 
          isOpen={!!mobileSheet} 
          onClose={() => setMobileSheet(null)}
          title={mobileSheet === 'reminders' ? 'Reminders' : mobileSheet === 'anchor' ? 'Anchor' : ''}
        >
          {mobileSheet === 'reminders' && <RemindersPanel />}
          {mobileSheet === 'anchor' && <AnchorPanel mobile={true} />}
        </BottomSheet>

      </div>
      
      <BottomNav activeView={activeView} setActiveView={setActiveView} />
    </div>
  )
}

export default Dashboard