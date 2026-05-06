# Polaris Ecosystem: Complete Feature & Formatting Guide

This guide provides a detailed breakdown of all the productivity systems inside Polaris, including their features, XP mechanics, and the exact data formats you should use in [defaults.js](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/data/defaults.js) or the Supabase editor.

---

## 1. Constellation Graph (The Map)
The Constellation Graph is your interactive 3D/2D visual map of life nodes, subnodes, and research topics.

- **Types of Stars**:
  - `root`: The central orange node representing **POLARIS** itself.
  - `career`: Sleek blue top-level node for your professional identity.
  - `academic`: Purple top-level node for school/research.
  - `self`: Green top-level node for lifestyle, health, and finance.
  - `subnode`: Lighter blue secondary nodes nested under categories.
  - `topic`: Small slate-gray target items nested under subnodes.
- **Node Panel (Right-Side Drawer)**:
  - double-click any title or description to edit it inline.
  - View nested subnodes/topics, and manage active subtasks.
  - **AI Task Breakdown**: Type in any broad goal (e.g., *"Finish CHAARG PCB layout"*) and click **Break it down** to generate an action plan.

### Data Format (`DEFAULT_NODES` & `DEFAULT_SUBNODES`):
```javascript
export const DEFAULT_NODES = [
  { type: 'root', title: 'POLARIS', description: 'Your north star', x_pos: 0.5, y_pos: 0.5 },
  { type: 'career', title: 'Career', description: 'Engineering identity, portfolio, applications', x_pos: 0.25, y_pos: 0.3 }
]

export const DEFAULT_SUBNODES = [
  { type: 'career', title: 'Portfolio', description: 'Projects & case studies', x_pos: 0.1, y_pos: 0.15, parentTitle: 'Career' }
]
```

---

## 2. Multi-Scope Goals (The Engine)
Goals are categorized by scopes to represent different granularities of time.

- **Scopes**: `daily` | `weekly` | `monthly` | `quarterly` | `yearly` | `5yr`
- **XP Reward Rules**:
  - Weekly/Monthly/Quarterly/Yearly Goals: **+50 XP** on completion.
  - 5-Year Goals: **+500 XP to +1000 XP** depending on size.
  - Completion triggers a green progress bar animation and visual badge completion.

### Data Format (`DEFAULT_GOALS`):
```javascript
export const DEFAULT_GOALS = [
  { title: 'Work on portfolio case study', scope: 'weekly', target: 3, unit: 'sessions', xp_reward: 50 },
  { title: 'Complete MSc in Europe', scope: '5yr', target: 1, unit: 'degree', xp_reward: 500 }
]
```

---

## 3. Daily Ritual Stack (The Routine)
The Daily Ritual Stack sits at the top of your **Journal** tab. It tracks daily recurring habits to keep you grounded every single morning and night.

- **Categorizations**:
  - `morning`: To be checked off early (associated with Sunrise icon).
  - `anytime`: Flexibility tasks (associated with Sun icon).
  - `evening`: End-of-day tasks (associated with Moon icon).
- **Check-off Mechanic**:
  - Checking off a ritual step logs a persistent entry to `ritual_logs` and instantly grants **+5 XP**.
  - **Edit Mode**: Click the pencil icon to add new items, delete old ones, or reorder them on the fly.

### Data Format (`DEFAULT_HABITS`):
```javascript
export const DEFAULT_HABITS = [
  { title: 'Morning workout', frequency: 'daily', xp_reward: 15 },
  { title: 'Hit protein target', frequency: 'daily', xp_reward: 10 }
]
```

---

## 4. Google Calendar Synchronizer (The Grid)
The Calendar tab maps your real-time Google Calendar events into an ultra-premium weekly dashboard.

- **True Color Coding**: Supports Google's API v3 color spectrum with actual hex representations:
  - *Sage, Grape, Flamingo, Banana, Tangerine, Peacock, Blueberry, Basil, Tomato.*
- **Glow & Translucency**: Each calendar pill features a **5% transparent background tint matching its Google color**, plus a solid color-coded left-border highlight.
- **Permissions**: Safe, secure, and uses the `calendar.readonly` scope. Seamlessly handles token expiration with a beautiful connect screen.

---

## 5. Focus Board & Backburner (The Workspace)
The Focus Board houses active projects, while the Backburner contains your deferred ideas with their context frozen in time.

- **Focus Board (Max 3 Active Items)**:
  - Keeps you focused on what matters right now.
  - Requires a specific category and a clear reason for why it is prioritized.
- **Backburner**:
  - Safely defers ideas so they don't cause mental clutter.
  - Saves a **Context Snapshot** so you can pick them up later without context-switching costs.

### Data Format (`DEFAULT_FOCUS_ITEMS` & `DEFAULT_BACKBURNER`):
```javascript
export const DEFAULT_FOCUS_ITEMS = [
  { title: 'DAB survey paper', category: 'research', why_now: 'June deadline, Dr. Vignesh Kumar is waiting' }
]

export const DEFAULT_BACKBURNER = [
  { title: 'Deskimon', why_deferred: 'Protecting IP, need more time', context_snapshot: 'Physical desk companion pomodoro timer, James Dyson Award candidate' }
]
```

---

## 6. Personal Development Identity (The Compass)
Your overarching identity blocks are visible globally or inside specific dashboard widgets.

- **Eulogy**: Your long-term vision of how you want to be remembered (Versioned and timestamped).
- **Clarity Anchor**: A persistent italicized mission statement on your top HUD.
- **Current Chapter**: Tracks your current phase of life (e.g., *"Chapter I: The Foundation"*).

### Data Format (`DEFAULT_EULOGY`, `DEFAULT_CLARITY_ANCHOR`, `DEFAULT_CURRENT_CHAPTER`):
```javascript
export const DEFAULT_CLARITY_ANCHOR = "You hold the steering wheel. Polaris is your GPS."
export const DEFAULT_CURRENT_CHAPTER = "Chapter I: The Foundation"

export const DEFAULT_EULOGY = {
  content: "Anindita Sarker was...",
  version_label: "Original — June 2024",
  written_date: "2024-06-25"
}
```

---

## 7. Pomodoro Timer & Leveling System
The floating widgets and progress metrics keep you focused and reward your effort.

- **Pomodoro Timer**:
  - Fully persistent and double-mount safe.
  - Earn **+1 XP per minute of focus** (e.g., 30 min focus = 30 XP!).
  - Loop mode (∞) keeps alternating between Focus and Break automatically.
  - Link sessions to active Constellation nodes.
- **Level Progression Engine**:
  - Level up as you complete tasks, goals, rituals, and focus sessions!
  - **Levels & XP Gates**:
    1. **Stargazer** (0 XP)
    2. **Apprentice Inventor** (200 XP)
    3. **Circuit Weaver** (500 XP)
    4. **Signal Architect** (1000 XP)
    5. **Renaissance Engineer** (2000 XP)
    6. **Polaris Navigator** (3500 XP)
    7. **Constellation Maker** (5500 XP)
    8. **Da Vinci Inheritor** (8000 XP)
