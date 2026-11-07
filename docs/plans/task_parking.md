# Implementation Plan: Universal Task Parking, Triage Immunity & Deadline Enforcement

**Date:** Saturday, November 7, 2026  
**Status:** Pending User Evaluation  
**Target Version:** Polaris v1.2.79  

---

## 1. Overview & Objectives

This plan introduces a universal **Task Parking & Unparking** system across all categories in Polaris, resolves Matrix Canvas cluttering, updates the task triage engine, and guarantees deadline discipline:

1. **Universal Task Parking:**
   - Any task in any category (`curriculum`, `opportunities`, `academic`, `career`, `polaris`, `domestic`, etc.) can be parked.
   - Parking sets `status = 'parked'` and clears `quadrant = null`.
   - Parked tasks never float in the 4 matrix quadrants. They remain safe and accessible in the Backlog / Brain Dump tray.
2. **Mandatory Deadline Enforcement on Unpark:**
   - Unparking a task requires a valid `deadline`. If a task has no deadline when unparked, the system guarantees a default deadline (today or tomorrow) so no active/triaged task floats deadline-less.
3. **Triage Engine Immunity (`task_triage.js`):**
   - The triage engine strictly ignores any task with `status === 'parked'`.
   - `triageParentTasksUrgency()` is patched so it no longer forces `important_not_urgent` on parent tasks that have `deadline === null`.
4. **App UI Feature in Matrix Canvas:**
   - In the Task Details flyout, add a dynamic **"Park Task"** / **"Unpark Task"** button.
   - Expand the Category dropdown to include `Curriculum`, `Opportunities`, `Academic`, `Career`, `Domestic`, `Creative`, `Upkeep`, `Polaris`, `Reminder`, and `Normal`.
   - In the Status dropdown, add the `Parked` status with visual distinction.
   - Display a distinct `PARKED` badge in the backlog list.
5. **Immediate Data Cleanup:**
   - Re-categorize the 3 curriculum master tasks to `category = 'curriculum'`, `status = 'parked'`, `quadrant = null`.
   - Re-categorize the 2 scouted application tasks to `category = 'opportunities'`, `status = 'parked'`, `quadrant = null`.

---

## 2. Architecture & File Impacts

| Component / File | Shared By / Dependencies | Nature of Change |
|---|---|---|
| `scripts/task_triage.js` | Triage cron, scheduled runners | Exclude `status === 'parked'` from LLM triage and parent urgency inheritance. Prevent assigning quadrants to deadline-less tasks. |
| `scripts/task_triage.test.js` | Test suite | Add unit tests verifying parked tasks are ignored by triage. |
| `src/lib/matrixNodeFilter.js` | `MatrixCanvasView`, Constellation | Ensure `status === 'parked'` is never rendered on the 2D quadrant canvas. |
| `src/lib/matrixNodeFilter.test.js` | Test suite | Add unit tests for parked task suppression. |
| `src/components/views/MatrixCanvasView.jsx` | Matrix Canvas View | Add Park/Unpark action button, Status dropdown `Parked` option, full Category taxonomy, and Backlog `PARKED` badge. |
| `src/components/views/MatrixCanvasView.test.jsx` | Test suite | Test Park/Unpark button behavior and status switching. |
| Supabase `tasks` table | All views | Update status and categories for the 5 target tasks. |

---

## 3. Detailed Technical Design

### A. Universal State Definition
- **Parked State:**
  - `status: 'parked'`
  - `quadrant: null`
  - `category`: Unchanged (retains original functional category: `curriculum`, `opportunities`, `academic`, etc.)
- **Unparked State:**
  - `status: 'inbox'` (ready for triage) or `'active'`
  - `deadline`: Must be non-null (`deadline != null`). If user unparks without entering a date, defaults to `todayStr` (or `tomorrowStr`).
  - `quadrant`: Kept `null` until triage or user explicitly places it in a quadrant.

### B. Triage Immunity in `scripts/task_triage.js`
1. **`filterTasksForTriage()` update:**
   ```javascript
   // Strictly ignore parked tasks
   if (t.status === 'parked') return false;
   // Strictly ignore curriculum and opportunities unless unparked with a deadline
   if (t.category === 'curriculum' && !t.deadline) return false;
   if (t.category === 'opportunities' && !t.deadline) return false;
   ```
2. **`evaluateParentTaskQuadrant()` update:**
   - In `isMoreThan3DaysAway(deadline)`: if `deadline` is null, do NOT evaluate parent as `important_not_urgent`. A deadline-less parent must remain in the Backlog without a quadrant until scheduled.

### C. Matrix Canvas Display Invariant (`src/lib/matrixNodeFilter.js`)
- In `filterMatrixNodes()`:
  ```javascript
  // Invariant: Parked tasks are never rendered on the 2D quadrant canvas
  if (t.status === 'parked') return false;
  ```
- When a task has `quadrant === null` (including parked tasks), it stays in the Brain Dump / Backlog drawer on the right/bottom.

### D. UI Controls in `MatrixCanvasView.jsx`
1. **Task Details Action Bar:**
   - Place a high-visibility button right next to the "Delete Task" button:
     - If `selectedTask.status === 'parked'`:
       - Button text: **"Unpark Task"** (Green / Pulsar theme with Play icon).
       - Clicking sets `status: 'inbox'`. If `selectedTask.deadline` is missing, sets `deadline = todayStr` (enforcing the deadline requirement).
     - If `selectedTask.status !== 'parked'`:
       - Button text: **"Park Task"** (Amber / Subdued theme with Archive icon).
       - Clicking sets `status: 'parked'`, `quadrant = null`, and triggers canvas refetch.
2. **Status Dropdown:**
   - Add `{ value: 'parked', label: 'Parked', icon: Archive, color: 'text-amber-400' }`.
3. **Category Selector:**
   - Expand the `<select>` options to:
     - `Normal` (value: `normal`)
     - `Curriculum` (value: `curriculum`)
     - `Opportunities` (value: `opportunities`)
     - `Academic` (value: `academic`)
     - `Career` (value: `career`)
     - `Polaris` (value: `polaris`)
     - `Upkeep` (value: `upkeep`)
     - `Reminder` (value: `reminders`)
     - `Domestic` (value: `domestic`)
     - `Creative` (value: `creative`)
4. **Backlog Tray Badge:**
   - For tasks in the backlog list with `status === 'parked'`, display an amber badge: `PARKED`.

---

## 4. Verification & Testing Steps

1. **Database Migration Check:**
   - Run a patch script updating the 5 tasks in Supabase:
     - `Foundational Disciplines` -> `category: 'curriculum'`, `status: 'parked'`, `quadrant: null`
     - `Embedded Systems` -> `category: 'curriculum'`, `status: 'parked'`, `quadrant: null`
     - `Applied Skills` -> `category: 'curriculum'`, `status: 'parked'`, `quadrant: null`
     - `Call for Mentees` -> `category: 'opportunities'`, `status: 'parked'`, `quadrant: null`
     - `Engineering Intern` -> `category: 'opportunities'`, `status: 'parked'`, `quadrant: null`
   - Verify all 5 immediately vanish from the Matrix quadrants.
2. **Triage Script Run:**
   - Run `node scripts/task_triage.js` (dry run and live).
   - Verify that triage skips all parked tasks and does not re-assign quadrants to them.
3. **Automated Unit Tests:**
   - Run `vitest run src/lib/matrixNodeFilter.test.js`.
   - Run `vitest run scripts/task_triage.test.js`.
   - Run full test suite: `npm test` (verify 505+ passing tests).
4. **Build Check:**
   - Run `npm run build` to verify clean PWA bundle generation.
5. **No Typography Regressions:**
   - Verify 0 em dashes and 0 en dashes across all touched files.
