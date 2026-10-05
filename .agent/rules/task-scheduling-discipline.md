---
trigger: always_on
description: Task scheduling density caps and crunch-period freeze rules
---

# Task scheduling discipline

## 1. Daily Primary Task Cap

When inserting or scheduling tasks with deadlines (via agent, scripts, or manual suggestion), no single calendar day may receive more than **3 primary tasks**.

- A "primary task" is any task with `mental_load` of `medium` or `high`, OR `estimated_minutes` / `time_estimate_minutes` >= 20, OR no estimate at all (unknown defaults to primary).
- Quick tasks (explicit `mental_load: low` AND `time_estimate_minutes` < 10) do not count toward the cap.
- If a bulk subtask generation would place more than 3 primaries on one day, **spread them** across `ceil(count / 3)` consecutive business days (skip weekends unless the task is personal/domestic).

## 2. Stagger Formula for Bulk Subtask Deployment

When creating N child tasks under a parent:

1. Calculate `spread_days = ceil(N / 3)`.
2. Assign deadlines starting from the parent's target start date, advancing 1 business day per 3-task batch.
3. Never cluster subtasks on the same day as a known exam, travel departure, or milestone deadline.
4. The agent MUST query existing task counts per day before assigning deadlines: `SELECT deadline, COUNT(*) FROM tasks WHERE status != 'done' AND user_id = $uid GROUP BY deadline`.

## 3. Crunch-Period Freeze

During identified crunch periods (exam weeks, travel days, application submission windows):

- **Do not re-date, reorganize, or shuffle existing task deadlines.** Leave them as-is and triage on the ground.
- **Do not insert new non-urgent tasks** into the active window. Route them to `inbox` with `deadline: null`.
- If the agent detects a crunch period (by checking milestones or the strategy document), it must explicitly state "Crunch period active, skipping task reorganization" in its output.

## 4. Post-Intensity Recovery Buffer

After a high-intensity period (exam, multi-day travel, submission sprint):

- The **first full day back** must be kept clear as a recovery and re-entry buffer.
- Zero primary tasks should be scheduled on that day.
- The agent should actively recommend this buffer when generating post-event schedules (e.g., "Monday Oct 5 is your recovery buffer, scheduling resumes Tuesday Oct 6").

## 5. Enforcement Points

These rules apply to ALL task-touching code paths:

| Code Path | Enforcement |
|---|---|
| `scripts/weekly_audit.js` | Tasks go to `inbox` with `deadline: null` and `quadrant: null`. Staggering is handled downstream. Compliant by design. |
| `scripts/nest_project_tasks.js` | Agent or script generating child subtasks MUST apply the 3-per-day stagger formula before inserting. |
| `scripts/task_triage.js` | Triage assigns quadrant (including `urgent_important`) but does NOT set deadlines. **Known gap:** setting `quadrant` on a `deadline: null` task surfaces it immediately in Day Guide / Matrix Canvas, bypassing the 14-Day Overlook. This is acceptable for inbox-to-quadrant flow, but the agent and audit scripts must NOT then also set a deadline on the same day as 3+ other primaries. |
| Agent (Antigravity) | When the agent suggests or inserts tasks with specific deadlines, it must check existing day density first and comply with the 3-primary cap. |
| Manual audit reports | Reports may recommend deadline targets but must flag any day exceeding the 3-primary cap as a "density warning". |

## 6. What This Rule Prevents

- The "Oct 6-7 avalanche" pattern: 41 tasks landing across 2 days after a parking period.
- Cognitive overload from seeing 20+ items on a single Day Guide view.
- Wasted energy re-dating tasks during crunch periods when focus should be elsewhere.
- Burnout spirals from attempting to clear an impossible daily queue.
