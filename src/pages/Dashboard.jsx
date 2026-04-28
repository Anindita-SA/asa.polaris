import { useState } from 'react'
import HUD from '../components/layout/HUD'
import Starfield from '../components/layout/Starfield'
import ConstellationGraph from '../components/graph/ConstellationGraph'
import NodePanel from '../components/panels/NodePanel'
import FocusBoard from '../components/panels/FocusBoard'
import GoalsPanel from '../components/widgets/GoalsPanel'
import Timeline from '../components/panels/Timeline'
import Journal from '../components/journal/Journal'
import FitnessBridge from '../components/panels/FitnessBridge'

const Dashboard = () => {
  const [activeView, setActiveView] = useState('graph')
  const [selectedNode, setSelectedNode] = useState(null)

  const handleNodeSelect = (node) => {
    setSelectedNode(node)
  }

  const renderView = () => {
    switch (activeView) {
      case 'focus': return <FocusBoard />
      case 'goals': return <GoalsPanel />
      case 'timeline': return <Timeline />
      case 'journal': return <Journal />
      case 'fitness': return <FitnessBridge />
      default: return null
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Starfield />

      <div className="relative z-10 h-full flex flex-col">
        <HUD activeView={activeView} setActiveView={(v) => { setActiveView(v); setSelectedNode(null) }} />

        {/* Main content area */}
        <div className="flex-1 mt-14 relative overflow-hidden">
          {/* Constellation graph - always mounted, shown/hidden */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeView === 'graph' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <ConstellationGraph onNodeSelect={handleNodeSelect} />
          </div>

          {/* Other views */}
          {activeView !== 'graph' && (
            <div className="absolute inset-0 overflow-hidden">
              {renderView()}
            </div>
          )}

          {/* Node side panel - only on graph view */}
          {activeView === 'graph' && selectedNode && (
            <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
