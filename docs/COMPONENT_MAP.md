# Component Map

This document outlines the React component hierarchy of Polaris.

## Core Hierarchy
```text
Dashboard (Main Entry)
├── HUD (Top Bar Navigation)
├── BottomNav (Mobile Navigation)
└── Active Tab Renderer
```

## Tabs & Panels
- **Constellation Tab**: `ConstellationGraph` (D3 visualizer), `NodePanel` (Editing nodes/subtasks).
- **Focus Tab**: `FocusBoard` (Workspace), `PomodoroTimer`.
- **Progress Tab**: `ProgressDashboard` (Leveling/XP UI), `IOBalanceBar` (Stats).
- **Goals Tab**: `GoalsPanel` (Multi-scope tracking).
- **Timeline Tab**: `Timeline` (Milestone rendering).
- **Journal Tab**: `Journal` (Logs), `DailyRitual` (Checklists), `DailyTasks`, `YearInPixels`.
- **Calendar Tab**: `CalendarView` (GCal sync integration).
- **Curriculum Tab**: `CurriculumView`, `CurriculumShelf`, `MediaLog`, `TopicCard`.
- **Orbit Tab**: `RelationshipsView`, `FitnessBridge`, `PlayView`.

## Modals
- `StatsModal`: In-depth breakdown of XP.
- `AddMediaModal`: Form for adding items to the Curriculum.
- `SurpriseTaskModal`: Random task picker.

## Widgets
- `MusicPlayer`: Handles background Lofi tracks.
- `PomodoroTimer`: Global timer hook.
