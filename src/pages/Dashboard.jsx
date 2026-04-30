import { useEffect, useState } from 'react'
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
import PomodoroTimer from '../components/widgets/PomodoroTimer'
import MusicPlayer from '../components/widgets/MusicPlayer'
import SettingsPanel from '../components/panels/SettingsPanel'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const Dashboard = () => {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState('graph')
  const [selectedNode, setSelectedNode] = useState(null)
  const [anchorCollapsed, setAnchorCollapsed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [graphNodes, setGraphNodes] = useState([])

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

  useEffect(() => {
    const autoBackup = async () => {
      if (!user?.id) return
      if (window.localStorage.getItem(`polaris.backup.${user.id}`)) return
      const tables = ['profiles', 'nodes', 'goals', 'focus_items', 'backburner', 'milestones', 'highlights', 'habits', 'habit_logs', 'eulogies', 'pomodoro_logs', 'subtasks']
      const entries = await Promise.all(tables.map(async (table) => {
        const query = supabase.from(table).select('*')
        const scoped = table === 'profiles' ? query.eq('id', user.id) : query.eq('user_id', user.id)
        const { data } = await scoped
        return [table, data || []]
      }))
      const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), ...Object.fromEntries(entries) }, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `polaris-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      window.localStorage.setItem(`polaris.backup.${user.id}`, '1')
    }
    autoBackup()
  }, [user?.id])

  useEffect(() => {
    const fetchNodes = async () => {
      if (!user?.id) return
      const { data } = await supabase.from('nodes').select('id,title').eq('user_id', user.id)
      setGraphNodes(data || [])
    }
    fetchNodes()
  }, [user?.id, activeView])

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Starfield />

      <div className="relative z-10 h-full flex flex-col">
        <HUD
          activeView={activeView}
          setActiveView={(v) => { setActiveView(v); setSelectedNode(null) }}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Main content area */}
        <div className="flex-1 mt-14 relative overflow-hidden">
          {/* Constellation graph - always mounted, shown/hidden */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeView === 'graph' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <AnchorPanel collapsed={anchorCollapsed} onToggle={() => setAnchorCollapsed(v => !v)} />
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
      <PomodoroTimer nodes={graphNodes} />
      <MusicPlayer />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

export default Dashboard
