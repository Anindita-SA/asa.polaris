import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import * as d3 from 'd3'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus, X } from 'lucide-react'

const COLORS = {
  root:     '#f59e0b',
  career:   '#3b82f6',
  academic: '#8b5cf6',
  self:     '#10b981',
  subnode:  '#38bdf8',
  topic:    '#475569',
}
const RADIUS = { root: 10, career: 6, academic: 6, self: 6, subnode: 4, topic: 2.5 }
const col = t => COLORS[t] || '#64748b'
const rad = t => RADIUS[t] || 5

const ConstellationGraph = forwardRef(({ onNodeSelect }, ref) => {
  const svgRef       = useRef(null)
  const containerRef = useRef(null)
  const simRef       = useRef(null)
  const { user }     = useAuth()

  const [nodes,     setNodes]     = useState([])
  const [loading,   setLoading]   = useState(true)
  // tick counter — incrementing forces the draw useEffect to re-run on resize
  const [tick, setTick] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', type: 'career', description: '' })

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchNodes = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase.from('nodes').select('*').eq('user_id', user.id)
    if (error) return

    let rows = data || []
    if (!rows.some(n => n.type === 'root')) {
      const { data: root } = await supabase.from('nodes').insert({
        user_id: user.id, title: 'Polaris', type: 'root',
        description: 'Your North Star', x_pos: 0.5, y_pos: 0.5,
      }).select().single()
      if (root) rows = [root, ...rows]
    }

    setNodes(rows)
    setLoading(false)
  }, [user?.id])

  useImperativeHandle(ref, () => ({ refresh: fetchNodes }))
  useEffect(() => { fetchNodes() }, [fetchNodes])

  // ── window resize → force redraw ───────────────────────────────────────────
  useEffect(() => {
    const onResize = () => setTick(t => t + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── draw ───────────────────────────────────────────────────────────────────
  // Reads container size SYNCHRONOUSLY at effect time — no race with state.
  useEffect(() => {
    if (!nodes.length || !svgRef.current || !containerRef.current) return

    // Read dims right now, synchronously
    const rect = containerRef.current.getBoundingClientRect()
    let w = rect.width
    let h = rect.height

    // Fallback: if container still reports 0 (e.g. first paint), retry after a frame
    if (!w || !h) {
      const id = requestAnimationFrame(() => setTick(t => t + 1))
      return () => cancelAnimationFrame(id)
    }

    if (simRef.current) simRef.current.stop()

    const nodeData = nodes.map(n => ({
      ...n,
      x: w / 2 + (Math.random() - 0.5) * 120,
      y: h / 2 + (Math.random() - 0.5) * 120,
    }))

    const byId = {}
    nodeData.forEach(n => { byId[n.id] = n })
    const root = nodeData.find(n => n.type === 'root')

    const links = []
    nodeData.forEach(n => {
      if (n.type === 'root') return
      const pid = (n.parent_id && byId[n.parent_id]) ? n.parent_id : root?.id
      if (pid) links.push({ source: pid, target: n.id })
    })

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', w).attr('height', h)

    const g = svg.append('g')

    const linkSel = g.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', '#3b82f630')
      .attr('stroke-width', 1)

    const nodeSel = g.append('g')
      .selectAll('g').data(nodeData).join('g')
      .style('cursor', 'pointer')
      .on('click', (e, d) => { e.stopPropagation(); onNodeSelect(d) })

    nodeSel.append('circle')
      .attr('r', d => rad(d.type))
      .attr('fill', d => col(d.type))
      .attr('stroke', '#0a0c1a')
      .attr('stroke-width', 1.5)

    nodeSel.filter(d => d.type !== 'topic')
      .append('text')
      .text(d => d.title)
      .attr('dy', d => rad(d.type) + 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', d => d.type === 'root' ? 11 : 9)
      .attr('fill', '#94a3b8')
      .attr('pointer-events', 'none')

    nodeSel
      .on('mouseenter', function (_, d) {
        d3.select(this).select('circle').attr('r', rad(d.type) * 1.6)
        d3.select(this).select('text').attr('fill', '#fff')
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).select('circle').attr('r', rad(d.type))
        d3.select(this).select('text').attr('fill', '#94a3b8')
      })

    const sim = d3.forceSimulation(nodeData)
      .force('link',
        d3.forceLink(links).id(d => d.id)
          .distance(d => d.source.type === 'root' ? 100 : d.source.type === 'subnode' ? 30 : 55)
          .strength(1)
      )
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center',  d3.forceCenter(w / 2, h / 2))
      .force('collide', d3.forceCollide(d => rad(d.type) + 8))
      .on('tick', () => {
        linkSel
          .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeSel.attr('transform', d =>
          `translate(${isFinite(d.x) ? d.x : w/2},${isFinite(d.y) ? d.y : h/2})`
        )
      })

    nodeSel.call(
      d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   async (e, d) => {
          if (!e.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
          if (isFinite(d.x) && isFinite(d.y))
            await supabase.from('nodes').update({ x_pos: d.x / w, y_pos: d.y / h }).eq('id', d.id)
        })
    )

    svg.call(d3.zoom().scaleExtent([0.1, 6]).on('zoom', e => g.attr('transform', e.transform)))

    simRef.current = sim
    return () => sim.stop()
  }, [nodes, tick, onNodeSelect])  // tick forces retry when window resizes or first paint hasn't settled

  // ── add ────────────────────────────────────────────────────────────────────
  const addNode = async () => {
    if (!form.title.trim()) return
    const root = nodes.find(n => n.type === 'root')
    await supabase.from('nodes').insert({
      user_id: user.id, title: form.title.trim(), type: form.type,
      description: form.description, parent_id: root?.id ?? null,
      x_pos: 0.45 + Math.random() * 0.1, y_pos: 0.45 + Math.random() * 0.1,
    })
    setForm({ title: '', type: 'career', description: '' })
    setShowModal(false)
    fetchNodes()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">MAPPING STARS...</p>
    </div>
  )

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <svg ref={svgRef} style={{ display: 'block' }} />

      <button onClick={() => setShowModal(true)}
        className="absolute bottom-6 right-6 w-10 h-10 rounded-full glass border border-pulsar/30 text-pulsar hover:bg-pulsar/20 transition-all flex items-center justify-center z-10">
        <Plus className="w-4 h-4" />
      </button>

      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-void/80 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content glass border border-blue-900/30 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-starlight tracking-wider">New Star</h3>
              <button onClick={() => setShowModal(false)}><X className="w-4 h-4 text-dim" /></button>
            </div>
            <input placeholder="Title" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addNode()}
              autoFocus
              className="w-full bg-stardust/50 text-sm text-starlight border border-blue-900/20 rounded-lg px-3 py-2 outline-none focus:border-pulsar/40 font-body" />
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full bg-stardust/50 text-sm text-dim border border-blue-900/20 rounded-lg px-3 py-2 outline-none">
              <option value="career">Career</option>
              <option value="academic">Academic</option>
              <option value="self">Self</option>
            </select>
            <input placeholder="Description (optional)" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
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
})

ConstellationGraph.displayName = 'ConstellationGraph'
export default ConstellationGraph