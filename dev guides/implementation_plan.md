# Polaris Feature Implementation Plan (Version II)

This document outlines the engineering step-by-step implementation plan for the upcoming Polaris feature expansions, fully designed for a seamless, ergonomic, and highly motivating workspace.

---

## Proposed Changes

### Component 1: Endless Leveling Engine & 200-Level Compact Curve
* **Files:** [defaults.js](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/data/defaults.js) · [ProgressDashboard.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/ProgressDashboard.jsx)
* **Modifications:**
  1. Replace legacy fixed `LEVEL_NAMES` array with the 20 Rank Titles array (each spanning 10 levels up to Level 200).
  2. Implement the Gently Scaling Compact Quadratic formula: $\text{XP} = 15 \times L^2$.
  3. Update `getLevelInfo` to calculate Rank and Grade dynamically (e.g. `Circuit Weaver, Grade 8`).

---

### Component 2: Togglable Repeating Daily Tasks
* **Files:** [DailyTasks.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/journal/DailyTasks.jsx)
* **Modifications:**
  1. Add a small toggleable "Loop" icon next to each target task representing `recurring` status.
  2. On load (`fetchTasks`), check if tasks for `dateStr` are empty. If so, query for any active repeating tasks from prior dates and auto-clone them forward as unchecked fresh tasks for `dateStr`.

---

### Component 3: Campaign vs. Side Quests Integration
* **Files:** [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx) · [defaults.js](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/data/defaults.js)
* **Modifications:**
  1. **Dual Structure:** Implement two distinct categories for goals: **Campaign Goals** (parent-linked, core academic/career targets) and **Side Quests** (standalone personal, creative, cooking, and curiosity targets).
  2. **Side Quests Guild:** Add a gamified tab or section in `GoalsPanel` labeled "Side Quests" to track standalone curiosity tasks with custom playful compass badges.

---

### Component 4: Spatial Drill-Down (Zoom-Out to Zoom-In Sync)
* **Files:** [Dashboard.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/pages/Dashboard.jsx) · [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx)
* **Modifications:**
  1. **Node Filtering:** Establish a communication link between the spatial Constellation Node Map (the Zoomed-Out Map) and the Goals/Timeline lists (the Zoomed-In Deck).
  2. **Drill Down:** Clicking any star on the Constellation Map filters your actionable goals and timelines to show only the items linked to that star.

---

### Component 5: "Whispering" Context Layers (Expandable Accordion)
* **Files:** [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx)
* **Modifications:**
  1. Add a subtle, sleek "Info" icon to each goal card.
  2. Clicking it expands an accordion revealing your custom **Why-Now Context, Guiding Quotes, or Creative Descriptions**. This keeps your mental/emotional anchors always accessible without cluttering your daily space.

---

### Component 6: Goal Editing & Simplified Linking
* **Files:** [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx)
* **Modifications:**
  1. **Goal Edit Modal:** Add an elegant "Edit (Pen)" button to each goal card. Clicking it opens an Edit Modal pre-filled with the goal's current title, target, unit, deadline, parent linkage, and XP reward.
  2. **Database Update:** Saving edits invokes `supabase.from('goals').update(...)` for immediate persistence, updating state optimistically.
  3. **Simplified Parent Selection:** The parent-selection dropdown will only show relevant goals from the immediate higher scope and feature a clean `"No parent (Independent Solo Mission)"` option for effortless unlinking/editing.

---

### Component 7: Unified Goal-Timeline Map
* **Files:** [Timeline.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/panels/Timeline.jsx)
* **Modifications:**
  1. Update the timeline query to fetch both master milestones and any created goals where `deadline` is populated.
  2. Sort them chronologically to render a single, continuous, glowing roadmap.

---

### Component 8: Fixed AI Timeline Step Generator (JSON Mode Schema Fix)
* **Files:** [Timeline.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/panels/Timeline.jsx)
* **Modifications:**
  1. **The Bug:** Passing `{ type: 'json_object' }` in `response_format` to Groq while requesting a flat JSON array causes API schema violations or errors out completely.
  2. **The Fix:** Rewrite `systemPrompt` to explicitly request a valid JSON object with a single `"steps"` key containing the string array (e.g., `{ "steps": ["step 1", "step 2"] }`).
  3. **Robust Parsing:** Update parsing logic to cleanly unpack `parsed.steps` to guarantee 100% successful step generations.

---

### Component 9: AI Goal Alignment Auditor
* **Files:** [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx)
* **Modifications:**
  1. Add an `AUDIT GOALS` button that gathers the active goal tree (including updated targets, units, deadlines, and parent links) and invokes Groq (`llama-3.3-70b-versatile`).
  2. Configure the prompt with the "Star-Map" hybrid algorithm (SMART for short-term, HARD for long-term) to analyze the metrics, linkages, and deadlines, providing scannable constructive critique and heartfelt strategy validation.

---

### Component 10: Google Calendar Sync & Workload Estimator
* **Files:** [GoalsPanel.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/GoalsPanel.jsx)
* **Modifications:**
  1. Add a "Sync to GCal" button next to daily goals/tasks.
  2. Clicking it opens a Google Calendar Quick Add URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...`) pre-populated with titles, estimated workload durations, and parent goal details.

---

### Component 11: Integrated Pomodoro Audio Player
* **Files:** [PomodoroTimer.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/PomodoroTimer.jsx) · [HUD.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/layout/HUD.jsx)
* **Modifications:**
  1. Delete/unmount the standalone, floating `MusicPlayer.jsx` widget from the main workspace to reclaim screen real estate.
  2. Integrate a small, subtle Play/Pause button and an ambient track dropdown (Lofi, White Noise, Rain) into the footer of the `PomodoroTimer` widget. Auto-pause focus music when the timer ends.

---

### Component 12: Rebuilt Pomodoro I/O System (Ground-Up Overhaul)
* **Files:** [PomodoroTimer.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/widgets/PomodoroTimer.jsx)
* **Modifications:**
  1. **Accrued Logging:** Calculate session duration in real-time. Add a tactile **"Log Accrued Minutes"** button so users can save their work (e.g., 18 mins out of 25) even if they stop early or pause.
  2. **Unified Categories Dropdown:** Replace the custom text input in Pomodoro with a dropdown that dynamically mirrors the global `INPUT_CATEGORIES` (reading, lecture, video...) or `OUTPUT_CATEGORIES` (writing, coding, building...) depending on the toggle. This ensures perfect synchronization with the `IOBalanceBar`.
  3. **Visual Sliding Toggle:** Build a gorgeous glassmorphic sliding toggle representing Input vs Output with vibrant glowing borders (Amber for Input, Emerald for Output).

---

### Component 13: Media Reading & Watch List (Under Curriculum)
* **Files:** [Curriculum.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/panels/Curriculum.jsx)
* **Modifications:**
  1. **The Media Tab:** Add a fourth gorgeous, golden tab to `NODE_TABS` labeled `{ id: 'Media', label: 'Media & Reading', color: '#f59e0b' }`.
  2. **Pre-seeded Chapters:** Seed default category chapters (`Books 📖`, `Movies 🎬`, `Shows 📺`) under the Media category if empty.
  3. **Premium Entry Form:** When adding items under Media, provide an elegant form utilizing the existing `description` database field to capture **Dated Entries** (Target/Completed Date), **Mini Context Notes**, and **Star Ratings** (1-5 stars represented as beautiful `⭐⭐⭐⭐⭐` glyphs).
  4. **The Watchlist View:** Render media items with custom icon representations (book, film, tv) and their dates/ratings cleanly on the card, creating a premium personal Letterboxd/Goodreads directly inside your life guide.

---

### Component 14: Reverted AI Fitness Coach XP
* **Files:** [FitnessBridge.jsx](file:///e:/Academic%20files/Competiton%20and%20Project%20files/Polaris/asa.polaris/src/components/panels/FitnessBridge.jsx)
* **Modifications:**
  1. Completely remove `addXP` call and references to numeric XP rewards from the Groq coach prompt and completion logs.
  2. Keep the AI focused purely on warm, sincere, and sentimental support.

---

## Verification Plan
1. **Ranks & XP:** Check that `useAuth` calculates dynamic titles correctly based on total XP.
2. **Repeating Tasks:** Create a repeating daily task, swap dates, and confirm it clones forward as unchecked.
3. **Hierarchical Goals:** Create a daily goal, link it to a weekly parent, and verify the path displays under the card.
4. **Goal Editing:** Click Edit on a goal, update title, target, unit, and parent link, verify local state and database update.
5. **AI Auditor:** Trigger a goal audit and confirm Groq returns formatted SMART/HARD strategy feedback.
6. **AI Timeline Steps:** Select a milestone, click "Generate Steps" using Groq, and confirm 5-8 steps are perfectly populated and saved.
7. **GCal Sync:** Click "Sync to GCal" and confirm it successfully opens Google Calendar with a pre-formatted slot.
8. **Pomodoro Audio:** Toggle ambient audio during a Pomodoro session and verify it pauses on completion.
9. **Pomodoro I/O Overhaul:** Toggle between Input and Output, select a standard category, log early, and confirm the `IOBalanceBar` immediately reflects the minutes.
10. **Spatial Drill-Down:** Click a node on the Constellation Map and confirm Goals/Timeline display filtered items properly.
11. **Media Watchlist:** Add a Book or Show in the Media tab, specify a completed date, personal context note, and 5-star rating. Confirm it displays beautifully.
