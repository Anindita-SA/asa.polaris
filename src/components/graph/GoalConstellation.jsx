import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { select, forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, drag, zoom } from 'd3'
import { offlineSelect } from '../../lib/offlineApi'
import { useAuth } from '../../hooks/useAuth'

const SCOPE_COLORS = {
  daily: '#3b82f6', // sky
  weekly: '#10b981', // emerald
  monthly: '#a855f7', // pulsar
  quarterly: '#ec4899', // aurora
  yearly: '#eab308', // gold
  '5yr': '#f43f5e', // nova
  side_quest: '#fb923c' // orange
}

const SCOPE_RADIUS = {
  daily: 12,
  weekly: 16,
  monthly: 22,
  quarterly: 28,
  yearly: 36,
  '5yr': 48,
  side_quest: 20
}

const col = t => SCOPE_COLORS[t] || '#64748b'
const rad = t => SCOPE_RADIUS[t] || 20

// Generates a sharp hexagon path
const hexPath = (r) => {
  const angles = [0, 60, 120, 180, 240, 300].map(a => (a - 30) * Math.PI / 180)
  return angles.map((a, i) => `${i === 0 ? 'M' : 'L'} ${r * Math.cos(a)},${r * Math.sin(a)}`).join(' ') + ' Z'
}

const GoalConstellation = forwardRef(({ onGoalSelect, isActive = true }, ref) => {
  const svgRef       = useRef(null)
  const containerRef = useRef(null)
  const simRef       = useRef(null)
  const { user }     = useAuth()

  const [goals,     setGoals]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [tick, setTick] = useState(0)

  // -- fetch --
  const fetchGoals = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await offlineSelect('goals', { user_id: user.id })
    if (error) return

    setGoals(data || [])
    setLoading(false)
  }, [user?.id])

  useImperativeHandle(ref, () => ({ refresh: fetchGoals }))
  useEffect(() => { fetchGoals() }, [fetchGoals])

  // -- window resize -> force redraw --
  useEffect(() => {
    const onResize = () => setTick(t => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // -- pause / resume simulation based on isActive --
  useEffect(() => {
    if (!simRef.current) return
    if (!isActive) {
      simRef.current.stop()
    } else {
      simRef.current.alpha(0.1).restart()
    }
  }, [isActive])

  // -- draw --
  useEffect(() => {
    if (!goals.length || !svgRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(containerRef.current)
    const padLeft = parseFloat(computedStyle.paddingLeft) || 0
    const padRight = parseFloat(computedStyle.paddingRight) || 0
    let w = rect.width - padLeft - padRight
    let h = rect.height

    if (!w || !h) {
      const id = requestAnimationFrame(() => setTick(t => t + 1))
      return () => cancelAnimationFrame(id)
    }

    if (simRef.current) simRef.current.stop()

    const nodeData = goals.map(n => ({
      ...n,
      x: (isFinite(w) && w > 0 ? w / 2 : 400) + (Math.random() - 0.5) * 120,
      y: (isFinite(h) && h > 0 ? h / 2 : 300) + (Math.random() - 0.5) * 120,
    }))

    const byId = {}
    nodeData.forEach(n => { byId[n.id] = n })

    const links = []
    nodeData.forEach(n => {
      if (n.parent_goal_id && byId[n.parent_goal_id]) {
        links.push({ source: n.parent_goal_id, target: n.id })
      }
    })

    const svg = select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', w).attr('height', h)
    
    // Background Definition for sharp tactical look
    svg.style('background-color', 'transparent')

    const g = svg.append('g')

    // Dotted/Dashed Tactical Links
    const linkSel = g.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', d => `${col(byId[d.target]?.scope || 'monthly')}80`)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4, 4')

    const nodeSel = g.append('g')
      .selectAll('g').data(nodeData).join('g')
      .style('cursor', 'pointer')
      .on('click', (e, d) => { e.stopPropagation(); if (onGoalSelect) onGoalSelect(d) })

    // Outer Hexagon (Solid Border)
    nodeSel.append('path')
      .attr('d', d => hexPath(rad(d.scope)))
      .attr('fill', '#050505') // Void dark background
      .attr('stroke', d => col(d.scope))
      .attr('stroke-width', 2)

    // Inner Hexagon (Progress Fill)
    nodeSel.append('path')
      .attr('d', d => {
        const target = d.target || 1
        const current = d.current || 0
        const progress = Math.min(current / target, 1)
        const innerRad = (rad(d.scope) - 4) * progress
        return innerRad > 0 ? hexPath(innerRad) : ''
      })
      .attr('fill', d => col(d.scope))
      .style('opacity', 0.8)

    // Central core dot for active nodes
    nodeSel.append('circle')
      .attr('r', 2)
      .attr('fill', '#fff')

    // Tactical text labels
    nodeSel.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('dy', d => rad(d.scope) + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('font-family', 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace')
      .attr('letter-spacing', '0.05em')
      .attr('fill', '#94a3b8')
      .attr('pointer-events', 'none')
      .style('text-transform', 'uppercase')

    nodeSel
      .on('mouseenter', function (_, d) {
        select(this).select('path').attr('stroke-width', 4)
        select(this).select('text').attr('fill', '#fff').attr('font-weight', 'bold')
      })
      .on('mouseleave', function (_, d) {
        select(this).select('path').attr('stroke-width', 2)
        select(this).select('text').attr('fill', '#94a3b8').attr('font-weight', 'normal')
      })

    const safeW = isFinite(w) && w > 0 ? w : 800;
    const safeH = isFinite(h) && h > 0 ? h : 600;

    const sim = forceSimulation(nodeData)
      .alphaDecay(0.005)
      .alphaMin(0.001)
      .force('link',
        forceLink(links).id(d => d.id)
          .distance(100) // Longer links for tactical spacing
          .strength(0.8)
      )
      .force('charge', forceManyBody().strength(-300))
      .force('center',  forceCenter(safeW / 2, safeH / 2))
      .force('collide', forceCollide(d => rad(d.scope) + 30)) // Extra padding
      .on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel.attr('transform', d =>
          `translate(${isFinite(d.x) ? d.x : safeW/2},${isFinite(d.y) ? d.y : safeH/2})`
        )
      })

    nodeSel.call(
      drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => {
          if (!e.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )

    svg.call(zoom().scaleExtent([0.1, 6]).on('zoom', e => g.attr('transform', e.transform)))

    simRef.current = sim

    const handleResize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(containerRef.current)
      const padLeft = parseFloat(computedStyle.paddingLeft) || 0
      const padRight = parseFloat(computedStyle.paddingRight) || 0
      const w = rect.width - padLeft - padRight
      const h = rect.height
      svg.attr('width', w).attr('height', h)
      const safeRW = isFinite(w) && w > 0 ? w : 800;
      const safeRH = isFinite(h) && h > 0 ? h : 600;
      sim.force('center', forceCenter(safeRW / 2, safeRH / 2))
      sim.alpha(0.1).restart()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      sim.stop()
      window.removeEventListener('resize', handleResize)
    }
  }, [goals, tick, onGoalSelect])

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-void/50 backdrop-blur-md">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-nova/20 border-t-nova rounded-full animate-spin"></div>
        <p className="font-mono text-nova/60 text-xs uppercase tracking-widest">Constructing Hierarchy...</p>
      </div>
    </div>
  )

  return (
    <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: '600px', flex: 1, backgroundColor: '#050505' }}>
      <svg ref={svgRef} style={{ display: 'block', touchAction: 'none', width: '100%', height: '100%' }} />
    </div>
  )
})

GoalConstellation.displayName = 'GoalConstellation'
export default GoalConstellation
