import { useState, useRef } from 'react'
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
import MusicPlayer from '../components/widgets/MusicPlayer'
import CalendarView from '../components/panels/CalendarView'
import Curriculum from '../components/panels/Curriculum'

const Dashboard = () => {
  const [activeView, setActiveView] = useState('graph')
  const [selectedNode, setSelectedNode] = useState(null)
  const [anchorCollapsed, setAnchorCollapsed] = useState(false)
  const graphRef = useRef(null)
  const refreshGraph = () => graphRef.current?.refresh()

  const renderView = () => {
    switch (activeView) {
      case 'focus': return <FocusBoard />
      case 'goals': return <GoalsPanel />
      case 'progress': return <ProgressDashboard />
      case 'timeline': return <Timeline />
      case 'journal': return <Journal />
      case 'calendar': return <CalendarView />
      case 'curriculum': return <Curriculum />
      case 'fitness': return <FitnessBridge />
      default: return null
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Starfield />
      <div className="relative z-10 h-full flex flex-col">
        <HUD
          activeView={activeView}
          setActiveView={(v) => { setActiveView(v); setSelectedNode(null) }}
        />
        <div className="flex-1 mt-14 relative overflow-hidden">
          <AnchorPanel collapsed={anchorCollapsed} onToggle={() => setAnchorCollapsed(v => !v)} />
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeView === 'graph' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}>
            <ConstellationGraph ref={graphRef} onNodeSelect={setSelectedNode} />
          </div>

          {activeView !== 'graph' && (
            <div className="absolute inset-0 overflow-hidden">
              {renderView()}
            </div>
          )}

          {activeView === 'graph' && selectedNode && (
            <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} onRefreshGraph={refreshGraph} />
          )}
        </div>
      </div>

      {/* Pomodoro and Music always mounted so they survive tab switches */}
      <PomodoroTimer />
      <MusicPlayer />
    </div>
  )
}

export default Dashboard