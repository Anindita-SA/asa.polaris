# Task Matrix & 2D Canvas

## Overview
The Task Matrix provides an interactive spatial Eisenhower Matrix that maps tasks across Urgency (X axis) and Importance (Y axis). It separates unorganized captures from active planning using an integrated Brain Dump drawer and provides automated triage capabilities.

## Core Components

### 1. Spatial 2D Canvas
- **Four Quadrants**:
  - `urgent_important` (Q1: Do First - crisis, immediate deadlines)
  - `not_urgent_important` (Q2: Schedule - strategic development, research, health)
  - `urgent_not_important` (Q3: Delegate / Batch - interruptions, administrative tasks)
  - `not_urgent_not_important` (Q4: Eliminate - low-value clutter)
- **Continuous Coordinates**:
  - Drag tasks anywhere on the canvas to update both quadrant tags and continuous X/Y coordinates (`canvas_x`, `canvas_y`).
- **Next-Action Hierarchy**:
  - Parent tasks surface their immediate active subtask directly on the canvas card.
  - Completing the active subtask automatically pulls forward the next queued step.

### 2. Brain Dump & Capture Drawer
- **Zero-Friction Intake**: Tasks captured without quadrant designation land in the backlog tray (`quadrant === null`).
- **Filter Decoupling**: Backlog remains unfiltered by presentation toggles so ideas are never hidden or lost.
- **Task Parking**: Any task can be parked (`status = 'parked'`), removing it from active canvas quadrants while keeping it safely stored in the backlog.

### 3. Automated Task Triage
- Background triage analysis assigns initial quadrants to unassigned tasks based on title, category, and deadline proximity.
- Protects parked tasks and respects the 14-day overlook window so distant tasks do not flood the active daily view.

