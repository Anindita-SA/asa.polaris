# Implementation Plan: Universal Task Parking UI, Sidebar Tabs & Canvas Filters

**Target Version:** Polaris v1.2.85  
**Date:** November 10, 2026  
**Status:** Approved by User via /grill-me interview  

---

## 1. Objectives & Overview

Based on user feedback and alignment through the `/grill-me` protocol:
1. **Direct 1-Click Park / Unpark (Pause Button)**:
   - Place a `Pause` icon button directly on every task card/pill (on the 2D canvas, in the sidebar task cards, and in the Details drawer).
   - Styling:
     - Amber when parked (`text-amber-400 bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30`).
     - Subdued outline when active (`text-nova/40 hover:text-amber-400 hover:bg-amber-500/10`).
   - Behavior:
     - Hidden on child subtasks (only parent and standalone tasks can be parked/unparked).
     - Clicking on an active task: 1-click parks the task (cascades to unfinished subtasks for parents, clears `auto` deadlines, preserves `manual` deadlines, sets `quadrant = null`).
     - Clicking on a parked task: 1-click unparks the task (if parent, parent and children return to `inbox`; if standalone, opens unpark modal with date presets and "No date" button).

2. **Expanded Sidebar Tabs (Mobile-Friendly List Views)**:
   - Expand the sidebar tabs to provide full visibility and control over all task states without requiring the 2D canvas:
     - `deployed`: `[Tasks]` (lists all active deployed tasks grouped by quadrant Q1-Q4 with item counts and deploy/retether/done controls).
     - `backlog`: `[Backlog]` (unassigned brain dump capture bin, `quadrant === null` and `status !== 'parked'`).
     - `parked`: `[Parked]` (lists all parked tasks with count badge and 1-click unpark).
     - `completed`: `[Done]` (lists all completed tasks with count badge).
     - `details`: `[Details]` (shows selected task details, with a back button returning to the previous tab).

3. **Top Canvas Toolbar Filter**:
   - In the Matrix Canvas top toolbar (next to Bot, Reminders, Upkeep, Polaris, and Overlook days), add a `Pause` filter button with an active count badge.
   - When toggled ON (`showParkedOnCanvas: true`):
     - Parked tasks render on the 2D quadrant canvas with amber borders/accents.
   - When toggled OFF (default):
     - Parked tasks stay off the 2D canvas plane.
   - State persisted in `localStorage` (`polaris_matrix_show_parked`).

---

## 2. Architecture & File Impacts

| File | Nature of Change |
|---|---|
| `src/lib/matrixNodeFilter.js` | Add `showParked` option: when true, allows `status === 'parked'` tasks to be included on the canvas. |
| `src/lib/matrixNodeFilter.test.js` | Add unit tests verifying `showParked: true` includes parked tasks and `showParked: false` excludes them. |
| `src/components/views/MatrixCanvasView.jsx` | Add `showParkedOnCanvas` toolbar toggle. Add sidebar tabs (`deployed`, `backlog`, `parked`, `completed`, `details`). Add 1-click `Pause` button to canvas cards, sidebar cards, and details drawer. |
| `src/components/views/MatrixCanvasView.test.jsx` | Add unit tests covering the new sidebar tabs, Pause button park/unpark, and canvas toolbar toggle. |
| `package.json` | Bump version to `1.2.85`. |
| `docs/CHANGELOG.md` & `docs/PROGRESS.md` | Document changes, tests, and build evidence. |

---

## 3. Detailed Technical Design

### A. `matrixNodeFilter.js`
Update `filterMatrixNodes`:
```javascript
export function filterMatrixNodes(tasks = [], options = {}) {
  const {
    overlookDays = 7,
    hideReminders = false,
    hidePolaris = false,
    hideUpkeep = false,
    showParked = false
  } = options;
  ...
  // Invariant 3b: Parked tasks are excluded unless showParked is explicitly enabled
  if (!showParked && t.status === 'parked') return false;
```

### B. Sidebar Tabs in `MatrixCanvasView.jsx`
Tabs:
- `activeBrainDumpTab`: `'tasks' | 'backlog' | 'parked' | 'completed' | 'details'`
- Tab Buttons:
  1. `[Tasks / Deployed]` (Grid icon, count = `deployedTasks.length`)
  2. `[Backlog]` (Inbox icon, count = `activeBrainDumpTasks.length`)
  3. `[Parked]` (Pause icon, count = `allParkedTasks.length`)
  4. `[Done]` (CheckCircle2 icon, count = `completedTasks.length`)
  5. If a task is selected: `[Details]` (FileText icon)

### C. 1-Click Pause Button on Cards
On each task card:
```jsx
{!task.parent_task_id && (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      handleTogglePark(task);
    }}
    className={`p-1 rounded transition-colors ${
      task.status === 'parked'
        ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30'
        : 'text-nova/40 hover:text-amber-400 hover:bg-amber-500/10'
    }`}
    title={task.status === 'parked' ? "Unpark Task" : "Park Task"}
  >
    <Pause className="w-3.5 h-3.5" />
  </button>
)}
```

`handleTogglePark(task)`:
- If `task.status === 'parked'`:
  - If parent: call `handleUnparkParent(task, 'inbox')`.
  - If standalone: open `setUnparkModalTask(task)`.
- If `task.status !== 'parked'`:
  - If parent: call `handleParkParent(task)`.
  - If standalone: call `updateTaskField(task.id, 'status', 'parked')`.

---

## 4. Verification & Testing

1. `npx vitest run src/lib/matrixNodeFilter.test.js`
2. `npx vitest run src/components/views/MatrixCanvasView.test.jsx`
3. `npm test` (verify 100% pass across all test suites)
4. `npm run check:schema` (0 errors, 0 warnings)
5. `npm run build` (clean production build)
6. Verify 0 em dashes, 0 en dashes, and 0 CSS gradients across all touched files.
