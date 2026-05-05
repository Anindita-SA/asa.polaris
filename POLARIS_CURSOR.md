# POLARIS — Cursor AI Reference Document
> Last updated: April 2026 | Version 2.0 planning doc
> This file is the single source of truth for Cursor when making changes to the asa.polaris codebase.
> Always read this before editing any file.

---

## 1. What is Polaris?

Polaris is Anindita Sarker Aloka's private life dashboard — a personal command centre that maps career, academic, and self-improvement goals as an interactive astronomical constellation graph. It is not a productivity tool for the general public. Every design and code decision should serve one specific person.

**Mission statement:** You hold the steering wheel. Polaris is your GPS.

**Core philosophy:** Out of sight is out of mind. Everything that matters must be visible, interconnected, and frictionless to update.

---

## 2. Repository & Hosting

| Property | Value |
|---|---|
| Repo | github.com/Anindita-SA/asa.polaris |
| Live URL | anindita-sa.github.io/asa.polaris/ |
| Hosting | GitHub Pages (static) |
| Deploy | GitHub Actions — triggers on push to main |
| Vite base | `/asa.polaris/` — required in all asset paths |

**Deploy workflow (run in terminal every time):**
```bash
npm run build
git add .
git commit -m "describe the change"
git push
```
GitHub Actions handles the rest. Never manually edit the `dist/` folder.

**Files that must NOT be in git:**
- `node_modules/` — add to `.gitignore`
- `dist/` — add to `.gitignore`

---

## 3. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | JSX, functional components only |
| Styling | Tailwind CSS 3 | Custom tokens defined in tailwind.config.js |
| Graph | D3.js v7 | Force simulation — NOT fixed positions |
| Auth | Supabase Google OAuth | Session via useAuth hook |
| Database | Supabase Postgres | 9 core tables + eulogies + pomodoro_logs + subtasks |
| Storage | Supabase Storage | Journal photos in `journal-photos` bucket |
| CI/CD | GitHub Actions | `.github/workflows/deploy.yml` |
| Fonts | Instrument Serif + Raleway + JetBrains Mono | Google Fonts via index.html |

---

## 4. Design System

### 4.1 Colors (defined in tailwind.config.js)

| Token | Hex | Usage |
|---|---|---|
| `void` | #030712 | Page background |
| `nebula` | #0A0F1E | Glass panel background |
| `stardust` | #111827 | Input fields, subtle fills |
| `cosmic` | #1E2D4A | Active states, section headers |
| `pulsar` | #3B82F6 | Career nodes, primary actions, focus |
| `nova` | #60A5FA | Hover states, XP bar gradient end |
| `starlight` | #E2E8F0 | Primary text |
| `dim` | #64748B | Secondary text, placeholders |
| `gold` | #F59E0B | XP values, POLARIS wordmark, root node |
| `aurora` | #8B5CF6 | Academic nodes, chapter text |
| `emerald` | #10B981 | Self nodes, done states, habits |
| `danger` | #EF4444 | Overdue, delete actions |

### 4.2 Typography

| Font | Class | Used for |
|---|---|---|
| Instrument Serif | `font-display` | Titles and headings ONLY — POLARIS wordmark, section titles, node labels on graph, level names |
| Raleway | `font-body` | All body text, descriptions, inputs, journal entries |
| JetBrains Mono | `font-mono` | XP numbers, dates, deadlines, code, tags |

**Important:** Instrument Serif is for titles only. Do not use it for body text or long paragraphs. It replaces Cinzel everywhere.

### 4.3 Base Font Sizes
- Body text minimum: 14px (text-sm in Tailwind = 14px)
- Labels/metadata: 12px (text-xs)
- Section headers: 18-22px
- Titles: 24px+

### 4.4 Glass morphism pattern (use on all panels)
```jsx
className="glass border border-blue-900/20 rounded-xl"
```
Defined in global.css:
```css
.glass {
  background: rgba(10, 15, 30, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(59, 130, 246, 0.12);
}
```

### 4.5 Animations
- Stars: CSS twinkle keyframes, randomised per star
- Nebula blobs: slow drift, opacity 0.06
- XP bar: shimmer sweep left to right
- Node hover: D3 transition scale 1.2x over 200ms
- Side panel: slideIn translateX(100% → 0) 0.3s cubic-bezier
- Modal: scaleIn scale(0.95) + translateY(10px) → scale(1) 0.25s

---

## 5. File Structure

```
asa.polaris/
├── index.html                          # Vite entry — minimal, do not add content here
├── vite.config.js                      # base: '/asa.polaris/'
├── tailwind.config.js                  # All custom color tokens and font definitions
├── postcss.config.js
├── package.json
├── .env                                # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (never commit)
├── .env.example
├── .gitignore                          # Must include node_modules/ and dist/
├── POLARIS_CURSOR.md                   # This file
├── .github/workflows/deploy.yml        # GitHub Actions deploy
└── src/
    ├── main.jsx                        # Mounts <App /> into #root
    ├── App.jsx                         # Auth wrapper: Login or Dashboard
    ├── styles/
    │   └── global.css                  # Tailwind directives + all custom CSS
    ├── lib/
    │   └── supabase.js                 # Supabase client init
    ├── data/
    │   └── defaults.js                 # Seed data + XP level definitions
    ├── hooks/
    │   └── useAuth.jsx                 # Auth context, profile, XP, seeding
    ├── pages/
    │   ├── Login.jsx                   # Full-screen login with Google OAuth
    │   └── Dashboard.jsx               # Main shell — routes between 6 views
    └── components/
        ├── layout/
        │   ├── Starfield.jsx           # 180 star dots + 5 nebula blobs
        │   └── HUD.jsx                 # Fixed top bar — always visible
        ├── graph/
        │   └── ConstellationGraph.jsx  # D3 force simulation star map
        ├── panels/
        │   ├── NodePanel.jsx           # Right side panel on node click
        │   ├── FocusBoard.jsx          # 3-slot focus + backburner
        │   ├── Timeline.jsx            # Milestone timeline
        │   └── FitnessBridge.jsx       # Read-only fitness data mirror
        ├── widgets/
        │   ├── GoalsPanel.jsx          # Weekly→5yr goals with progress bars
        │   ├── PomodoroTimer.jsx       # Floating draggable timer (TO BUILD)
        │   └── MusicPlayer.jsx         # YouTube playlist embed (TO BUILD)
        ├── journal/
        │   └── Journal.jsx             # Daily highlight + habits + heatmap
        └── anchor/
            └── AnchorPanel.jsx         # Eulogy + mission + north star (TO BUILD)
```

---

## 6. Database Schema

All tables have Row Level Security enabled. Every query must include `.eq('user_id', user.id)`.

### Core tables (existing)

```sql
profiles        -- id, clarity_anchor, current_chapter, xp, level
nodes           -- id, parent_id, user_id, type, title, description, x_pos, y_pos, status
goals           -- id, node_id, user_id, scope, title, target, current, unit, xp_reward, completed
focus_items     -- id, user_id, title, category, why_now, status
backburner      -- id, user_id, title, why_deferred, context_snapshot, revisit_after
milestones      -- id, user_id, title, deadline, status, note, xp_reward
highlights      -- id, user_id, date, text, photo_url (unique: user_id + date)
habits          -- id, user_id, title, frequency, xp_reward
habit_logs      -- id, user_id, habit_id, date, completed (unique: user_id + habit_id + date)
```

### New tables to create (run in Supabase SQL editor)

```sql
-- Versioned eulogies (never overwrite, always append)
create table eulogies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  content text not null,
  version_label text,                    -- e.g. "June 2024 — original"
  written_date date default current_date,
  created_at timestamptz default now()
);
alter table eulogies enable row level security;
create policy "own eulogies" on eulogies for all using (auth.uid() = user_id);

-- Pomodoro session logs
create table pomodoro_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  date date default current_date,
  duration_minutes integer not null,
  node_id uuid references nodes(id),     -- optional: which node were you working on
  label text,                            -- optional: what were you doing
  created_at timestamptz default now()
);
alter table pomodoro_logs enable row level security;
create policy "own pomodoro" on pomodoro_logs for all using (auth.uid() = user_id);

-- Task breakdown subtasks (bite-sized steps for a project/focus item)
create table subtasks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  parent_id uuid,                        -- focus_item id or node id
  parent_type text,                      -- 'focus' or 'node'
  title text not null,
  completed boolean default false,
  position integer default 0,
  created_at timestamptz default now()
);
alter table subtasks enable row level security;
create policy "own subtasks" on subtasks for all using (auth.uid() = user_id);
```

### Required Supabase RPC (if not already created)

```sql
create or replace function increment_xp(user_id uuid, amount int)
returns void language sql security definer as $$
  update profiles set xp = xp + amount where id = user_id;
$$;
```

### Fitness tables (existing in same Supabase project — read only from Polaris)

| Table | Relevant columns |
|---|---|
| `workout_logs` | `id`, `log_date`, `day_type`, `logged_at` |
| `meal_logs` | `id`, `log_date`, `food_name`, `kcal`, `protein`, `carbs`, `fat`, `meal_tag`, `logged_at` |
| `weight_logs` | `id`, `log_date`, `weight_kg`, `logged_at` |

**Critical:** Use `log_date` not `created_at`. Use `weight_kg` not `weight`. Workout logs are per-exercise rows — group by `log_date` to count sessions.

---

## 7. Constellation Graph — v2 Specification

### What it must look like
- Full-screen D3 SVG, dark void background with Starfield behind it
- Nodes are glowing stars — SVG radial gradient + feGaussianBlur glow filter
- Constellation lines between connected nodes — solid, faint, coloured by node type at ~20% opacity
- Labels always visible below each node — Instrument Serif, colour-matched to node type
- Labels brighten on hover (opacity 0.4 → 1.0 transition)
- Physics: D3 force simulation (forceLink + forceManyBody + forceCenter)
- Nodes are draggable — on drag end, save new x_pos/y_pos to Supabase
- Clicking a node opens the NodePanel from the right

### Node visual spec

| Type | Color | Main radius | Label font size |
|---|---|---|---|
| root | #F59E0B (gold) | 20px | 13px |
| career | #3B82F6 (pulsar) | 16px | 11px |
| academic | #8B5CF6 (aurora) | 16px | 11px |
| self | #10B981 (emerald) | 16px | 11px |
| subnode | inherits parent color | 8px | 9px |

### Force simulation settings
```js
d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(120).strength(0.5))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(d => getSize(d) + 20))
```

### Add node from UI
- A small `+` button floats on the graph (bottom right)
- Opens a modal: title, type (career/academic/self), parent node selector, description
- Inserts into `nodes` table, redraws graph

---

## 8. Anchor Panel — v2 Specification

A collapsible left sidebar on the graph view. Contains three sections, all editable from the app.

### Section 1: Eulogy (versioned)
- Displays the most recent eulogy from the `eulogies` table
- "Edit" button opens a textarea modal
- Saving creates a NEW row (never updates existing) with a version label + written_date
- "View history" shows all past versions in reverse chronological order
- First entry to seed manually: dated June 25-26, 2024

**Eulogy content (seed this as the first entry):**

> Anindita Sarker was a kind hearted, honest, empathetic woman who loved to help others in need and be around the people whom she loved. She was always devoted to her morals and values and to education — not academic learning in general — and she always looked forward to bettering herself in all the ways possible. She had an endless thirst of knowledge and tickling hands for making cool stuff.
>
> All her life, she devoted herself to make a good life for her family and the needy. She always advocated for sustainable living, reusing trash to form treasure and teach and motivate others to do the same. She built a brand and multiple companies that focused on creative output, expression, sustainable products, agri-tech and robotics with a non profit working towards a better future for ecosystems. She was one of the greatest artists of her time, using her art as a guide and a vessel for growing the things that she held dear.
>
> She pursued her MSc in Europe not as an end goal but as a launchpad — building toward companies at the intersection of engineering, design, and sustainability. She achieved financial independence through invention, not employment, within a decade. A Renaissance woman in the truest sense: engineer, designer, artist, inventor.
>
> She never left her family's side and was always present for her mother and father. She might not have been a perfect human being, but she always strived to be a good, loving, caring person and a good daughter, sister and friend.

### Section 2: Mission Statement
- Single editable textarea saved to `profiles.clarity_anchor`
- Default: "You hold the steering wheel. Polaris is your GPS."

### Section 3: North Star (current chapter)
- Short editable text saved to `profiles.current_chapter`
- Default: "Chapter I: The Foundation"

---

## 9. HUD — v2 Specification

Fixed top bar, always visible, z-index 50.

### What's changing
- Replace Cinzel with Instrument Serif for POLARIS wordmark and level name
- Add today's focus time next to XP (pulled from pomodoro_logs)
- Favicon: SVG north star geometry, not emoji

### HUD zones (left to right)
1. North star SVG icon + POLARIS wordmark (Instrument Serif)
2. Clarity anchor text (inline editable) + chapter (inline editable)
3. Navigation tabs: Constellation | Focus | Goals | Timeline | Journal | Fitness
4. Today's focus time: `2h 15m` (from pomodoro_logs, today's date)
5. XP bar: level name + XP counter + animated progress bar + Lv.N
6. Sign out button

---

## 10. Milestone Timeline — v2 Specification

### Toggle design
- Collapsed (default): shows `"X / 9 milestones complete"` + a progress bar + chevron
- Expanded: full vertical timeline list
- Progress bar always visible even when collapsed

### Pre-seeded milestones and status

| Title | Deadline | Status |
|---|---|---|
| Deploy concrete speaker to portfolio | May 2026 | **done** |
| DAB survey paper submitted | Jun 2026 | upcoming |
| CHAARG PCB complete + documented | Aug 2026 | upcoming |
| Cold email TU Delft / TU/e faculty | Aug 2026 | upcoming |
| MOI certificate from NIT Trichy | Sep 2026 | upcoming |
| IELTS retake | Sep 2026 | upcoming |
| Portfolio fully populated | Oct 2026 | upcoming |
| Applications open | Nov 2026 | upcoming |
| Submit all applications | Jan 2027 | upcoming |

Update the seed in `defaults.js` to mark concrete speaker as `done`.

---

## 11. Fitness Bridge — v2 Specification

### Column mapping (critical fixes)

**workout_logs** — rows are per exercise, not per session. Group by `log_date`:
```js
// Count unique session dates, not rows
const sessionDates = [...new Set(workouts.map(w => w.log_date))]
// Display: day_type as the workout label (e.g. "Push Day", "Pull Day")
// Field: w.log_date, w.day_type
```

**meal_logs** — display fields:
```js
// w.food_name, w.kcal, w.protein, w.carbs, w.fat, w.meal_tag, w.log_date
```

**weight_logs** — display fields:
```js
// w.weight_kg (not w.weight), w.log_date
```

**Query fix** — replace `created_at` with `log_date` and `logged_at`:
```js
supabase.from('workout_logs')
  .select('*')
  .eq('user_id', user.id)
  .gte('log_date', since)
  .order('log_date', { ascending: false })
  .limit(50)  // more rows needed since each exercise is a row

supabase.from('meal_logs')
  .select('*')
  .eq('user_id', user.id)
  .gte('log_date', since)
  .order('log_date', { ascending: false })
  .limit(20)

supabase.from('weight_logs')
  .select('*')
  .eq('user_id', user.id)
  .order('log_date', { ascending: false })
  .limit(14)
```

---

## 12. Pomodoro Timer — v2 Specification

### Behaviour
- Floating widget, draggable, always on top (z-index 60)
- Docked bottom-right by default
- 25 min work / 5 min break, both customisable
- Visual: circular countdown ring (SVG), time remaining in centre
- States: idle → running → break → idle
- On work session complete: logs to `pomodoro_logs` (duration, date, optional node_id)
- HUD shows today's total focus time (sum of pomodoro_logs where date = today)

### Controls
- Play / Pause / Reset
- Optional: "What are you working on?" — dropdown of current focus items, saves as `node_id`

---

## 13. Music Player — v2 Specification

### Behaviour
- Collapsible bar docked at bottom of screen (above Pomodoro if both open)
- YouTube playlist embedded via iframe
- Playlist URL: `https://music.youtube.com/playlist?list=OLAK5uy_nE_yXCZeQMMpkcszZD3v9oiY8DnuKmaAw`
- Collapsed state: shows song title area + play/pause control + expand chevron
- Expanded state: full YouTube embed iframe
- Autoplay toggle
- State (collapsed/expanded) saved in localStorage (this is allowed for UI preferences, not data)

---

## 14. Task Breakdown Tool — v2 Specification

### Behaviour
- "Break it down" button (⚡ icon) appears on every Focus item and Node panel
- Opens a modal with: task/project description textarea + "Break it down" button
- Calls Claude API (Anthropic) to generate 5-10 bite-sized actionable steps
- Steps rendered as a checklist inside the modal
- "Save to Polaris" saves them as `subtasks` rows linked to the focus item or node
- Saved subtasks visible as a collapsible checklist on the Focus item / Node panel
- Checking a subtask marks it `completed = true` in Supabase

### Claude API call pattern
```js
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: "You are a task breakdown assistant. Given a project or task, return ONLY a JSON array of 5-10 short, specific, actionable steps. No markdown, no preamble, just the JSON array of strings.",
    messages: [{ role: "user", content: taskDescription }]
  })
})
```

---

## 15. Local Data Backup — v2 Specification

### Behaviour
- "Download backup" button in a Settings panel (accessible from HUD)
- Fetches all user's data from all Supabase tables
- Exports as a single JSON file: `polaris-backup-YYYY-MM-DD.json`
- Auto-triggers silently on login (downloads in background)
- Structure:
```json
{
  "exported_at": "2026-04-30T...",
  "profile": {...},
  "nodes": [...],
  "goals": [...],
  "focus_items": [...],
  "backburner": [...],
  "milestones": [...],
  "highlights": [...],
  "habits": [...],
  "habit_logs": [...],
  "eulogies": [...],
  "pomodoro_logs": [...],
  "subtasks": [...]
}
```

---

## 16. Seeding Fix — Critical

The seeding runs twice because of React StrictMode double-invocation. Fix in `useAuth.jsx`:

```js
const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error?.code === 'PGRST116') {
    // First login — no profile exists
    const { data: newProfile } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single()
    await seedUserData(userId)
    setProfile(newProfile)
    return
  }

  // Profile exists — check if nodes missing (handles failed seed)
  const { count } = await supabase
    .from('nodes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count === 0) {
    await seedUserData(userId)
  }

  setProfile(data)
}
```

Also wrap the seed functions with a guard so they can't run twice in parallel:
```js
let seeding = false  // module-level flag outside the component

const seedUserData = async (userId) => {
  if (seeding) return
  seeding = true
  try {
    // ... all the insert calls
  } finally {
    seeding = false
  }
}
```

---

## 17. Build Order for v2

When implementing changes, do them in this order to avoid breaking things:

1. Fix `useAuth.jsx` seeding (Section 16) — get nodes showing first
2. Run new SQL tables in Supabase (Section 6 — eulogies, pomodoro_logs, subtasks)
3. Fix `FitnessBridge.jsx` column names (Section 11)
4. Update `tailwind.config.js` — add Instrument Serif font
5. Update `index.html` — add Instrument Serif Google Fonts link, replace favicon
6. Update `defaults.js` — mark concrete speaker milestone as done
7. Rebuild `ConstellationGraph.jsx` — D3 force simulation (Section 7)
8. Build `AnchorPanel.jsx` — eulogy/mission sidebar (Section 8)
9. Update `HUD.jsx` — font, focus time, favicon (Section 9)
10. Update `Timeline.jsx` — toggle/collapse design (Section 10)
11. Build `PomodoroTimer.jsx` (Section 12)
12. Build `MusicPlayer.jsx` (Section 13)
13. Build task breakdown tool inside `NodePanel.jsx` and `FocusBoard.jsx` (Section 14)
14. Build backup system — Settings panel + export function (Section 15)

---

## 18. XP System (unchanged)

| Action | XP |
|---|---|
| Log daily highlight | +20 |
| Complete a habit | +10 (default, configurable) |
| Complete a focus item | +75 |
| Complete a goal | +50 (default, configurable) |
| Complete milestone (small) | +75 |
| Complete milestone (medium) | +100–175 |
| Complete milestone (large) | +200–300 |

### Level names

| Level | Name | Min XP |
|---|---|---|
| 1 | Stargazer | 0 |
| 2 | Apprentice Inventor | 200 |
| 3 | Circuit Weaver | 500 |
| 4 | Signal Architect | 1,000 |
| 5 | Renaissance Engineer | 2,000 |
| 6 | Polaris Navigator | 3,500 |
| 7 | Constellation Maker | 5,500 |
| 8 | Da Vinci Inheritor | 8,000 |

---

## 19. Rules for Cursor / AI Assistants

When making any change to this codebase:

1. **Read this document first** before touching any file
2. **Never use `localStorage`** for user data — Supabase only. `localStorage` is allowed only for UI state (collapsed/expanded panels, volume level)
3. **Never hardcode user data** — everything editable must save to Supabase
4. **Always use `.eq('user_id', user.id)`** on every Supabase query
5. **Instrument Serif for titles only** — not body text
6. **Tailwind classes only** for styling — no inline style objects except for D3 SVG elements
7. **Keep components focused** — one responsibility per file
8. **After any change:** run `npm run build` locally first, fix errors, then push
9. **Never edit `dist/`** — it is auto-generated
10. **The graph uses D3 force simulation** — do not revert to fixed x_pos/y_pos positioning (those are only the starting positions)
11. **Fitness data is read-only** — never write to workout_logs, meal_logs, or weight_logs from Polaris
12. **Eulogies are append-only** — never UPDATE an existing eulogy row, always INSERT a new one
