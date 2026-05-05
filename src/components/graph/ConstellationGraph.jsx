import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, X } from 'lucide-react'

const NODE_COLORS = {
  root: '#f59e0b',
  career: '#3b82f6',
  academic: '#8b5cf6',
  self: '#10b981',
}

const NODE_RADIUS = {
  root: 20,
  career: 16,
  academic: 16,
  self: 16,
  sub: 9,
}

const ConstellationGraph = ({ onNodeSelect }) => {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const simulationRef = useRef(null)
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', type: 'career', description: '', parentTitle: '' })

  const fetchNodes = useCallback(async () => {
    if (!user?.id) return
    let { data, error } = await supabase.from('nodes').select('*').eq('user_id', user.id)
    if (error) return

    // Auto-create Polaris root if it doesn't exist
    if (!data.some(n => n.type === 'root')) {
      const { data: rootNode } = await supabase.from('nodes').insert({
        user_id: user.id,
        title: 'Polaris',
        type: 'root',
        description: 'Your North Star',
        x_pos: 0.5,
        y_pos: 0.5
      }).select().single()
      if (rootNode) data = [...data, rootNode]
    }
    
    setNodes(data)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetchNodes() }, [fetchNodes])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setDims({ width, height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!nodes.length || !svgRef.current || !dims.width || !dims.height) return

    const { width, height } = dims
    if (simulationRef.current) simulationRef.current.stop()

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const nodeData = nodes.map(n => {
      const isXValid = n.x_pos !== null && Number.isFinite(n.x_pos)
      const isYValid = n.y_pos !== null && Number.isFinite(n.y_pos)
      return {
        ...n,
        x: isXValid ? n.x_pos * width : width / 2 + (Math.random() - 0.5) * 50,
        y: isYValid ? n.y_pos * height : height / 2 + (Math.random() - 0.5) * 50,
      }
    })

    const nodeById = {}
    nodeData.forEach(n => { nodeById[n.id] = n })

    const rootNode = nodeData.find(n => n.type === 'root')
    const linkData = []
    nodeData.forEach(n => {
      if (n.type === 'root') return
      const parent = (n.parent_id && nodeById[n.parent_id]) ? nodeById[n.parent_id] : rootNode
      if (parent) {
        linkData.push({ source: parent.id, target: n.id })
      }
    })

    const isMain = d => !d.parent_id || d.type === 'root'
    const getR = d => isMain(d) ? 8 : 4
    const getColor = d => NODE_COLORS[d.type] || '#64748b'

    // Create a container group for zooming/panning
    const graphGroup = svg.append('g').attr('class', 'graph-container')

    // Links
    const linkGroup = graphGroup.append('g').attr('class', 'links-layer')
    const linkLines = linkGroup.selectAll('line')
      .data(linkData).enter().append('line')
      .attr('stroke', d => `${getColor(d.source)}50`)
      .attr('stroke-width', 1)

    // Nodes
    const nodeGroupContainer = graphGroup.append('g').attr('class', 'nodes-layer')
    const nodeGroups = nodeGroupContainer.selectAll('g.node')
      .data(nodeData).enter().append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x || width/2},${d.y || height/2})`)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', async (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
          
          if (!d.x || !d.y) return // safeguard against nan crashes
          const xr = Math.max(0, Math.min(1, d.x / width))
          const yr = Math.max(0, Math.min(1, d.y / height))
          await supabase.from('nodes').update({ x_pos: xr, y_pos: yr }).eq('id', d.id)
        })
      )
      .on('click', (event, d) => { event.stopPropagation(); onNodeSelect(d) })

    // Single solid circle like Obsidian
    nodeGroups.append('circle')
      .attr('r', d => getR(d))
      .attr('fill', d => getColor(d))
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 1.5)

    // Clean text labels
    nodeGroups.append('text')
      .attr('y', d => getR(d) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'sans-serif')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .attr('opacity', 0.8)
      .attr('pointer-events', 'none')
      .text(d => d.title || 'Unknown Node')

    // Hover effects
    nodeGroups
      .on('mouseenter', function (_, d) {
        d3.select(this).select('text').transition().duration(150).attr('opacity', 1).attr('fill', '#ffffff')
        d3.select(this).select('circle').transition().duration(150).attr('r', getR(d) * 1.5)
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).select('text').transition().duration(150).attr('opacity', 0.8).attr('fill', '#94a3b8')
        d3.select(this).select('circle').transition().duration(150).attr('r', getR(d))
      })

    // Force simulation configured for clustered Obsidian feel
    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id).distance(d => {
        const sourceNode = typeof d.source === 'object' ? d.source : nodeById[d.source]
        return sourceNode && isMain(sourceNode) ? 50 : 20
      }).strength(1))
      .force('charge', d3.forceManyBody().strength(-40))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => getR(d) + 8).strength(1))
      .on('tick', () => {
        linkLines
          .attr('x1', d => d.source.x || width/2).attr('y1', d => d.source.y || height/2)
          .attr('x2', d => d.target.x || width/2).attr('y2', d => d.target.y || height/2)
        nodeGroups.attr('transform', d => `translate(${d.x || width/2},${d.y || height/2})`)
      })

    // Set up zoom AFTER simulation is configured
    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        graphGroup.attr('transform', event.transform)
      })
    svg.call(zoom)

    simulationRef.current = simulation
    return () => simulation.stop()
  }, [nodes, dims, onNodeSelect])

  const addNode = async () => {
    if (!addForm.title) return
    const parentNode = nodes.find(n => n.title === addForm.parentTitle)
    const fallbackParent = nodes.find(n => n.type === 'root')
    const parentId = parentNode?.id || fallbackParent?.id || null

    await supabase.from('nodes').insert({
      user_id: user.id,
      title: addForm.title,
      type: addForm.type,
      description: addForm.description,
      parent_id: parentId,
      x_pos: 0.4 + Math.random() * 0.2,
      y_pos: 0.4 + Math.random() * 0.2,
    })
    setAddForm({ title: '', type: 'career', description: '', parentTitle: '' })
    setShowAddModal(false)
    fetchNodes()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">MAPPING STARS...</p>
    </div>
  )

  const mainNodes = nodes.filter(n => !n.parent_id || n.type === 'root')

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <svg ref={svgRef} width={dims.width} height={dims.height} style={{ display: 'block' }} />

      <button onClick={() => setShowAddModal(true)}
        className="absolute bottom-6 right-6 w-10 h-10 rounded-full glass border border-pulsar/30 text-pulsar hover:bg-pulsar/20 transition-all flex items-center justify-center z-10"
        title="Add node">
        <Plus className="w-4 h-4" />
      </button>

      {showAddModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight tracking-wider">New Star</h3>
              <button onClick={() => setShowAddModal(false)}><X className="w-4 h-4 text-dim" /></button>
            </div>
            <input placeholder="Title" value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
            <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none">
              <option value="career">Career</option>
              <option value="academic">Academic</option>
              <option value="self">Self</option>
            </select>
            <select value={addForm.parentTitle} onChange={e => setAddForm(f => ({ ...f, parentTitle: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none">
              <option value="">No parent (main node)</option>
              {mainNodes.map(n => <option key={n.id} value={n.title}>{n.title}</option>)}
            </select>
            <input placeholder="Description (optional)" value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
            <button onClick={addNode}
              className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar text-sm font-display tracking-wider rounded-lg hover:bg-pulsar/30 transition-colors">
              ADD STAR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConstellationGraph