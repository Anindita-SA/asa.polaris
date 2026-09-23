# ADR 001: Separation of Task Triage and Task Audit

## Context
There was confusion between the "Triage Report" and the "Task Audit Report", stemming from overlapping scripts and the introduction of local LLMs.
- `task_triage.js` handles rapid sorting of the inbox into Eisenhower quadrants.
- `weekly_audit.js` handles milestone breakdowns, nutrition log checks, and inserting resulting tasks into the inbox.
By forcefully writing markdown reports from within these strict JSON-parsing Node scripts, we accidentally overwrote a previously rich, agentic analysis with a barebones JSON list.

## Decision: Hybrid Architecture (Option B)

### 1. Task Triage Report (`docs/_TRIAGE_REPORT.md`)
- **Purpose:** Expose the LLM's thought process when sorting inbox tasks into quadrants, for fine-tuning.
- **Execution:** Local, via `task_triage.js` (Ollama -> Groq/Gemini -> Heuristic fallback).
- **Content:** Per-task quadrant assignment with a `"reasoning"` field from the LLM.
- **Trigger:** Daily, via `run_triage_wrapper.ps1`.

### 2. Audit Task Insertion (No Report)
- **Purpose:** Generate concrete sub-tasks from upcoming milestones and flag nutrition anomalies.
- **Execution:** Local, via `weekly_audit.js` (Groq/Gemini -> Heuristic fallback).
- **Output:** Tasks inserted directly into the Supabase `tasks` table. No markdown report.
- **Trigger:** Daily, via `run_triage_wrapper.ps1`.

### 3. Task Audit Report (`docs/task_audit_report.md`)
- **Purpose:** Deep, reflective analysis of the user's tasks, goals, trajectory, and what they are doing right or wrong.
- **Execution:** Antigravity Agent Cron Job (daily at 9 AM). Full agent reasoning, not constrained by JSON parsing.
- **Content:** Strategic breakdown, goal alignment analysis, pattern observations, and actionable recommendations.
- **Trigger:** Antigravity scheduled cron.

## Rationale for Hybrid
The user's long-term goal is to run fully offline LLMs. Keeping the local `weekly_audit.js` script for task insertion ensures this pipeline remains functional without internet dependency. Antigravity handles the deep analysis layer that requires advanced reasoning, which will eventually be replaced by a sufficiently capable local model.

## Consequences
- `weekly_audit.js` is strictly a task insertion tool. It does NOT write markdown reports.
- `task_triage.js` writes `_TRIAGE_REPORT.md` with LLM reasoning for fine-tuning.
- The Antigravity cron job writes `task_audit_report.md` with full strategic analysis.
- Two systems do related but distinct things. This is intentional and temporary.
