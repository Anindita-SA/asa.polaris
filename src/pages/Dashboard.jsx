import { useState, useRef, lazy, Suspense } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRecurringTasks } from '../hooks/useRecurringTasks'
import { useMorningBrief } from '../hooks/useMorningBrief'
import { useMorningSequence } from '../hooks/useMorningSequence'
import { useAuth } from '../hooks/useAuth'
import { offlineSelect } from '../lib/offlineApi'
import HUD from '../components/layout/HUD'
import Starfield from '../components/layout/Starfield'
import ConstellationGraph from '../components/graph/ConstellationGraph'
import NodePanel from '../components/panels/NodePanel'
import AnchorPanel from '../components/anchor/AnchorPanel'
import ProgressDashboard from '../components/widgets/ProgressDashboard'
import PomodoroTimer from '../components/widgets/PomodoroTimer'
import RemindersPanel from '../components/panels/RemindersPanel'
import BottomNav from '../components/layout/BottomNav'
import BottomSheet from '../components/layout/BottomSheet'
import SparkPopup from '../components/widgets/SparkPopup'

const DayGuideView = lazy(() => import('../components/views/DayGuideView'))
const FocusBoard = lazy(() => import('../components/panels/FocusBoard'))
const GoalsPanel = lazy(() => import('../components/widgets/GoalsPanel'))
const Timeline = lazy(() => import('../components/panels/Timeline'))
const Journal = lazy(() => import('../components/journal/Journal'))
const CalendarView = lazy(() => import('../components/panels/CalendarView'))
const Curriculum = lazy(() => import('../components/panels/Curriculum'))
const FitnessBridge = lazy(() => import('../components/panels/FitnessBridge'))

const ViewFallback = () => (
  <div className="flex items-center justify-center h-full w-full">
    <div className="text-center space-y-2">
      <div className="w-2 h-2 rounded-full bg-pulsar mx-auto animate-ping" />
      <p className="font-display text-nova/60 text-xs tracking-wider">Loading view...</p>
    </div>
  </div>
)

const Dashboard = () => {
  const { user } = useAuth()
  useRecurringTasks()
  useMorningBrief()
  const { stage, briefItems, markSparkSeen } = useMorningSequence()
  const [activeView, setActiveViewState] = useState(() => {
    try {
      return localStorage.getItem('polaris_active_view') || 'graph'
    } catch {
      return 'graph'
    }
  })

  const setActiveView = (view) => {
    setActiveViewState(view)
    try {
      localStorage.setItem('polaris_active_view', view)
    } catch (e) {}
  }
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [anchorCollapsed, setAnchorCollapsed] = useState(true)
  const [mobileSheet, setMobileSheet] = useState(null) // 'reminders', 'anchor', 'timer', null
  const graphRef = useRef(null)
  const refreshGraph = () => graphRef.current?.refresh()

  const jumpToNode = async (nodeId) => {
    const { data } = await offlineSelect('nodes', { id: nodeId, user_id: user?.id })
    const node = data?.[0]
    if (node) {
      setSelectedNode(node)
      setActiveView('graph')
    }
  }

  const renderView = () => {
    let content = null
    switch (activeView) {
      case 'day_guide': content = <DayGuideView />; break
      case 'focus': content = <FocusBoard />; break
      case 'goals': content = <GoalsPanel filterNodeId={selectedNode?.id} onJumpToNode={jumpToNode} />; break
      case 'timeline': content = <Timeline filterNodeId={selectedNode?.id} onJumpToNode={jumpToNode} />; break
      case 'journal': content = <Journal />; break
      case 'calendar': content = <CalendarView />; break
      case 'curriculum': content = <Curriculum />; break
      case 'fitness': content = <FitnessBridge />; break
      default: content = null
    }
    return content ? (
      <Suspense fallback={<ViewFallback />}>
        {content}
      </Suspense>
    ) : null
  }

  return (
    <div className="relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden flex flex-col">
      <Starfield />
      <div className="relative z-50">
        <HUD activeView={activeView} setActiveView={setActiveView} />
      </div>

      <div className="relative z-10 flex-1 flex mt-14 overflow-hidden">
        {/* Left column (Desktop only, handles own toggle inside) */}
        <AnchorPanel collapsed={anchorCollapsed} onToggle={() => setAnchorCollapsed(v => !v)} onOpenDayGuide={() => setActiveView('day_guide')} />

        {/* Right Panel Floating Toggle Button (Desktop only) */}
        <button onClick={() => setRightPanelOpen(v => !v)} className="hidden md:flex absolute right-2 top-3 z-50 glass border border-pulsar/40 rounded-full w-9 h-9 items-center justify-center text-nova/60 hover:text-starlight shadow-xl transition-transform hover:scale-105 cursor-pointer">
          {rightPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Center column (Canvas / Views) */}
        <div className="flex-1 relative overflow-hidden pb-16 md:pb-0">
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeView === 'graph' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <ConstellationGraph ref={graphRef} onNodeSelect={setSelectedNode} isActive={activeView === 'graph'} />
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
        <div className={`hidden md:flex flex-shrink-0 glass z-20 flex-col relative overflow-hidden transition-all duration-300 ${rightPanelOpen ? 'w-80 border-l border-pulsar/30' : 'w-0 opacity-0 border-l-0'}`}>
          <div className="flex-1 relative overflow-y-auto scrollbar-hide">
            {activeView === 'graph' && selectedNode ? (
              <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} onRefreshGraph={refreshGraph} />
            ) : (
              <RemindersPanel onOpenDayGuide={() => setActiveView('day_guide')} />
            )}
          </div>

          {/* Pomodoro Timer pinned to bottom on desktop */}
          <div className="flex-shrink-0 border-t border-pulsar/30">
            <PomodoroTimer />
          </div>
        </div>

        {/* Mobile Detail Drawers */}
        <BottomSheet 
          isOpen={Boolean(mobileSheet)} 
          onClose={() => setMobileSheet(null)}
          title={mobileSheet === 'reminders' ? 'Reminders & Daily Tasks' : mobileSheet === 'anchor' ? 'Clarity Anchor' : mobileSheet === 'timer' ? 'Focus Timer' : ''}
        >
          {mobileSheet === 'reminders' && (
            <RemindersPanel onOpenDayGuide={() => { setMobileSheet(null); setActiveView('day_guide'); }} />
          )}
          {mobileSheet === 'anchor' && (
            <AnchorPanel mobile={true} onOpenDayGuide={() => { setMobileSheet(null); setActiveView('day_guide'); }} />
          )}
          {mobileSheet === 'timer' && (
            <div className="py-2">
              <PomodoroTimer />
            </div>
          )}
        </BottomSheet>

      </div>
      
      {(stage === 'spark') && (
        <SparkPopup 
          items={briefItems}
          onDismiss={() => {
            markSparkSeen()
            setActiveView('day_guide')
            setTimeout(() => window.dispatchEvent(new CustomEvent('nav-day-brief')), 50)
          }}
        />
      )}

      <BottomNav 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onOpenAnchor={() => setMobileSheet('anchor')}
        onOpenReminders={() => setMobileSheet('reminders')}
      />
    </div>
  )
}

export default Dashboard
