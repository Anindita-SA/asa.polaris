# Polaris UX Wireframe & Application Flow

This document maps out the high-level user experience (UX), layout structure, and navigation flows of the Polaris application. Update this whenever major UI/UX changes occur.

## 1. Global Shell & Navigation
The application uses a persistent global shell wrapped around the main content area.

- **Background:** Dynamic, starry "void" background (`#030712`) with subtle animated stars to create a deep, spatial feel.
- **Top Navigation Bar (HUD.jsx):**
  - **Left:** Polaris Logo + Current User Identity/Chapter (e.g., "Artist trapped in engineering hell. Chapter I: The Foundation").
  - **Center:** Main View Tabs
    - `Constellation` (Spatial Node Map)
    - `Focus` (Active goals & Pomodoro)
    - `Progress` (Analytics & Milestones)
    - `Goals` (Campaign & Side Quests)
    - `Timeline` (Chronological task/goal view)
    - `Journal` (Habits, eulogies, and highlights)
    - `Calendar` (GCal integration placeholder)
    - `Curriculum` (Educational library & Media log)
    - `Fitness` (Aloka-Fit Bridge)
  - **Right:** Leveling Engine HUD (Rank Title, XP Bar, Level Indicator). Clickable to open `StatsModal`.

## 2. Core Views

### A. Constellation (Node Map)
- **Concept:** A visual, 2D panning/zooming spatial map of your life domains.
- **UX:** Nodes (circles) represent broad life areas (e.g., Career, Health). Clicking a node filters the `Goals` and `Timeline` to show only items linked to that specific node.

### B. Curriculum (The Bookshelf)
- **Layout:** `max-w-4xl mx-auto` container.
- **Top:** 4 Main Category Cards (Career, Academic, Self, Media & Lit) acting as filters.
- **Middle (The Shelf):** A single-row, horizontally scrolling bookshelf.
  - Books have a 3D effect: They lift `translateY` and `scale` on hover.
  - Clicking a book triggers a 3D `rotateY` page-flip animation and transitions to the `CurriculumView`.
- **Drill-down (CurriculumView):** 
  - Centered `max-w-2xl mx-auto` layout.
  - Circular XP/Progress Donut Chart at the top.
  - **Syllabus:** List of checkable topics. Clicking "Start Here" links to the Pomodoro timer.
  - **Resources Dropdown:** Expandable accordion below the syllabus containing linked books, videos, and articles.

### C. Goals Panel (Campaign vs. Side Quests)
- **Tabs:** "MAIN CAMPAIGN" vs "SIDE QUESTS".
- **Time Scopes:** Filters for Daily, Weekly, Monthly, Quarterly, Yearly, 5-Year.
- **Goal Cards:** 
  - Display progress bars filled dynamically based on `current` / `target` metrics.
  - Expandable "Whispering Context" accordion (`Info` icon) to reveal the "Why-Now" reasoning.
  - +/- steppers to increment progress directly on the card.
- **AI Auditor:** "AUDIT GOALS" button triggers an LLM analysis of the current list, returning constructive, coach-like feedback.

### D. Focus / Pomodoro Timer
- **Centerpiece:** Large, circular countdown timer.
- **Controls:** Play/Pause, reset, skip.
- **Task Linkage:** Dropdown to bind the current session to a specific Curriculum topic or Goal.
- **Footer:** Ambient sound mixer (Lofi, White Noise, Cafe) that auto-pauses when the timer stops.

### E. Fitness Bridge (Aloka-Fit Integration)
- **Concept:** A dashboard specifically for syncing external logs from your `aloka-fit` database.
- **Layout:**
  - **Top:** AI Coach Verdict panel (Generates 14-day analysis using LLM).
  - **Metrics:** 3-card summary (Total Workouts, Meals Logged, Latest Weight/Delta).
  - **Lists:** Clean, scannable lists showing the most recent entries for Workouts, Meals, and Weight.

### F. Journal & Timeline
- **Timeline:** A vertical, chronological spine showing upcoming deadlines, sorted by date.
- **Journal:** A space for daily reflections, habits (`MonthlyHabitGrid`), and macro-level "Eulogy" values.

## 3. Persistent Elements & Modals

- **StatsModal (Triggered via Top Right XP Bar):**
  - Dark glassmorphic overlay.
  - Shows current level, precise XP needed for the next rank, and an ASCII-style "Ascension Path" roadmap.
- **I/O Balance Bar (Bottom Fixed / Widget):**
  - Tracks "Input" (learning, reading) vs "Output" (creating, coding).
  - Displays an equilibrium gauge. Reaching perfect balance awards bonus XP.
