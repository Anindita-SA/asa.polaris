# POLARIS — Cursor AI Instructions v2.1
> Paste this entire file as context when asking Cursor to make changes.
> Read every section relevant to the change before writing any code.

---

## THE APP

Polaris is a private life dashboard for Anindita Sarker Aloka hosted at anindita-sa.github.io/asa.polaris/. React 18 + Vite + Tailwind CSS + Supabase + D3.js. GitHub Pages deploy via Actions on push to main.

**Deploy every time:**
```bash
npm run build && git add . && git commit -m "describe change" && git push
```

---

## DESIGN SYSTEM

### Colors (in tailwind.config.js)
- `void` #030712 — background
- `nebula` #0A0F1E — glass panels
- `stardust` #111827 — inputs
- `cosmic` #1E2D4A — active states
- `pulsar` #3B82F6 — career / primary
- `nova` #60A5FA — hover / XP bar end
- `starlight` #E2E8F0 — primary text
- `dim` #64748B — secondary text
- `gold` #F59E0B — XP / POLARIS wordmark
- `aurora` #8B5CF6 — academic
- `emerald` #10B981 — self / done
- `danger` #EF4444 — overdue / delete

### Typography — CRITICAL
- **Instrument Serif** = `font-display` — titles and headings ONLY
- **Raleway** = `font-body` — all body text, inputs, descriptions
- **JetBrains Mono** = `font-mono` — numbers, dates, tags

**The font is squishing problem:** Instrument Serif renders too condensed at normal weight. Fix with:
```css
/* In global.css, add this rule: */
.font-display, [class*="font-display"] {
  font-optical-sizing: auto;
  font-variation-settings: "wdth" 100;
  letter-spacing: 0.02em;
}
```
Also update index.html Google Fonts link to include the full range:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;1,300&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

### Base sizes
- Body minimum: 14px (text-sm)
- Labels: 12px (text-xs)
- Section headers: 18-22px
- Titles: 24px+

---

## PRIORITY 1 — CONSTELLATION GRAPH (nodes not showing)

**Problem:** Nodes exist in Supabase (confirmed) but aren't rendering. The current code uses fixed x_pos/y_pos which are correct but D3 may not be redrawing after data loads.

**File:** `src/components/graph/ConstellationGraph.jsx`

**Full replacement — D3 force simulation with glowing stars:**

```jsx
import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { Plus } from 'lucide-react'

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

  const fetchNodes = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('nodes')
      .select('*')
      .eq('user_id', user.id)
    if (!error) {
      setNodes(data || [])
    }
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

    // Glow filter
    const defs = svg.append('defs')
    ['glow-root','glow-career','glow-academic','glow-self','glow-sub'].forEach((id, i) => {
      const colors = ['#f59e0b','#3b82f6','#8b5cf6','#10b981','#64748b']
      const filter = defs.append('filter').attr('id', id).attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%')
      filter.append('feGaussianBlur').attr('in','SourceGraphic').attr('stdDeviation', i === 0 ? 6 : 4).attr('result','blur')
      const merge = filter.append('feMerge')
      merge.append('feMergeNode').attr('in','blur')
      merge.append('feMergeNode').attr('in','SourceGraphic')
    })

    // Build node and link data with starting positions from db
    const nodeData = nodes.map(n => ({
      ...n,
      x: (n.x_pos || 0.5) * width,
      y: (n.y_pos || 0.5) * height,
    }))

    const nodeById = {}
    nodeData.forEach(n => { nodeById[n.id] = n })

    const linkData = nodeData
      .filter(n => n.parent_id && nodeById[n.parent_id])
      .map(n => ({ source: nodeById[n.parent_id], target: n }))

    const isMain = d => !d.parent_id || d.type === 'root'
    const getRadius = d => isMain(d) ? (NODE_RADIUS[d.type] || 14) : NODE_RADIUS.sub
    const getColor = d => NODE_COLORS[d.type] || '#64748b'
    const getFilter = d => {
      if (d.type === 'root') return 'url(#glow-root)'
      if (d.type === 'career') return 'url(#glow-career)'
      if (d.type === 'academic') return 'url(#glow-academic)'
      if (d.type === 'self') return 'url(#glow-self)'
      return 'url(#glow-sub)'
    }

    // Links layer
    const linkGroup = svg.append('g').attr('class', 'links')
    const linkLines = linkGroup.selectAll('line')
      .data(linkData).enter().append('line')
      .attr('stroke', d => `${getColor(d.source)}35`)
      .attr('stroke-width', 1)

    // Nodes layer
    const nodeGroup = svg.append('g').attr('class', 'nodes')
    const nodeGroups = nodeGroup.selectAll('g')
      .data(nodeData).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y
        })
        .on('end', async (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
          // Save position back to supabase
          const xRatio = Math.max(0, Math.min(1, d.x / width))
          const yRatio = Math.max(0, Math.min(1, d.y / height))
          await supabase.from('nodes').update({ x_pos: xRatio, y_pos: yRatio }).eq('id', d.id)
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeSelect(d)
      })

    // Outer glow ring
    nodeGroups.filter(isMain).append('circle')
      .attr('r', d => getRadius(d) + 10)
      .attr('fill', 'none')
      .attr('stroke', d => `${getColor(d)}20`)
      .attr('stroke-width', 1.5)

    // Main star circle
    nodeGroups.append('circle')
      .attr('r', d => getRadius(d))
      .attr('fill', d => `${getColor(d)}18`)
      .attr('stroke', d => getColor(d))
      .attr('stroke-width', d => isMain(d) ? 1.5 : 1)
      .attr('filter', d => getFilter(d))

    // Center dot
    nodeGroups.append('circle')
      .attr('r', d => isMain(d) ? 3.5 : 2)
      .attr('fill', d => getColor(d))

    // Labels — always visible, brighten on hover
    nodeGroups.append('text')
      .attr('y', d => getRadius(d) + 16)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Instrument Serif, serif')
      .attr('font-size', d => isMain(d) ? '12px' : '10px')
      .attr('fill', d => getColor(d))
      .attr('opacity', d => isMain(d) ? 0.85 : 0.55)
      .attr('letter-spacing', '0.05em')
      .text(d => d.title)

    // Hover
    nodeGroups
      .on('mouseenter', function(_, d) {
        d3.select(this).select('text').transition().duration(150).attr('opacity', 1).attr('font-size', isMain(d) ? '13px' : '11px')
        d3.select(this).selectAll('circle').transition().duration(150).attr('r', function() {
          return parseFloat(d3.select(this).attr('r')) * 1.25
        })
      })
      .on('mouseleave', function(_, d) {
        d3.select(this).select('text').transition().duration(150).attr('opacity', isMain(d) ? 0.85 : 0.55).attr('font-size', isMain(d) ? '12px' : '10px')
        d3.select(this).selectAll('circle').transition().duration(150).attr('r', function() {
          return parseFloat(d3.select(this).attr('r')) / 1.25
        })
      })

    // Force simulation
    const simulation = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id).distance(d => {
        const isSourceMain = !d.source.parent_id || d.source.type === 'root'
        return isSourceMain ? 140 : 80
      }).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-350))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => getRadius(d) + 25))
      .on('tick', () => {
        linkLines
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
        nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`)
      })

    simulationRef.current = simulation

    return () => simulation.stop()
  }, [nodes, dims, onNodeSelect])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="font-display text-dim tracking-widest text-sm animate-pulse">MAPPING STARS...</p>
    </div>
  )

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <svg ref={svgRef} width={dims.width} height={dims.height} style={{ display: 'block' }} />
      <button
        onClick={() => setShowAddModal(true)}
        className="absolute bottom-6 right-6 w-10 h-10 rounded-full glass border border-pulsar/30 text-pulsar hover:bg-pulsar/20 transition-all flex items-center justify-center z-10"
        title="Add node"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

export default ConstellationGraph
```

---

## PRIORITY 2 — FITNESS BRIDGE FIX

**File:** `src/components/panels/FitnessBridge.jsx`

**Critical column fixes:**
- `workout_logs`: use `log_date` not `created_at`. Rows are per-exercise, group by `log_date` to count sessions. Display field: `day_type`
- `meal_logs`: use `log_date`, `food_name`, `kcal`, `protein`, `carbs`, `fat`, `meal_tag`  
- `weight_logs`: use `log_date`, `weight_kg` (NOT `weight`)

**Replace the fetchAll function:**
```js
const fetchAll = async () => {
  try {
    const since = format(subDays(new Date(), 14), 'yyyy-MM-dd')
    const [w, m, wt] = await Promise.all([
      supabase.from('workout_logs').select('*').eq('user_id', user.id).gte('log_date', since).order('log_date', { ascending: false }).limit(50),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).gte('log_date', since).order('log_date', { ascending: false }).limit(30),
      supabase.from('weight_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }).limit(14),
    ])
    // Group workouts by date — each date = one session
    const sessionDates = [...new Set((w.data || []).map(r => r.log_date))]
    setWorkouts(sessionDates.map(date => {
      const rows = w.data.filter(r => r.log_date === date)
      return { log_date: date, day_type: rows[0]?.day_type || 'Workout', exercise_count: rows.length }
    }))
    setMeals(m.data || [])
    setWeights(wt.data || [])
  } catch (e) {
    setError('Could not connect to fitness data.')
  } finally {
    setLoading(false)
  }
}
```

**Replace weight display:** `latestWeight.weight_kg` everywhere `latestWeight.weight` appears.

**Replace date fields:** `w.log_date`, `m.log_date`, `wt.log_date` everywhere `created_at` or `date` appears in display.

**Replace workout display:** `w.day_type` as title, `${w.exercise_count} exercises` as subtitle.

**Replace meal display:** `m.food_name` as title, `m.kcal ? ${m.kcal} kcal` and `m.meal_tag` as subtitle.

---

## PRIORITY 3 — POMODORO TIMER REDESIGN

**File:** `src/components/widgets/PomodoroTimer.jsx`

**Design reference:** Flocus-style (image 6 in context). Large time display, minimal, fullscreen expandable. 

**Behaviour spec:**
- Default state: compact widget docked bottom-right (current position is fine)
- **Clock face IS the start button** — clicking the circle starts/pauses the timer
- Settings gear icon opens duration editor (inline, no modal)
- Auto-restart toggle button beside pause (loop icon) — keeps cycling focus→break→focus
- Expand button opens fullscreen mode:
  - Full viewport takeover with starfield visible behind
  - Giant time display (text-8xl or larger)
  - SVG circular progress ring around the time
  - Mode tabs: Pomodoro | Short Break | Long Break
  - Current task name displayed above timer
  - Minimise button to return to widget
- Draggable in widget mode only

**SVG circular progress ring:**
```jsx
const circumference = 2 * Math.PI * 54  // r=54
const progress = timeLeft / totalSeconds
const dashoffset = circumference * (1 - progress)

<svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="4" />
  <circle cx="60" cy="60" r="54" fill="none" stroke={modeColor} strokeWidth="4"
    strokeDasharray={circumference} strokeDashoffset={dashoffset}
    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
</svg>
```

**Mode colors:**
- Focus: `#3b82f6` (pulsar)
- Short Break: `#10b981` (emerald)  
- Long Break: `#8b5cf6` (aurora)

**Full component structure:**
```jsx
const PomodoroTimer = () => {
  const [mode, setMode] = useState('focus')   // 'focus' | 'short' | 'long'
  const [isRunning, setIsRunning] = useState(false)
  const [autoRestart, setAutoRestart] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 })
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [linkedNode, setLinkedNode] = useState(null)
  // position for dragging
  const [pos, setPos] = useState({ x: window.innerWidth - 280, y: window.innerHeight - 220 })

  const totalSeconds = durations[mode] * 60
  const modeColors = { focus: '#3b82f6', short: '#10b981', long: '#8b5cf6' }
  const modeColor = modeColors[mode]
  const modeLabels = { focus: 'Focus', short: 'Short Break', long: 'Long Break' }

  // Timer tick
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Session complete
          if (autoRestart) {
            const next = mode === 'focus' ? 'short' : 'focus'
            setMode(next)
            return durations[next] * 60
          }
          setIsRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, autoRestart, mode, durations])

  // Reset when mode changes
  useEffect(() => {
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
  }, [mode])

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const seconds = String(timeLeft % 60).padStart(2, '0')
  const circumference = 2 * Math.PI * 54
  const dashoffset = circumference * (1 - timeLeft / totalSeconds)

  const handleClockClick = () => setIsRunning(r => !r)

  // Drag logic (widget mode only)
  const dragRef = useRef(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const onMouseDown = (e) => {
    if (isExpanded) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const onMouseMove = (e) => {
    if (!isDragging.current) return
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }

  const onMouseUp = () => {
    isDragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  // ... render below
}
```

---

## PRIORITY 4 — PROGRESS DASHBOARD (new feature)

**Design reference:** LeetCode stats page style (image 5 in context).

**Add as a new tab in HUD nav:** "Progress" between Goals and Timeline.

**New file:** `src/components/widgets/ProgressDashboard.jsx`

**Sections:**

### 1. Overall XP ring
```jsx
// Circular donut showing level progress
// Current XP / next level XP
// Centre: level number + level name
// Same SVG ring technique as pomodoro
```

### 2. Milestone progress (like LeetCode solved problems)
```jsx
// Total: X / 9 complete
// Three rows with coloured bars:
// - Done (emerald): X milestones
// - In Progress (pulsar): X milestones  
// - Upcoming (dim): X milestones
// Each row: label + count + bar + percentage
```

### 3. Habit heatmap (upgraded)
```jsx
// Larger cells (16x16px instead of 12x12px)
// Month labels above columns
// Day of week labels (M W F) on left
// Stats above: total active days, current streak, max streak
// Colour intensity based on habits completed that day (1 habit = light, 3+ = full emerald)
```

### 4. Focus time stats
```jsx
// Total focus time this week (from pomodoro_logs)
// Daily bar chart: last 7 days, bar height = minutes focused
// Today highlighted in pulsar
```

### 5. Goals completion rate
```jsx
// Per scope: weekly / monthly / quarterly
// X/Y complete as a mini progress bar
// XP earned from goals this week
```

---

## PRIORITY 5 — FONT FIX (do this first, it's one line)

In `tailwind.config.js`, the fontFamily for display should be:
```js
fontFamily: {
  display: ['"Instrument Serif"', 'serif'],
  body: ['"Raleway"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
```

In `global.css`, add after the existing .glass rule:
```css
.font-display {
  font-optical-sizing: auto;
  letter-spacing: 0.03em;
  font-style: normal;
}
```

In `index.html`, replace the fonts link with:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Raleway:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

---

## DATABASE — NEW TABLES NEEDED

Run in Supabase SQL editor if not already done:

```sql
-- Eulogies (versioned, append-only)
create table if not exists eulogies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  content text not null,
  version_label text,
  written_date date default current_date,
  created_at timestamptz default now()
);
alter table eulogies enable row level security;
create policy "own eulogies" on eulogies for all using (auth.uid() = user_id);

-- Pomodoro logs
create table if not exists pomodoro_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  date date default current_date,
  duration_minutes integer not null,
  node_id uuid references nodes(id),
  label text,
  created_at timestamptz default now()
);
alter table pomodoro_logs enable row level security;
create policy "own pomodoro" on pomodoro_logs for all using (auth.uid() = user_id);

-- Subtasks
create table if not exists subtasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  parent_id uuid,
  parent_type text,
  title text not null,
  completed boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);
alter table subtasks enable row level security;
create policy "own subtasks" on subtasks for all using (auth.uid() = user_id);
```

---

## SEEDING FIX — useAuth.jsx

The seeding runs zero times because profile exists but nodes are empty. Replace `fetchProfile`:

```js
let seeding = false // put this OUTSIDE the component, at module level

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single()

  if (error?.code === 'PGRST116') {
    const { data: newProfile } = await supabase
      .from('profiles').insert({ id: userId }).select().single()
    await seedUserData(userId)
    setProfile(newProfile)
    return
  }

  const { count } = await supabase
    .from('nodes').select('*', { count: 'exact', head: true }).eq('user_id', userId)

  if (count === 0 && !seeding) {
    await seedUserData(userId)
  }

  setProfile(data)
}
```

And wrap seedUserData:
```js
const seedUserData = async (userId) => {
  if (seeding) return
  seeding = true
  try {
    // ... existing seed inserts
  } finally {
    seeding = false
  }
}
```

---

## RULES FOR CURSOR

1. Read the relevant priority section before touching any file
2. Never use `localStorage` for user data — Supabase only
3. Never use `created_at` for fitness tables — use `log_date`
4. Never use `weight` for weight — use `weight_kg`
5. Instrument Serif for titles only, never body text
6. Every Supabase query must include `.eq('user_id', user.id)`
7. Eulogies are INSERT only, never UPDATE
8. Always run `npm run build` and fix errors before pushing
9. Never commit `node_modules/` or `dist/`
10. The pomodoro clock face IS the start/pause trigger — no separate play button in widget mode

---

## BUILD ORDER

1. Font fix (tailwind.config.js + global.css + index.html) — 5 min
2. Seeding fix (useAuth.jsx) — get nodes on graph
3. Constellation graph replacement (ConstellationGraph.jsx)
4. Fitness bridge column fix (FitnessBridge.jsx)
5. Pomodoro redesign (PomodoroTimer.jsx)
6. Progress dashboard (new file + add to nav)
7. Run new SQL tables in Supabase
