# Today's Agenda Widget - Technical Implementation Plan

## Goal Description
Build an ADHD-friendly, interactive **TodayAgendaWidget** mounted as the very first section in the Day Brief view (`DayBriefView.jsx`), replacing the legacy empty "Today's Agenda" container.

The widget enables:
1. **Drag-and-Drop Reordering**: Visual drag handles using existing `framer-motion` (`Reorder.Group` / `Reorder.Item`) to rank today's top priorities without external libraries.
2. **Parent Task & Subtask Awareness**: Primaries support both standalone tasks and umbrella/parent tasks (`parent_task_id = null` with child subtasks), displaying child completion ratios.
3. **Cosmetic Day Slice (Task Alias)**: Tap/click on any task title to set a day-specific phrasing (e.g., "Just read 2 pages") without modifying the master task title in the database.
4. **Passive Time-Block Checkboxes (15m / 30m)**: Visual clickable time chips that insert completed focus blocks directly into `pomodoro_logs` upon clicking, awarding XP and registering focus minutes without requiring an active timer.
5. **Interactive Completion**: Instant task check-off via `toggleComplete()` with success chimes and XP.
6. **Task Triage Path Alignment**: Update `scripts/task_triage.js` so tasks tagged `#polaris` compile to `docs/plannedfeatures.md` instead of `docs/_FEATURE_PROPOSALS.md`.
7. **Git Push Pre-Flight**: Batch these additions with existing unpushed commits into version `v1.2.55`.

---

## User Review Required

> [!IMPORTANT]
> **No Database Migrations Required**:
> - Reordering uses the pre-existing nullable `tasks.sort_order` column (`int4`).
> - Time-block tracking writes standard rows into the existing `pomodoro_logs` table (`user_id`, `date`, `duration_minutes`, `label`, `created_at`).
> - Cosmetic Day Slices are stored in browser `localStorage` keyed by `polaris_day_alias_<YYYY-MM-DD>_<taskId>` to ensure the canonical task title in Supabase is never altered or corrupted.

> [!NOTE]
> **Daily Cap Discipline Enforced**:
> The widget enforces `.agent/rules/task-scheduling-discipline.md` by capping the active Primaries list to **max 3 primary tasks** for the current day. Quick wins (<15m / low mental load) are rendered in a distinct secondary group.

---

## Open Questions
None. The architecture strictly follows confirmed constraints: zero new npm dependencies, existing Supabase schema, and local day-slicing.

---

## Proposed Changes

```
src/
├── components/
│   ├── widgets/
│   │   └── TodayAgendaWidget.jsx         [NEW]
│   └── views/
│       └── DayBriefView.jsx              [MODIFY]
├── hooks/
│   └── useTodaysTasks.js                 [MODIFY]
scripts/
└── task_triage.js                        [MODIFY]
```

---

### Component: `useTodaysTasks.js`

#### [MODIFY] `src/hooks/useTodaysTasks.js`
- Expose `sort_order`, `parent_task_id`, `deadline`, and `mental_load` on the mapped task objects.
- Sort active matrix tasks primarily by `sort_order ASC` (when set), falling back to `created_at ASC`.
- Add an `updateSortOrder(taskId, newOrder)` callback using `offlineUpdate('tasks', { id: taskId }, { sort_order: newOrder })`.

```javascript
// Expose fields in matrixMapped
const matrixMapped = activeMatrixTasks.map(m => ({
  id: m.id,
  title: m.title,
  completed: m.status === 'done',
  estimated_minutes: m.estimated_minutes,
  time_estimate_minutes: m.time_estimate_minutes,
  mental_load: m.mental_load,
  quadrant: m.quadrant,
  deadline: m.deadline,
  parent_task_id: m.parent_task_id,
  sort_order: m.sort_order ?? null,
  notes: m.notes,
  __type: 'matrix_task',
  raw: m
}))
```

---

### Component: `TodayAgendaWidget.jsx`

#### [NEW] `src/components/widgets/TodayAgendaWidget.jsx`
A dedicated, glassmorphic widget component containing:
1. **Header**:
   - Title: `Today's Agenda` with icon and today's date formatted.
   - Timeblock size toggle: `[15m | 30m]` stored in `localStorage`.
   - Focus minutes logged today counter: aggregated count of minutes logged today from widget chips.
   - Quick Add toggle (`+` button).
2. **Primaries Section**:
   - Rendered using `<Reorder.Group axis="y" values={primaries} onReorder={handleReorder}>`.
   - Each item is `<Reorder.Item key={task.id} value={task}>`.
   - Drag handle: `GripVertical` icon.
   - Title & Cosmetic Day Slice:
     - Shows cosmetic alias if saved in `localStorage`; otherwise shows master task title.
     - Single click or tap on edit pencil enters inline editing.
     - Enter/Blur saves alias to `localStorage` (`polaris_day_alias_<date>_<id>`).
     - Escape cancels.
     - Never mutates master task title in Supabase.
   - Parent / Subtask Badge:
     - If task is a parent task: displays `Parent (X/Y subtasks completed)`.
     - If task is a child: displays `Subtask of: <Parent Title>`.
   - Time-Block Checkboxes:
     - Renders chips (e.g., 4 x 15m or 2 x 30m for a 60m task).
     - Clicking a chip:
       - Fills with amber highlight.
       - Calls `offlineInsert('pomodoro_logs', { user_id, date: todayStr, duration_minutes: chipMinutes, label: activeTitle, created_at: new Date().toISOString() })`.
       - Calls `trackXP(false, true, 10)` and `playChime('success')`.
       - Saves chip state in `localStorage` (`polaris_timeboxes_<date>_<taskId>`).
       - Aggregates immediately into daily focus total.
   - Task Completion Button:
     - Circular check button on right edge.
     - Calls `toggleComplete(task, e)` with sound and XP.
3. **Quick Wins Section**:
   - Secondary collapsible block for tasks under 15m or low mental load.
   - Single timebox chip + completion toggle.
4. **Quick Task Add Input**:
   - Simple glass input to add an ephemeral daily task for today via `addTask(title)`.

---

### Component: `DayBriefView.jsx`

#### [MODIFY] `src/components/views/DayBriefView.jsx`
1. Import `TodayAgendaWidget` from `../widgets/TodayAgendaWidget`.
2. Insert `<TodayAgendaWidget />` directly at line 399, immediately below the `GENERATE BRIEF` button and above `{oppItems.length > 0 && (`.
3. Remove the legacy lines 640-654 (`<div className="glass border border-amber-500/30 rounded-xl p-6 space-y-4">...Today's Agenda...</div>`) which only displayed empty `dailyGoals`.

---

### Script: `task_triage.js`

#### [MODIFY] `scripts/task_triage.js`
- Line 896: Change export path from `docs/_FEATURE_PROPOSALS.md` to `docs/plannedfeatures.md`.
- Ensure output formatting remains clean and aligned with project docs.

---

## Verification Plan

### Automated Tests
1. **Vitest Unit Tests**:
   - Run existing test bench: `npm test -- --run`.
   - Ensure all 32 test suites (338 tests) continue passing with zero regressions.
2. **New Widget Test**:
   - Create `src/components/widgets/TodayAgendaWidget.test.jsx`.
   - Test rendering of primaries, timebox chip click triggering `offlineInsert('pomodoro_logs')`, inline alias editing in `localStorage`, and drag reorder handler.
3. **Production Build**:
   - Run `npm run build`.
   - Verify clean Vite compilation and service worker precache generation with zero errors.

### Manual Verification
1. Open the app in browser (`http://localhost:5173`).
2. Navigate to Day Guide -> Brief sub-tab (`brief`).
3. Verify `Today's Agenda` is the first element visible below the header.
4. Drag a task up or down; verify smooth animation and order persistence.
5. Tap on a task title, change it to a cosmetic alias, reload the page, and verify the alias persists while the task in the database retains its original name.
6. Click a `15m` or `30m` timebox chip; verify chime plays, chip turns amber, and a new record appears in `pomodoro_logs`.
7. Click the circular checkmark; verify the task marks done.
8. Run `node scripts/task_triage.js` and verify `docs/plannedfeatures.md` is populated.
