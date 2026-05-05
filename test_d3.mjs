const d3 = await import('d3-force')

const nodes = [
  { id: '1', type: 'root', x_pos: 0.5, y_pos: 0.5 },
  { id: '2', type: 'career', x_pos: 0.4, y_pos: 0.4, parent_id: '1' },
  { id: '3', type: 'career', x_pos: null, y_pos: null } // no parent
]

const nodeData = nodes.map(n => ({ ...n, x: 500, y: 500 }))

const nodeById = {}
nodeData.forEach(n => { nodeById[n.id] = n })

const rootNode = nodeData.find(n => n.type === 'root')
const linkData = []
nodeData.forEach(n => {
  if (n.type === 'root') return
  const parent = (n.parent_id && nodeById[n.parent_id]) ? nodeById[n.parent_id] : rootNode
  if (parent) {
    linkData.push({ source: parent, target: n })
  }
})

const isMain = d => !d.parent_id || d.type === 'root'

try {
  const simulation = d3.forceSimulation(nodeData)
    .force('link', d3.forceLink(linkData).id(d => d.id).distance(d => isMain(d.source) ? 50 : 20).strength(1))
    
  // tick
  simulation.tick(10)
  console.log("Success! Nodes:")
  console.log(nodeData.map(n => `${n.id}: ${n.x}, ${n.y}`))
} catch (e) {
  console.error("ERROR CAUGHT:", e)
}
