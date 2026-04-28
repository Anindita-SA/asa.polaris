import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

const NODE_COLORS = {
  root: '#f59e0b',
  career: '#3b82f6',
  academic: '#8b5cf6',
  self: '#10b981',
}

const NODE_SIZES = {
  root: 18,
  career: 14,
  academic: 14,
  self: 14,
  sub: 8,
}

const ConstellationGraph = ({ onNodeSelect }) => {
  const svgRef = useRef(null)
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNodes = useCallback(async () => {
    const { data } = await supabase.from('nodes').select('*').eq('user_id', user.id)
    setNodes(data || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { fetchNodes() }, [fetchNodes])

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Defs: glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Position nodes using stored x_pos/y_pos ratios
    const positioned = nodes.map(n => ({
      ...n,
      fx: n.x_pos * width,
      fy: n.y_pos * height,
    }))

    // Build links
    const links = []
    positioned.forEach(n => {
      if (n.parent_id) {
        const parent = positioned.find(p => p.id === n.parent_id)
        if (parent) links.push({ source: parent, target: n })
      }
    })

    // Draw constellation lines first
    svg.append('g').selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('x1', d => d.source.fx)
      .attr('y1', d => d.source.fy)
      .attr('x2', d => d.target.fx)
      .attr('y2', d => d.target.fy)
      .attr('stroke', d => `${NODE_COLORS[d.source.type] || '#3b82f6'}40`)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 6')

    // Draw nodes
    const nodeGroups = svg.append('g').selectAll('g')
      .data(positioned)
      .enter().append('g')
      .attr('transform', d => `translate(${d.fx}, ${d.fy})`)
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
      .attr('font-family', 'Cinzel, serif')
      .attr('font-size', '11px')
      .attr('fill', '#e2e8f0')
      .attr('letter-spacing', '0.1em')
      .text(d => d.title)

    nodeGroups.filter(d => !isMain(d)).append('text')
      .attr('y', d => getSize(d) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Raleway, sans-serif')
      .attr('font-size', '9px')
      .attr('fill', '#64748b')
      .text(d => d.title)

    // Hover effect
    nodeGroups
      .on('mouseenter', function(_, d) {
        d3.select(this).select('circle:first-child')
          .transition().duration(200)
          .attr('stroke', NODE_COLORS[d.type] || '#3b82f6')
          .attr('stroke-width', 1.5)
        d3.select(this).selectAll('circle')
          .transition().duration(200)
          .attr('r', function() {
            const r = parseFloat(d3.select(this).attr('r'))
            return r * 1.2
          })
      })
      .on('mouseleave', function(_, d) {
        d3.select(this).selectAll('circle')
          .transition().duration(200)
          .attr('r', function(_, i) {
            const sizes = isMain(d)
              ? [getSize(d) + 8, getSize(d), isMain(d) ? 3 : 2]
              : [getSize(d), isMain(d) ? 3 : 2]
            return sizes[i] || getSize(d)
          })
      })

  }, [nodes, onNodeSelect])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">MAPPING STARS...</p>
    </div>
  )

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}

export default ConstellationGraph
