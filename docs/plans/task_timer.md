# Task Timer & Duration Measurement Implementation Plan

## Overview
This feature introduces an authentic task duration measurement system into Polaris. It allows the user to track how long tasks actually take to complete, handles forgotten timers with smart overtime caps and audio notifications, and completely revamps the floating pop-out widget so it floats Always-on-Top over desktop tools like KiCad and VS Code without freezing or UI clipping.

---

## Decisions from Grill-Me Design Review

1. **Timer Placement & Mode**:
   - Integrated directly into the existing `PomodoroTimer` widget in the left sidebar and mobile sheet.
   - Adds a dedicated **Measure Task** mode alongside Pomodoro, Short Break, and Long Break.
   - When a task is selected, it can also seamlessly switch into duration measurement mode.

2. **Pre-flight Duration Estimate**:
   - If the selected task has no `estimated_minutes` or `time_estimate_minutes`, Polaris displays a quick estimate picker before starting (15m, 30m, 45m, 60m chips or custom input, default 30m).
   - This ensures every timed session has an expected baseline.

3. **Runaway Timer & Overtime Protection**:
   - **Estimate Reached Alert**: When elapsed time reaches the estimated duration, the timer plays a clear double audio chime ("ding ding") and triggers a browser/system notification: `"Task estimate reached! Continuing in overtime..."`.
   - **Overtime Mode**: The timer continues counting up with amber/warning styling so that genuine extra work is not lost.
   - **Hard Safety Cap**: If the timer continues unstopped for +30 minutes past estimate (or 2 hours total), it automatically pauses and triggers a high-priority review prompt.

4. **Review & Save Dialog (1-Click Confirmation)**:
   - Always surfaces upon clicking "Stop" or "Mark Done", or when returning to an overtime session.
   - Displays estimated time vs elapsed time.
   - Provides a quick stepper or slider to trim off untracked break time if the user stepped away.
   - Checkbox or button to Mark Task Done or leave In Progress.
   - **Cumulative Tracking**: For tasks worked across multiple sessions, elapsed minutes accumulate to the task total, while logging discrete session records to `task_estimate_calibration`.

5. **Pop-Out Widget Modernization**:
   - **Document Picture-in-Picture (PiP)**: Uses the modern `window.documentPictureInPicture.requestWindow()` API so the floating timer stays natively **Always-on-Top** above KiCad, VS Code, and other browser windows. Falls back to standard `window.open` if Document PiP is unavailable.
   - **Absolute Wall-Clock Tick**: Fixes background tab/window throttling by computing elapsed seconds from `Date.now() - sessionStartTime` on every frame, so animations and numbers never freeze when unfocused.
   - **Complete In-Widget Controls**: Includes task title, play/pause, mark done, stop & review, estimate badge, and elapsed time directly inside the pop-out window.
   - **Responsive Scaling**: Flexbox and auto-fit layout so resizing the pop-out window smoothly rescales the interface without cropping buttons or text.

---

## Architectural & Technical Architecture

### 1. Data Schema & Persistence
- **Table `task_estimate_calibration`**:
  - `user_id` (uuid)
  - `task_id` (uuid)
  - `estimated_minutes` (int4)
  - `actual_minutes` (int4)
  - `created_at` (timestamptz)
- **Table `tasks`**:
  - `estimated_minutes` / `time_estimate_minutes` (persists baseline estimate).
  - Note: Session history is preserved in `task_estimate_calibration` and `pomodoro_logs`.
- **Offline Sync**:
  - All writes use `offlineInsert('task_estimate_calibration', ...)` and `offlineUpdate('tasks', ...)` for resilient offline-first support.

### 2. State & Timer Engine (`useTaskTimer` or upgraded `PomodoroTimer`)
```javascript
// Timing state shape:
{
  mode: 'measure', // 'focus' | 'short' | 'long' | 'measure'
  taskId: string | null,
  taskTitle: string,
  estimatedMinutes: number,
  accumulatedSeconds: number, // previously saved session seconds for this task
  sessionStart: number | null, // Date.now() timestamp
  isRunning: boolean,
  isOvertime: boolean,
  isSafetyPaused: boolean,
  hardCapMinutes: number // estimatedMinutes + 30 or 120 max
}
```
- **Tick calculation**:
  `currentSeconds = accumulatedSeconds + (isRunning && sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0)`
- This prevents drift, battery saver throttling, and freezes.

### 3. Audio & System Notifications
- Double chime sound using standard Web Audio API synthesis (clean sine/triangle wave oscillation with decay, zero external audio asset dependency).
- Web Notifications API for background alerts when estimate is reached or overtime cap triggers.

### 4. Always-On-Top Document Picture-in-Picture
```javascript
async function openPiPWindow() {
  if ('documentPictureInPicture' in window) {
    const pip = await window.documentPictureInPicture.requestWindow({
      width: 320,
      height: 220
    });
    // Copy stylesheets into PiP document
    copyStylesheets(document, pip.document);
    return pip;
  }
  // Fallback to window.open
  return window.open('', 'PolarisTimer', 'width=320,height=220,menubar=no,toolbar=no');
}
```

---

## Detailed Implementation Steps

### Phase 1: Core Timer Engine & Audio/Notification Service
1. **Audio Synthesizer Utility (`src/lib/audioAlerts.js`)**:
   - Create lightweight Web Audio chimes for "estimate reached" (double bell chime) and "safety pause".
2. **Notification Utility (`src/lib/timerNotifications.js`)**:
   - Request and trigger system notifications for "Estimate Reached" and "Overtime Review Needed".
3. **Timer Logic Hardening in `PomodoroTimer.jsx`**:
   - Introduce `measure` mode.
   - Refactor tick loop to rely strictly on wall-clock deltas (`Date.now()`).
   - Implement overtime threshold check and hard safety cap auto-pause.

### Phase 2: Estimate Picker & Review Dialog
1. **Quick Estimate Modal / Inline Prompt**:
   - Renders when starting a task without an existing estimate.
   - Quick preset buttons: 15m, 30m, 45m, 60m, or manual number input.
   - Updates `tasks.estimated_minutes` and starts the timer.
2. **Review & Save Confirmation Modal**:
   - Appears when stopping the timer or clicking Mark Done.
   - Displays:
     - Task title
     - Target estimate
     - Measured actual minutes
     - Break adjustment slider/stepper (e.g. "Deduct untracked break time")
     - "Mark Task Completed" toggle
   - Saves record to `task_estimate_calibration` via `offlineInsert`.
   - If marked done, updates task status to `'done'` via `offlineUpdate`.

### Phase 3: Pop-Out Widget Redesign & Document PiP Support
1. **Document Picture-in-Picture Integration**:
   - Implement `window.documentPictureInPicture.requestWindow({ width: 340, height: 240 })`.
   - Fall back to standard pop-up window if Document PiP is unsupported on the browser.
2. **Pop-Out UI Component Refactor**:
   - Build a responsive mini-player layout inside the portal:
     - Header: Task title and mode indicator.
     - Body: Large, high-contrast clock with visual overtime badge (amber).
     - Controls: Play/Pause button, Mark Done button, Stop/Review button, Return to App button.
   - Clean solid colors: dark void background `#030712`, starlight text, amber accent. Zero gradients.
   - Smooth CSS flexbox rules ensuring no cropping when resized.

### Phase 4: Integration & Multi-View Access
1. **Task Card Direct Trigger**:
   - Ensure selecting a task from Launch Pad (`TodaysTasksShuffle`) or Day Guide can immediately load and trigger the timer in the sidebar.
2. **Test Suite & Regression Checks**:
   - Add unit tests for timer calculation, overtime threshold detection, and calibration payload generation.
   - Run `npm test` and `npm run build`.

---

## Verification & Acceptance Checklist

- [ ] Selecting a task with an estimate starts counting elapsed seconds accurately.
- [ ] Selecting an unestimated task displays the quick estimate picker (15/30/45/60m).
- [ ] When the timer reaches the estimated duration, the double chime plays and a notification fires.
- [ ] Timer enters Overtime mode with amber styling and continues counting up.
- [ ] At safety cutoff (+30m past estimate), the timer auto-pauses and prompts for review.
- [ ] Clicking Stop opens the 1-click confirmation dialog with elapsed minutes prefilled.
- [ ] Saving writes a record to `task_estimate_calibration` with `estimated_minutes` and `actual_minutes`.
- [ ] Pop-out uses Document PiP to stay Always-on-Top over KiCad and VS Code.
- [ ] Counter in pop-out never freezes when switching tabs or windows.
- [ ] Pop-out window displays all control buttons (Play/Pause, Mark Done, Stop) and resizes cleanly without clipping.
- [ ] Build passes cleanly (`npm run build`).

