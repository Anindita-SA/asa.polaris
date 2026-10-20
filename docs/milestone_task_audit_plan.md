# Milestone Architecture Overhaul & Matrix Hierarchy Alignment Plan

## 1. Executive Summary & Goals

This plan establishes a seamless, unified hierarchy between **Milestones** and the **Task Matrix**:
1. **The Task Matrix is the Primary Engine**: Milestones are calendar anchors and hard deadlines that map directly into the Matrix.
2. **One Milestone = One Parent Project Card**: Every active milestone gets represented as exactly one Canonical Parent Task in the Matrix with its deadline and `milestone_id`.
3. **Subtasks Live Inside Parents**: All steps created via AI breakdown, manual subtask addition, or task intake are strictly nested under their Parent Project card (`parent_task_id = parent.id`) with `quadrant: null`. They **never** become independent root cards on the matrix plane.
4. **14-Day Overlook Protection**: Milestone Parent Cards appear on the active 2D Canvas only when their deadline is within the Overlook window (default 14 days). Milestones beyond 14 days reside in an "Upcoming Milestones" drawer in the Brain Dump.
5. **Exact + Semantic Audit Reconciliation**: An audited reconciliation script will analyze the existing 108 unparented tasks, connect loose subtasks to their canonical parent projects, and generate a dry-run report before updating Supabase.
6. **Milestone Foreign Key Stability**: Replace the destructive delete-and-reinsert pattern in `scripts/sync_milestones.js` with an idempotent upsert to keep `tasks.milestone_id` references stable.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------------+
|                        Supabase Database                          |
|                                                                   |
|   milestones table                      tasks table               |
|   +---------------+                     +----------------------+  |
|   | id (UUID)     |<------+             | id (UUID)            |  |
|   | title         |       |             | title                |  |
|   | deadline      |       +-------------| milestone_id (FK)    |  |
|   | status        |                     | parent_task_id (FK)  |--+ (Self-ref)
|   +---------------+                     | quadrant             |  |
|                                         | deadline             |  |
|                                         +----------------------+  |
+-------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------+
|               Matrix Node Filter (matrixNodeFilter.js)            |
|                                                                   |
|  * Root Canvas Node: parent_task_id === null AND quadrant !== null|
|  * Child Subtask:    parent_task_id !== null (RENDERED INSIDE     |
|                      PARENT CARD, NEVER ON ROOT CANVAS)           |
|  * 14-Day Overlook:  Parent Card visible if deadline <= 14 days   |
|                      Far-future parents stay in Overlook drawer   |
+-------------------------------------------------------------------+
```

---

## 3. Detailed Component Plan

### Component A: Milestone Sync Script Stability
* **Target File**: `scripts/sync_milestones.js`
* **Changes**:
  * Remove `await supabase.from('milestones').delete().eq('user_id', userId)` (lines 284-289).
  * Implement an idempotent upsert:
    1. Fetch existing milestones for `userId`.
    2. Match canonical milestones by normalized title.
    3. Update changed fields (deadline, xp_reward, note, status) on existing rows while preserving their `id`.
    4. Only insert genuinely new milestones.
  * This guarantees `tasks.milestone_id` foreign keys are never broken or orphaned.

---

### Component B: Frontend Timeline Panel Overhaul
* **Target File**: `src/components/panels/Timeline.jsx`
* **Changes in `saveSubtasks` & `addManualSubtask` (lines 198-230)**:
  1. **Find or Create Milestone Parent Card**:
     - Check if a Parent Task already represents this milestone (`t.milestone_id === breakdownTarget.id && !t.parent_task_id` or matching title).
     - If an existing parent task is found, use its `id` as `parent_task_id` for all generated subtasks.
     - If none exists, create ONE parent task for this milestone in the matrix:
       ```javascript
       const parentId = crypto.randomUUID();
       await offlineInsert('tasks', {
         id: parentId,
         user_id: user.id,
         milestone_id: breakdownTarget.id,
         title: breakdownTarget.title,
         deadline: breakdownTarget.deadline,
         status: 'active',
         quadrant: 'important_not_urgent',
         category: 'academic',
         created_at: new Date().toISOString()
       });
       ```
  2. **Audit Subtask Duplicates**:
     - Check existing tasks under `parentId` to skip any step that already exists with the same title.
  3. **Strict Subtask Nesting**:
     - Insert child steps with:
       - `parent_task_id: parentId` (ensures nesting)
       - `quadrant: null` (ensures child does not render as an independent root node)
       - `milestone_id: breakdownTarget.id`
       - `status: 'active'`
  4. **Task Attachment**:
     - Add an "Attach Existing Task" selector in the milestone breakdown view, allowing you to select an existing matrix task and assign `milestone_id: breakdownTarget.id`.

---

### Component C: Matrix Canvas & Overlook Integration
* **Target Files**:
  * `src/lib/matrixNodeFilter.js`
  * `src/components/views/MatrixCanvasView.jsx`
* **Changes**:
  1. **Milestone Badge on Parent Project Cards**:
     - When a parent project card has a linked `milestone_id`, display a clean milestone indicator badge with its deadline countdown on the card.
  2. **14-Day Overlook Enforcement**:
     - Ensure parent cards with deadlines beyond the 14-day overlook window are filtered into the "Upcoming Milestones" / Overlook tray in the Brain Dump sidebar rather than cluttering the active canvas.
  3. **Milestone Filter in Brain Dump / Matrix**:
     - Add a milestone filter pill in the Brain Dump header to filter tasks and projects by linked milestone (e.g., "Sweden Portal", "NPTEL", "TU Delft").

---

### Component D: Task Intake Engine & Weekly Audit Refactoring
* **Target Files**:
  * `scripts/lib/task_intake_engine.js`
  * `scripts/weekly_audit.js`
* **Changes**:
  1. **Audit-First Gap Detection**:
     - Before generating tasks, query `tasks` to count active tasks linked to each upcoming milestone (`milestone_id`).
     - If a milestone has active tasks, do not generate duplicate generic tasks.
     - If a milestone is unaddressed (0 linked tasks), report it as a gap in the audit report.
  2. **Dynamic Parent Matching**:
     - Replace the static 6-project list with dynamic queries of active parent tasks in the database.
     - When subtasks are generated for a milestone, strictly assign `parent_task_id` to that milestone's parent card with `quadrant: null`.

---

### Component E: Audited Reconciliation & Migration Script
* **Target File**: `scripts/audit_and_nest_milestone_tasks.js` [NEW]
* **Workflow**:
  1. **Phase 1: Analysis & Matching**:
     - Scan all 37 milestones and 189 tasks.
     - Map existing parent project tasks to milestones (e.g. "Agri Solar Energy Survey Paper" <-> "Agri Solar Survey Paper: Phase 1 & 2").
     - Identify loose subtask fragments that belong under parent projects (e.g. "Search for charts related to Agri Solar", "Write 3 bullet points for portfolio").
     - Identify unaccounted milestones that have zero parent tasks or subtasks.
  2. **Phase 2: Dry Run Mode (`--dry-run`)**:
     - Print a detailed table of proposed actions:
       - Which existing parent tasks will be linked to milestones.
       - Which loose tasks will be reparented under parent projects.
       - Which new parent project cards will be created for unaccounted milestones.
     - Output the report to the terminal and `docs/milestone_reconciliation_report.md`.
  3. **Phase 3: Execution (`--apply`)**:
     - Execute the updates safely in Supabase with transaction logging.

---

## 4. Verification & Testing Strategy

### Automated Verification
* `npm test`: Run complete test suite (27 test suites, 292 tests)
* `npm test src/lib/matrixNodeFilter.test.js`: Verify root node and subtask invariants
* `npm run build`: Verify production bundle builds cleanly with zero errors

### Manual & Interactive Verification
1. Run `node scripts/audit_and_nest_milestone_tasks.js --dry-run` and inspect the output.
2. Run `npm run dev` and navigate to `MatrixCanvasView`:
   - Verify that loose milestone tasks are no longer scattered as floating parent cards.
   - Verify that Milestone Parent Cards display with child subtasks cleanly nested inside.
   - Verify that milestones beyond 14 days do not overwhelm the active canvas.
3. Open `Timeline` panel:
   - Run AI breakdown on a milestone.
   - Confirm that child steps appear inside the milestone's parent card and do not create independent root matrix nodes.

---

## 5. Execution Order

1. **Step 1**: Implement `scripts/sync_milestones.js` non-destructive idempotent upsert.
2. **Step 2**: Create and run `scripts/audit_and_nest_milestone_tasks.js` in dry-run mode, review with the user, and apply.
3. **Step 3**: Update `Timeline.jsx` to enforce parent task resolution, subtask nesting, and duplicate checking.
4. **Step 4**: Update `matrixNodeFilter.js` and `MatrixCanvasView.jsx` for milestone badge and Overlook handling.
5. **Step 5**: Update `task_intake_engine.js` and `weekly_audit.js` for audit-first gap detection.
6. **Step 6**: Run automated tests and production build check.
