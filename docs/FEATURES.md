# Polaris Features Catalog

Polaris is a comprehensive personal productivity and life-management RPG system. This catalog serves as the master index to detailed technical specifications and guides for each core capability.

---

## Core Systems & Modular Documentation

### 1. [The Constellation Graph](features/constellation_graph.md)
An interactive 2D/3D celestial canvas that maps life architecture into connected nodes. Supports nested domains, spring physics simulations, and AI-powered task breakdowns to turn abstract vision into concrete physical actions.

### 2. [Focus Board & Backburner](features/focus_board.md)
A high-discipline prioritization engine that caps active work at a strict maximum of 3 concurrent initiatives. Includes a structured Backburner to capture rich context snapshots and preserve deferred ideas without cognitive clutter.

### 3. [Task Matrix & 2D Spatial Canvas](features/task_matrix.md)
A 2D spatial Eisenhower Matrix with continuous coordinates and an integrated Brain Dump capture bin. Supports multi-level next-action subtask drilldowns, automated background triage, and universal task parking.

### 4. [Day Guide & Today Agenda](features/day_guide.md)
The primary daily execution dashboard. Enforces the 3-primary task cap to prevent cognitive overload, coordinates timeboxed Pomodoro check-off blocks, runs loop-detection guards, and includes a gamified Surprise Me dice-roll task selector.

### 5. [Morning Brief & Opportunity Scout](features/morning_brief_scout.md)
An automated morning intelligence pipeline. Uses Supabase Edge Functions to deliver 3 curated positive climate/tech stories across 6 rotating pillars with a 5-day anti-repeat engine, alongside verified grants, fellowships, and hardware competition opportunities.

### 6. [Pomodoro Timer & Leveling System](features/pomodoro_leveling.md)
A timebox and task duration measurement engine paired with a lifelong 200-level quadratic leveling curve. Features an Always-on-Top Document Picture-in-Picture floating widget, wall-clock drift protection, 20 distinct rank tiers, and periodic sweep bonus awards.

### 7. [Daily Rituals & Journal](features/daily_rituals_journal.md)
Morning, anytime, and evening habit stacks that award immediate XP and streak tracking. Complemented by daily reflection prompts, offline-first Dexie synchronization, and an interactive Year in Pixels mood tracker.

### 8. [Curriculum & Media Log](features/curriculum_media.md)
A personal technical curriculum tracker covering foundational and applied engineering disciplines. Includes a structured Practice Score Tracker for standardized mock exams and an automated scholarly metadata scraper (arXiv, Crossref, OpenAlex).

### 9. [Reach Out Personal CRM & Nudges](features/reachout_crm.md)
A relationship health manager organized across concentric intimacy rings (Hearth, Parlour, Porch, Yard). Tracks reachout cadences, highlights overdue connections, and fires gentle recurring background reminders using the Web Push Service Worker.

### 10. [Fitness Bridge](features/fitness_bridge.md)
Strength training set logger, nutrition tracker with calibrated macro estimates, weight and body composition trend analysis, and an empathetic AI mentor coach.

---

## Active Implementation Plans

Active feature roadmaps and in-flight implementation plans are maintained in [`docs/plans/`](plans/):
- [`docs/plans/task_timer.md`](plans/task_timer.md): Task timer and duration measurement engine with Document PiP and overtime guards.
- [`docs/plans/morning_brief_tuning.md`](plans/morning_brief_tuning.md): Morning brief news scout and anti-repeat frequency tracking.
- [`docs/plans/task_parking.md`](plans/task_parking.md): Universal task parking and triage immunity.
- [`docs/plans/task_timer_search.md`](plans/task_timer_search.md): Task search and selection directly within the floating timer widget.
- [`docs/plans/scout_category_tracker.md`](plans/scout_category_tracker.md): Scout category balance tracker and quota controls.
