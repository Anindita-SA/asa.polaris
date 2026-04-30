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

const NODE_SIZES = {
  root: 20,
  career: 16,
  academic: 16,
  self: 16,
  sub: 8,
}

const ConstellationGraph = ({ onNodeSelect }) => {
  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [showAddNode, setShowAddNode] = useState(false)
  const [newNode, setNewNode] = useState({ title: '', type: 'career', parent_id: '', description: '' })

  const fetchNodes = useCallback(async () => {
    const { data } = await supabase.from('nodes').select('*').eq('user_id', user.id)
    setNodes(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchNodes() }, [fetchNodes])

  // ResizeObserver so SVG always knows its real dimensions
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDims({ width, height })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!nodes.length || !svgRef.current || !dims.width) return

    const { width, height } = dims

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Defs: glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    const prepared = nodes.map(n => ({
      ...n,
      x: (n.x_pos || 0.5) * width,
      y: (n.y_pos || 0.5) * height,
    }))

    // Build links
    const links = []
    prepared.forEach(n => {
      if (n.parent_id) {
        const parent = prepared.find(p => p.id === n.parent_id)
        if (parent) links.push({ source: parent, target: n })
      }
    })

    const linkLayer = svg.append('g')
    const nodeLayer = svg.append('g')

    const linkSelection = linkLayer.selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => `${NODE_COLORS[d.source.type] || '#3b82f6'}33`)
      .attr('stroke-width', 1)
      .attr('stroke-linecap', 'round')

    const nodeGroups = nodeLayer.selectAll('g')
      .data(prepared)
      .enter().append('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => onNodeSelect(d))

    const isMain = d => !d.parent_id || d.type === 'root'
    const getSize = d => isMain(d) ? (NODE_SIZES[d.type] || 10) : NODE_SIZES.sub

    // Outer glow ring for main nodes
    nodeGroups.filter(isMain).append('circle')
      .attr('r', d => getSize(d) + 8)
      .attr('fill', 'none')
      .attr('stroke', d => `${NODE_COLORS[d.type]}30`)
      .attr('stroke-width', 1)

    // Main circle
    nodeGroups.append('circle')
      .attr('r', d => getSize(d))
      .attr('fill', d => `${NODE_COLORS[d.type] || '#3b82f6'}22`)
      .attr('stroke', d => NODE_COLORS[d.type] || '#3b82f6')
      .attr('stroke-width', d => isMain(d) ? 1.5 : 1)
      .attr('filter', 'url(#glow)')

    // Center dot
    nodeGroups.append('circle')
      .attr('r', d => isMain(d) ? 3 : 2)
      .attr('fill', d => NODE_COLORS[d.type] || '#3b82f6')

    // Labels
    nodeGroups.filter(isMain).append('text')
      .attr('y', d => getSize(d) + 14)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Instrument Serif, serif')
      .attr('font-size', d => (d.type === 'root' ? '13px' : '11px'))
      .attr('fill', '#e2e8f0')
      .attr('opacity', 0.6)
      .text(d => d.title)

    nodeGroups.filter(d => !isMain(d)).append('text')
      .attr('y', d => getSize(d) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Instrument Serif, serif')
      .attr('font-size', '9px')
      .attr('fill', d => NODE_COLORS[d.type] || '#64748b')
      .attr('opacity', 0.5)
      .text(d => d.title)

    // Hover effect
    nodeGroups
      .on('mouseenter', function(_, d) {
        d3.select(this).selectAll('text').transition().duration(200).attr('opacity', 1)
        d3.select(this).selectAll('circle')
          .transition().duration(200)
          .attr('r', function() {
            const r = parseFloat(d3.select(this).attr('r'))
            return r * 1.2
          })
      })
      .on('mouseleave', function(_, d) {
        d3.select(this).selectAll('text').transition().duration(200).attr('opacity', 0.6)
        d3.select(this).selectAll('circle')
          .transition().duration(200)
          .attr('r', function(_, i) {
            const sizes = isMain(d)
              ? [getSize(d) + 8, getSize(d), isMain(d) ? 3 : 2]
              : [getSize(d), isMain(d) ? 3 : 2]
            return sizes[i] || getSize(d)
          })
      })

    const simulation = d3.forceSimulation(prepared)
      .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => getSize(d) + 20))
      .on('tick', () => {
        linkSelection
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
        nodeGroups.attr('transform', d => `translate(${d.x}, ${d.y})`)
      })

    const drag = d3.drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', async (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
        await supabase.from('nodes').update({
          x_pos: Math.max(0, Math.min(1, d.x / width)),
          y_pos: Math.max(0, Math.min(1, d.y / height)),
        }).eq('id', d.id).eq('user_id', user.id)
      })

    nodeGroups.call(drag)
    return () => simulation.stop()
  }, [nodes, dims, onNodeSelect])

  const addNode = async () => {
    if (!newNode.title.trim()) return
    const payload = {
      title: newNode.title.trim(),
      description: newNode.description.trim(),
      type: newNode.type,
      user_id: user.id,
      parent_id: newNode.parent_id || null,
      x_pos: 0.5,
      y_pos: 0.5,
    }
    await supabase.from('nodes').insert(payload)
    setShowAddNode(false)
    setNewNode({ title: '', type: 'career', parent_id: '', description: '' })
    fetchNodes()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">MAPPING STARS...</p>
    </div>
  )

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <svg
        ref={svgRef}
        width={dims.width}
        height={dims.height}
        style={{ display: 'block' }}
      />
      <button
        onClick={() => setShowAddNode(true)}
        className="absolute right-4 bottom-4 z-30 glass border border-pulsar/30 rounded-full w-11 h-11 flex items-center justify-center text-pulsar hover:text-nova"
      >
        <Plus className="w-5 h-5" />
      </button>
      {showAddNode && (
        <div className="modal-overlay absolute inset-0 bg-void/70 z-40 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowAddNode(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-5 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight">Add node</h3>
              <button onClick={() => setShowAddNode(false)} className="text-dim hover:text-starlight"><X className="w-4 h-4" /></button>
            </div>
            <input className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none" placeholder="Title"
              value={newNode.title} onChange={e => setNewNode(v => ({ ...v, title: e.target.value }))} />
            <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
              value={newNode.type} onChange={e => setNewNode(v => ({ ...v, type: e.target.value }))}>
              <option value="career">career</option>
              <option value="academic">academic</option>
              <option value="self">self</option>
            </select>
            <select className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none"
              value={newNode.parent_id} onChange={e => setNewNode(v => ({ ...v, parent_id: e.target.value }))}>
              <option value="">No parent</option>
              {nodes.map(node => <option key={node.id} value={node.id}>{node.title}</option>)}
            </select>
            <textarea className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none resize-none" rows={2}
              placeholder="Description" value={newNode.description} onChange={e => setNewNode(v => ({ ...v, description: e.target.value }))} />
            <button onClick={addNode} className="w-full py-2 bg-pulsar/20 border border-pulsar/30 text-pulsar text-sm font-display rounded-lg">SAVE NODE</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConstellationGraph
