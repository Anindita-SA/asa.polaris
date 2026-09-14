# Changelog

## [2026-09-14] Settings Consolidation, Task System Overhaul & UI Decluttering (v1.2.6)
- **Task Hierarchy Unification & Split-Brain Resolution**: Unified task hierarchy strictly under `tasks.parent_task_id`, deprecating the legacy polymorphic `subtasks` table. Migrated legacy subtasks to `tasks` and established canonical parent sprints for IELTS and core portfolio/research projects.
- **Single-Row Recurring State Machine**: Hardened `useRecurringTasks.js` to strictly target root tasks, enforce open-task guards (never clone active tasks), and recycle only completed canonical rows on scheduled days.
- **Matrix Canvas UI Decluttering**: Replaced bulky `~X min left` text with compact duration chips rendered in amber (`text-amber-400 border-amber-500/30 bg-amber-950/40`) when indicating remaining subtask duration. Replaced text `Urgent Step Due` banners with subtle star icons (`Sparkles`) next to task bullets when subtasks are due within 48h.
- **Unified Navigation & Logout**: Removed the standalone Logout button from the top HUD bar and unified Sign Out into `SettingsPanel.jsx` (with a prominent direct Sign Out action in the modal header and in the Data & Account section).
- **Reminders Panel Quick Access**: Kept the header settings button in `RemindersPanel.jsx` directly opening the unified `SettingsPanel` scrolled to the Reminders section (`initialSection="reminders"`).
- **Interactive Task Picker Modal**: Created `TaskPickerModal.jsx` allowing users to search and filter active tasks by quadrant (`All`, `Q1`, `Q2`, `Q3`, `Q4`, `Backlog`) and launch any task into active focus with 1 click.
- **Matrix Canvas & Details Focus Launcher**: Added a prominent "Start Focus Now" button in the Matrix Details drawer and a quick-start `Play` button on individual subtasks, keeping the Launch Pad timer and Matrix active-next-action state fully synchronized via the global `polaris-start-task` event.
- **Surprise Task Modal Focus Action**: Added a direct "Start Focus" button (`Play` icon) to `SurpriseTaskModal.jsx` to immediately start randomized tasks in the Launch Pad timer.
- **Domain Context Sanitization**: Purged all inaccurate SiC references across documentation and scripts, aligning with canonical Dual Active Bridge (DAB) Converter & Power Electronics EMC research under Dr. Vignesh Kumar at NIT Trichy.
- **Quality Gates & Test Coverage**: Added comprehensive test suites in `TaskPickerModal.test.jsx` and `SurpriseTaskModal.test.jsx`, updated `SettingsPanel.test.jsx`, `MatrixCanvasView.test.jsx`, and `RemindersPanel.test.jsx`, verified 151 unit tests across 16 test suites, and completed full `ImplementationAuditor` and `SecurityAuditor` quality gates.

## [2026-09-14] RemindersPanel Section Collapsing Fix (v1.2.5)
- **Persistent Section Headers**: Fixed issue in `RemindersPanel.jsx` where collapsed sections disappeared if their item count was zero, preventing users from re-expanding the sections without refreshing the page. Extracted `CollapsibleSection` to a top-level component with consistent state binding for `Nudges`, `Task Reminders`, `Habits`, and `Reach Out`.
- **Test Coverage**: Added test in `RemindersPanel.test.jsx` verifying that collapsing and re-expanding sections functions as intended regardless of item counts.

## [2026-09-14] Morning Brief Curriculum Media Log Routing & External Reading Links (v1.2.4)
- **Decoupled Morning Brief Reading Items from Tasks**: Bookmarking news and tech breakthrough articles in `DayBriefView.jsx` now inserts records directly into the Personal Curriculum (`media_log` table) under `media_type: 'article'`, `tags: ['morning-brief', 'article']`, `status: 'want_to'`, and `recommended_by: 'Morning Brief'` instead of generating task clutter in the active matrix.
- **Direct Web Article Reading Links**: Enhanced `MediaLog.jsx` to automatically extract article URLs from review notes or summaries and render clean, direct `Read Article ->` external links (`ExternalLink` with `safeExternalUrl` in a secure `_blank` window).
- **Tag Filtering in Curriculum**: Added active tag filter dropdown and clickable `#tag` badges across media cards in `MediaLog.jsx`, enabling instant 1-click filtering by `#morning-brief` or topic tags.
- **Safe Supabase Allowlist & Data Migration**: Added `media_log` to `ALLOWED_TABLES` in `safe_supabase.js` and executed `scripts/migrate_reading_tasks_to_media_log.js` to migrate existing reading tasks (including `Read: Dense-Fluid Pumped Hydro Works. Scaling It Is The Problem.`) out of `tasks` and into `media_log`.
- **Test Suite & Build Verification**: Added comprehensive unit test suite in `MediaLog.test.jsx` (all 138 tests passing across 14 test suites, clean build verified).

## [2026-09-13] Focused Next-Action Canvas Presentation, Dynamic Urgency Migration & SiC EMI Research Isolation (v1.2.3)
- **Focused Next-Action Selection Algorithm**: Implemented pure deterministic 3-tier algorithm `computeActiveSubtask`: Tier 1 (subtask due within 48h with lowest estimate), Tier 2 (`in_progress` / `priority: high` flag), and Tier 3 (sequential position with low-friction warm-up nudge when first subtask >60m and high load).
- **Single Next-Action Canvas Rendering**: Expanding a project parent card on the 2D Matrix Canvas renders ONLY the single active next-action subtask pill beneath the parent card, accompanied by a compact button `+ {X} queued in Project Drawer`. Checking off the active subtask immediately promotes the next subtask in place without a page reload.
- **Dynamic Urgency Migration**: Gated behind `auto_quadrant_suggest`:
  - When OFF: renders a subtle `Urgent Step Due` indicator on parent cards when an active subtask is due within 48h, without changing quadrants.
  - When ON: elevates parent task to Q1 when an active subtask is due within 48h, and displays a `"Move back to Q2?"` chip when urgent subtasks are completed (never settles back silently).
- **Details Drawer Pipeline Manager**: Added `ACTIVE NEXT ACTION` badge and `Set as Next Action` override action directly on subtask items in the Details drawer, with up/down reordering controls.
- **SiC EMI & DAB Converter Research Isolation**: Created canonical project parent `SiC EMI & DAB Converter Research (Dr. Vignesh Kumar)` linked to milestone `SiC EMI / Power Converter Research Placement`, reparented all 8 DAB converter subtasks, and updated `nest_project_tasks.js`.
- **Triage & Test Verification**: Added parent task urgency evaluation in `scripts/task_triage.js` and expanded unit tests in `MatrixCanvasView.test.jsx` and `task_triage.test.js` (all 134 tests passing across 13 test suites).

## [2026-09-13] Canonical Project Task Nesting, 2D Matrix Canvas Streamlining & Per-Task Recurring Controls (v1.2.2)
- **Canonical Project Sprint Nesting**: Executed `scripts/nest_project_tasks.js` to nest 38+ loose child tasks under 4 canonical sprint parents: `CHAARG Hardware & PCB Documentation`, `Agri Solar Energy Survey Paper (MDPI Energies)`, `Master's Portfolio & Application Strategy`, and `Concrete Speaker Portfolio Project`. Archived completed non-P0 REEF internship tasks.
- **2D Matrix Canvas Streamlining**: Removed `mental_load` badges from 2D canvas card pills to eliminate visual noise (kept in the Details drawer). Consolidated duplicate duration markers: parent cards with subtasks display only remaining time (`~X min left`), while standalone tasks show `{estimate}m`.
- **Per-Task Recurring Controls**: Added direct "Repeat Daily / Recurring" toggle switch in the task Details drawer (`MatrixCanvasView.jsx`) with live synchronization to `recurring_task_templates` and `tasks.source_template_id`. Added recurring status indicator (`RefreshCw`) on active recurring task cards.
- **Subtask Quadrant Omission**: Hardened `MatrixCanvasView.jsx` and `TaskMatrix.jsx` to strictly exclude child subtasks (`parent_task_id != null`) from root quadrant slots and backlog queues, ensuring clean 2D quadrant views.
- **Unified Recurring Task Management**: Added active template manager in `SettingsPanel.jsx` with instant on/off toggles.

## [2026-09-13] IELTS Task Nesting & Task Triage Subtask Hardening (v1.2.1)
- **Safe Supabase Allowlist & Task Update Scope**: Added `recurring_task_templates`, `task_estimate_calibration`, and `user_settings` to `ALLOWED_TABLES` in `safe_supabase.js`, and expanded `allowedKeys` for `tasks` updates to include time estimates, mental load, canvas coordinates, notes, deadline, and estimate source.
- **Subtask Deduplication Isolation**: Scoped active task title indexing in `deduplicateActiveTasks` and `identifyDuplicatesAndMerge` by `sub:parent_task_id:title` vs `root:title`, guaranteeing child subtasks across different parent tasks are never merged or deduplicated against each other.
- **Root-Only Triage Classification**: Added `is('parent_task_id', null)` constraint to `unsortedTasks` query in `task_triage.js` and updated `deduplicateTasks` to only consider root tasks when checking against active tasks.
- **Quadrant Propagation**: Implemented automatic quadrant propagation to all child subtasks whenever a parent task's quadrant is updated during triage.
- **Recurring Task Hierarchy Safety**: Hardened `useRecurringTasks.js` to strictly match and recycle root tasks (`!parent_task_id`), protecting subtasks from being misidentified as recurring template instances.
- **IELTS Canonical Parent Sprint**: Created and executed `scripts/nest_ielts_tasks.js` to link the IELTS milestone, establish the canonical parent sprint task ("IELTS Preparation Sprint (Oct 3 Exam)"), nest all 4 skill practice subtasks (Writing, Speaking, Reading, Listening), and consolidate loose duplicates.
- **Automated Test Suite**: Added test coverage in `scripts/task_triage.test.js` and `src/hooks/useRecurringTasks.test.js` verifying subtask deduplication isolation, child subtask omission during triage, and dry-run execution safety (all 117 tests passing).

## [2026-09-13] Matrix & Triage Overhaul (v1.2.0)
- **Phase 0 (Security Hardening, Crash Prevention & Decomposition)**:
  - Enforced strict `user_id` query scoping across all Supabase mutations in `Journal.jsx`, `GoalsPanel.jsx`, `MediaLog.jsx`, `RelationshipsView.jsx`, `useGoogleCalendarSync.js`, `useContactReminders.js`, and `CurriculumView.jsx`.
  - Added null guards and defensive fallbacks across `MatrixCanvasView.jsx`, `FitnessBridge.jsx`, `CalendarView.jsx`, `DayChunker.jsx`, and `TaskMatrix.jsx`.
  - Removed invalid `scheduled_day` SQL updates in `TodaysTasksShuffle.jsx` and persisted daily schedule in `localStorage`.
  - Decomposed the 1,743-line `ReachOutView.jsx` into modular components (`ReachOutTargetCard`, `ReachOutFilterBar`, `TargetFormModal`, `BatchImportModal`, `reachOutConstants`).
  - Purged all CSS/Tailwind gradients (`IOBalanceBar`, `Starfield`, `CurriculumShelf`, `global.css`) and replaced all legacy em dashes in `curriculumDefaults.js` and `xpRewards.js`.
- **Phase 1 (Recurring Task Deduplication)**:
  - Upgraded `useRecurringTasks.js` to inspect active/scheduled tasks before creating or recycling, preventing duplicate active rows for recurring templates.
  - Implemented `deduplicateActiveTasks` clustering in `scripts/task_triage.js` to deduplicate active tasks across all categories.
- **Phase 2 (Unified Task Hierarchy Migration)**:
  - Added `milestone_id` to `tasks` table with foreign key to `milestones`.
  - Migrated legacy `subtasks` table rows directly into the unified `tasks` table with `milestone_id` and `parent_task_id`.
  - Refactored `Timeline.jsx`, `FocusBoard.jsx`, `NodePanel.jsx`, and `MatrixCanvasView.jsx` to query and mutate `tasks` directly.
- **Phase 3 (AI Time Estimates & Mental Load in Triage)**:
  - Added `time_estimate_minutes` and `mental_load` ('low', 'medium', 'high') to `tasks` and Groq subtask generator prompts.
  - Implemented automatic remaining time calculation (`~X min left`) on parent task cards in `MatrixCanvasView.jsx`.
  - Created `task_estimate_calibration` table to log estimate adjustments when edited by the user.
  - Added stale parent task detection in `task_triage.js` to flag inactive subtask trees after 3 days.
- **Phase 4 (Unified Settings Panel)**:
  - Created `user_settings` table and `useUserSettings.js` hook with dual `localStorage` and Supabase sync.
  - Built unified `SettingsPanel.jsx` covering Triage & Matrix, Reminders & Nudges, Focus & Audio, and Data & Account.
  - Added `auto_quadrant_suggest` toggle with clickable suggestion chips (`Move to Q2`) that require explicit user confirmation.
- **Verification**: All 111 unit tests across 13 test suites passing cleanly. Build verified with zero errors.

## [2026-09-13] Google OAuth Compliant Privacy Policy, Terms of Service & Legal Infrastructure (v1.1.8)
- **Standalone Static Legal Pages**: Created `public/privacy.html` and `public/terms.html` with Polaris dark void theme (#030712), glass card surfaces (#0f172a / rgba(15,23,42,0.7)), and gold/amber accents (#f59e0b, #d97706), with zero gradients.
- **Google Limited Use Disclosure**: Explicitly stated adherence to the Google API Services User Data Policy and Limited Use requirements, confirming zero advertising, no market research, human access restrictions, and strict non-transferability of Google user data.
- **In-App React Legal Components**: Implemented `src/pages/PrivacyPolicy.jsx` and `src/pages/TermsOfService.jsx` with full glassmorphic styling and back navigation.
- **Unauthenticated Legal Routing**: Updated `src/App.jsx` to dynamically route pathnames (`/privacy`, `/privacy.html`, `/terms`, `/terms.html`) and URL hashes (`#/privacy`, `#/terms`) directly to legal documentation without requiring active user authentication.
- **Login & Settings Legal Access**: Added Terms of Service and Privacy Policy consent links to `Login.jsx` footer and integrated a dedicated "Legal & Privacy Policies" section into `SettingsPanel.jsx` with Google API disclosures and data backup references.
- **Automated Test Suite**: Added `src/pages/LegalPages.test.jsx` (9 tests covering Privacy Policy headers, mandatory Google Limited Use text, data restrictions, Terms of Service sections, and hash routing in App). All 87 tests passing.
- **App Version Bump (v1.1.8)**: Bumped version in `package.json` to v1.1.8.

## [2026-09-13] Task Card Selection Crash Fix & App-Wide Stability Hardening
- **Task Card Click Crash Resolution**: Fixed a fatal runtime `ReferenceError: statusDropdownOpen is not defined` in `MatrixCanvasView.jsx`. Declared `statusDropdownOpen` state with `useState(false)` and attached automatic cleanup effects on tab transitions and task deletions.
- **Defensive Null-Safety & Fallbacks**: Added fallback guards across all task attribute inputs in the Matrix Details drawer (`title`, `notes`, `quadrant`, `estimated_minutes`, `status`, `deadline`, `category`).
- **Security Hardening on Timeline**: Enforced explicit `user_id` query scoping across all `milestones` and `subtasks` updates and deletions in `Timeline.jsx`, and guarded `fetchMilestones` against initial null `user` states.
- **MatrixCanvasView Unit Test Suite**: Created `src/components/views/MatrixCanvasView.test.jsx` (6 tests covering canvas card clicks, backlog clicks, status dropdown opening and updates, field edits, and task deletion). All 78 tests across 9 test suites passing.
- **App Version Bump (v1.1.7)**: Bumped version in `package.json` to trigger PWA service worker refresh.

- **In-App Notification Settings Panel**: Created `NotificationSettingsModal.jsx` and `useNotificationSettings.js`, providing an intuitive configuration panel accessible from the Reminders panel header.
- **Configurable Task Notification Modes**: Added 4 distinct reminder modes:
  - `focus_only`: Alerts only for the primary active/ongoing focus task, stopping notification spam from backlog tasks.
  - `consolidated`: Combines overdue tasks into a single summary notification.
  - `all`: Alerts for all overdue tasks and reminders.
  - `off`: Keeps all tasks visual-only in the UI with zero push/sound notifications.
- **Granular Toggles & Frequency**: Added toggles for System Habit Nudges (Water, Posture, Break), Pomodoro timer completion alerts, Master Mute (Do Not Disturb), and a task reminder interval selector (30m, 60m, 120m, 240m).
- **Dynamic Scheduler Integration**: Updated `useNudgeScheduler.js` and `src/sw.js` to dynamically filter task and habit notifications in real time based on active user preferences.
- **Eisenhower Matrix Filter Preference Memory**: Added automatic `localStorage` persistence in `MatrixCanvasView.jsx` for all canvas filter toggles (`Hide Polaris Edit`, `Hide Reminders`, `Hide Scheduled Tasks`) so user preferences are remembered across navigation and sessions.
- **Test Suite Expansion**: Added unit tests in `useNudgeScheduler.test.js` and `RemindersPanel.test.jsx` (all 71 tests passing).

## [2026-09-12] Focus Board Bugfix, Ghost Item Purge & Backburner Restoration
- **Root Cause Resolution**: Resolved an accidental paste error from commit `c5b7ea4` where `addFocus` replaced the body of `fetchBackburner`, causing `addFocus` to be undefined, wiping out `backburner` state, and triggering blank focus item insertions on every mount.
- **Ghost Record Cleanup**: Added automatic detection and deletion of empty/blank focus records (`offlineDelete`) during `fetchFocus` to clean up corrupted Dexie/Supabase entries.
- **Resilient Seeding**: Added auto-seeding of `DEFAULT_FOCUS_ITEMS` if zero focus records exist for the user, ensuring active slots are immediately populated.
- **Full Action Restoration**: Restored `addFocus`, `fetchBackburner`, `completeFocus`, `sendToBackburner`, `promoteToFocus`, and `deleteBackburner`.
- **Focus Item Direct Delete**: Added `deleteFocus` function and a `Trash2` icon button to focus item cards.
- **Cross-View Synchronization**: Connected `FocusBoard.jsx` to the `polaris-tasks-changed` window event listener for seamless background synchronization.
- **Comprehensive Test Suite**: Added `src/components/panels/FocusBoard.test.jsx` (8 unit tests covering rendering, seeding, ghost cleanup, adding, backburner flows, and event listeners).
- **App Version Bump (v1.1.6)**: Bumped version in `package.json`.

## [2026-09-12] Reminders Panel Live Synchronization & Focus Neglect Illumination
- **Live Cross-View Reactivity**: Added local `polaris-tasks-changed` window event dispatching across all `offlineApi.js` mutations (`offlineInsert`, `offlineUpdate`, `offlineUpsert`, `offlineDelete`) and connected `RemindersPanel.jsx` to both local window events and Supabase Postgres Realtime. Crossing off or modifying tasks in the Matrix, Brain Dump, or Day Guide now immediately reflects in the Reminders Panel.
- **Focus Task Direct Illumination & Shimmer**: Neglected or overdue focus tasks (`deadline <= today` or `skip_count >= 3`) are illuminated directly within their Focus Task cards with red accent styling, randomized shimmer pulse animation (`shimmerDuration`, `shimmerDelay`), and status badges (`OVERDUE`, `DUE TODAY`, `NEGLECTED`), preventing visual habituation.
- **Zero Duplication in Needs Attention**: Strictly excluded `ongoingTask` and `nextTask` from the Needs Attention candidate pool, eliminating redundant multi-card display.
- **Needs Attention Curation**: Prioritized non-focus quick-win tasks (`estimated_minutes <= 15` or same-day deadline), due system nudges, incomplete daily habits, and overdue contacts, capped at the top 2 visible items with a remaining count indicator.
- **Security Hardening**: Enforced explicit `user_id` query scoping across all nudge update and delete operations in `RemindersPanel.jsx`.
- **App Version Bump (v1.1.5)**: Bumped version in `package.json` to trigger PWA service worker refresh.

## [2026-09-12] Master's Strategy & Tracker Deadlines Synchronization
- **Comprehensive Master's Strategy Update**: Updated `MASTERS_APP_STRATEGY.md` with verified hard deadlines, scholarship windows, and exhaustive required documents checklists across Dutch, Italian, Scandinavian, Irish, and Erasmus Mundus programs.
- **Excel Tracker Refresh**: Synchronized `Aloka_Masters_Tracker.xlsx` across all 5 sheets (Application Tracker, Scholarships, Timeline & Milestones, Portfolio Checklist, Cold Mail Pipeline) with zero em dashes and up-to-date admission and funding details.
- **IELTS Retake & Admin Status**: Formally reflected IELTS Academic booking for October 3, 2026, confirmed official CGPA percentage conversion certificate (78.1%) from NIT Trichy registrar, and updated working time allocations.
- **Research Placements Attribution**: Solidified canonical truth for power conversion research: Dual Active Bridge converter under Dr. Vignesh Kumar at NIT Trichy (weekdays) vs 12-pulse converter hardware under Dr. Tanmoy Bhattacharya at IIT Kharagpur (undergraduate summer internship).

## [2026-09-12] Reach Out: In-App Mail Editing, Profile Links, Dual Mail Client & Test Suite
- **In-App Email & Brief Editor**: Added direct in-card editing for draft emails and strategic fit briefs with live textareas, immediate Supabase saves, and cancel controls.
- **Institution Profile Quick Links**: Added `profile_url` column migration and live links on target cards to lab profiles (with Google Scholar search fallback).
- **Dual Mail Launching Fix**: Solved mailto protocol issues by stripping `target="_blank"`, providing dedicated "Open in Gmail" web compose links (`https://mail.google.com/mail/?view=cm...`) and direct OS mail client triggers.
- **Automated Test Suite**: Added `src/lib/urlUtils.test.js` with 13 unit tests verifying `safeExternalUrl`, `createMailtoUrl`, `createGmailComposeUrl`, and `createAcademicSearchUrl`.
- **Background Script Guard**: Patched `scripts/agent_outreach_insert.js` to prevent TTY blocking and killed orphan tasks.


- **Needs Attention Card Simplification**: Removed raw WSJF score badges from the Needs Attention item cards to maximize title readability and reduce visual noise, switching to single-letter category badges (`T` for Task, `R` for Reminder, `N` for Nudge, `H` for Habit, `C` for Reach Out).
- **Randomized Shimmer Pulse Animation**: Added randomized duration (3.5s to 7.0s) and delay memoization to the Needs Attention red box in `RemindersPanel.jsx` to create an organic, subtle attention pulse without render jumping.
- **System Habit Nudges vs Tasks Isolation**: Separated user-configurable system habit nudges (`nudges` table) from tasks in `useNudgeScheduler.js` and `RemindersPanel.jsx`. Tasks are no longer mistakenly listed in the Nudges collapsible list or "Manage Nudges" settings modal.
- **Service Worker Notification Dispatch**: Background push notification scheduling retains full alerts for both system habit nudges and overdue tasks, while exposing strictly system nudges to UI management dialogs.
- **Unified Needs Attention WSJF Prioritization**: Refactored `RemindersPanel.jsx` to unify overdue candidates across all categories (system nudges, overdue tasks/reminders, incomplete habits, and overdue contacts) into a single WSJF-ranked queue.
- **Cognitive Load & Max-2 Rule**: Strictly capped the visible Needs Attention container to the top 2 highest-priority items with a subtle remaining items indicator (`(+X more in sections below)`), eliminating task initiation paralysis.
- **App Version Bump (v1.1.4)**: Bumped version in `package.json` to trigger PWA service worker refresh for installed applications.
- **Recurrent Task Recycling**: Refactored `useRecurringTasks.js` to recycle completed task rows (`status === 'done'`) back to `active`, increment `completion_count`, append `completion_dates`, and reset `skip_count: 0`.
- **Offline Dexie Store Integration**: Integrated `useRecurringTasks.js` with Dexie IndexedDB via `offlineSelect`, `offlineInsert`, and `offlineUpdate` with full table scope.
- **Safe Client Whitelist**: Expanded `safe_supabase.js` read-mostly allowed update keys for `tasks` to permit `skip_count`, `status`, `completion_count`, `completion_dates`, and `source_template_id`.
- **Triage Crash Prevention**: Replaced `.delete()` calls in `task_triage.js` with safe status archiving (`status = 'done'`) when removing duplicate inbox items.
- **Database Cleanup**: Executed `scripts/cleanup_duplicates.js` to merge existing duplicate IELTS and routine tasks in the database into single canonical rows with merged completion histories.
- **Triage Vitest Suite**: Added `scripts/task_triage.test.js` covering duplicate detection, inbox unique item resolution, skip count incrementation, and duplicate merging.
- **Ingestion Deduplication**: Added pre-insert active task duplicate filtering in `side_quests.js` and `weekly_audit.js`.

## [2026-09-12] Phase 2: Task Triage Ecosystem Offline Migration
- **Dexie v2 Schema Expansion**: Upgraded local IndexedDB schema to version 2, adding `focus_items`, `backburner`, `subtasks`, `recurring_task_templates`, `hardware_opportunities`, and `eulogies`.
- **Sync Manager Orchestration**: Added all 6 triage tables to `syncManager.js` background pull and online queue replaying.
- **Task Matrix & Spatial Canvas**: Migrated `TaskMatrix.jsx` and `MatrixCanvasView.jsx` from direct Supabase network calls to `offlineApi` (offline drag & drop, task creation, quadrant assignment, deletion, and WSJF duration persistence).
- **Focus Board & Backburner**: Migrated `FocusBoard.jsx` to `offlineApi` for active focus slots, subtasks, backburner deferrals, and local drag-and-drop position management with auth state null guards.
- **Recurring Task Generation**: Converted `useRecurringTasks.js` to run against local IndexedDB templates, enabling task generation and recycling while offline.
- **Anchor & Eulogies**: Migrated `AnchorPanel.jsx` eulogy queries and inserts to `offlineApi`.
- **Pre-Flight Workspace Cleanliness**: Moved untracked scratch scripts and payload backups to `private_backups/`.

- **Reach Out Panel**: Added a new "Reach Out" subtab inside the existing Orbit panel (`FitnessBridge.jsx`), complete with status-ordered list view, color-coded solid status badges, follow-up date tracking, and add/edit target modal.
- **Batch JSON Importer**: Built a collapsible batch import tool at the top of the Reach Out panel with JSON validation, importing outreach candidates with `status = 'drafted'`.
- **Database Schema & RLS**: Created `outreach_targets` table with RLS enabled via migration `20260911130000_create_outreach_targets.sql`, updated `docs/DATABASE_SCHEMA.md` and `dev guides/database_sup.md`.
- **Automation & Scripts**: Added `'outreach_targets'` to `ALLOWED_TABLES` in `safe_supabase.js` and built `scripts/agent_outreach_insert.js` for automated ingestion during weekly cold email cron routines.

- **D3 Physics Optimization**: Removed infinite alphaTarget loop in `ConstellationGraph.jsx` to allow the force simulation to naturally settle; added `isActive` prop so physics simulation is completely paused when navigating to other views (eliminating background 60fps CPU churn).
- **Code Splitting & Bundling**: Implemented `React.lazy` and `Suspense` across root routes (`App.jsx`), all 8 dashboard panel views (`Dashboard.jsx`), and day guide subtabs (`DayGuideView.jsx`). Added Vite `manualChunks` splitting large vendor libraries (`vendor-react`, `vendor-supabase`, `vendor-d3`, `vendor-motion`, `vendor-icons`).
- **Brief News Flagging**: Added a "Save to Tasks" bookmark action for news items in `DayBriefView.jsx`, saving them to the Strategic quadrant and marking them as saved in `morning_briefs`.
- **Query & Network Optimization**: Removed 2-second background polling loop in `useMorningSequence.js`. Added missing `user_id` filters and enforced `.limit()` bounds across `DayGuideView.jsx`, `HardwareScoutPanel.jsx`, and `useRecurringTasks.js`.
- **Auth & State Optimization**: Memoized `useAuth` context value and callbacks to prevent cascading re-renders. Disabled redundant `seedUserData` DB checks for existing authenticated users. Reduced `Starfield.jsx` GPU blur compositing nebulae from 5 to 3.
- **Security Hardening**: Created `safeExternalUrl` sanitizer for all outgoing links and ensured 100% `user_id` query scoping across all client mutations.

## [2026-09-10] Self-Correcting Opportunity Scout & Dismiss with Feedback
- **Scout Precision**: Updated `opportunitiesPrompt` in `_shared/personal_prompts.ts` with strict positive/negative whitelist checks on nationality and regional eligibility (specifically verifying Bangladesh is explicitly on targeted region lists).
- **Adaptive Feedback Engine**: Scout edge function now queries the user's latest rejection feedback from `hardware_opportunities` and injects learned negative constraints into the prompt to prevent recurring bad suggestions.
- **Dismiss with Feedback UI**: Created `DismissFeedbackModal.jsx` and integrated it across both `HardwareScoutPanel.jsx` and `DayBriefView.jsx`, enabling one-click dismiss reasons with optional custom notes.
- **Database Schema**: Added `rejection_reason` and `rejected_at` columns to `hardware_opportunities` table via migration `20260910141500_add_rejection_feedback.sql`.

## [2026-09-10] Morning Brief Crash Fix & Daily Cron Setup
- **Bugfix**: Added `reasoning_format: 'hidden'` to all three Groq API calls (`generate-morning-brief`, `scout-opportunities`, `generate-application-subtasks`). Groq now requires this parameter when using `json_object` response mode with Qwen 3.6, otherwise the API returns a 400 error.
- **Cron**: Created `pg_cron` migration (`20260910073000_add_daily_cron_jobs.sql`) to schedule daily automated runs: morning brief at 06:00 IST and opportunity scout at 06:15 IST. Previously, neither function had any automated trigger.

## [2026-09-09] Offline-First Architecture & Timeline Tidying
- **Architecture**: Designed Phase 1 of Offline-First architecture using Dexie.js (IndexedDB). Will cache the 6 critical daily-driver tables (tasks, daily_tasks, goals, milestones, day_plan_blocks, profiles) locally, with a sync queue for offline mutations and last-write-wins conflict resolution.
- **Timeline Management**: Tidied up the timeline context. Archived the REEF Marine Conservation Internship task (doesn't fit P0 Master's strategy) and rolled forward deadlines for overdue P0/P1 tasks (Agri Solar Survey Paper phases and CHAARG PCB documentation) to appropriate dates in September.

- **Duplicate Tasks Bug**: Fixed `useRecurringTasks.js` to correctly identify and prevent the creation of duplicate recurring tasks when an active task from a previous day is still pending.
- **Task Reminders UI**: Updated `RemindersPanel.jsx` to explicitly show tasks tagged with the `reminders` category in a dedicated "Task Reminders" section.
- **Matrix Polaris Filter**: Added a toggle to `MatrixCanvasView.jsx` to quickly hide "Polaris Edit / Building" tasks from the canvas view.

## [2026-09-07] Task Categories & Security Hotfixes
- **Task Category Sorting**: Added a 'Category' dropdown to the Task Details modal with options for 'Polaris Edit / Building', 'Reminders', and 'Normal Task' (which saves as null to keep the DB clean). Backlog tasks are now sorted by these categories.
- **Hide Reminders Toggle**: Added a toggle button in the Matrix Canvas to instantly hide all tasks categorized as 'reminders' from the board.
- **Security Audit Hotfix**: Added explicit .eq('user_id', currentUser) checks across all MatrixCanvasView.jsx Supabase queries to prevent IDOR and data leakage, and sanitized 	ask.title in the AI Auditor prompt to mitigate prompt injection.
- **Task Triage Script Updates**: Updated scripts/task_triage.js to correctly classify polaris tags to 'polaris' and chained .is('parent_task_id', null) to strictly ignore subtasks (preventing them from being converted into top-level feature proposals).
# Changelog
## [2026-09-07]
### Added
- **Opportunity Scout V2**: Added percentage scoring (`profile_match` and `acceptance_chance`) for hardware opportunities.
- **Subtask Generation**: Implemented a new Edge Function to generate specific application steps via Groq API.
- **Matrix Canvas Subtasks**: Parent tasks in the Matrix Canvas now display a toggleable UI to show or hide their subtasks.
- **Task Triage Upgrades**: Triage script now automatically scopes application parent tasks into the prompt with their opportunity match scores to properly place them into quadrants, and inherently skips triaging subtasks.

### Changed
- Made the Polaris logo in the top navigation clickable to trigger a hard refresh (`window.location.reload()`), making it easier to restart the app on mobile devices.
- Created the 'Polaris Dev Pipeline' allowing AI-driven execution of app features directly from the Eisenhower Matrix.
- Added #polaris hashtag detection to triage script to automatically flag dev tasks.
- Added category column to 	asks table.
- Implemented auto-generation of docs/_FEATURE_PROPOSALS.md for AI context sharing.
- Added helper script  g_review_flag.mjs for marking features ready for manual review.

## [2026-09-07]
### Fixed
- **Scout Fallback**: Updated the `scout-opportunities` edge function to append up to 3 previously discovered highly-recommended opportunities to the morning brief if no new opportunities are found by Firecrawl or Groq today.

### Added
- Added skip_count tracking to the 	asks table to monitor neglected tasks.
- Injected current date awareness into the 	ask_triage.js prompt.
- Integrated Service Worker notifications to escalate nudges for overdue tasks.
- Added Pomodoro hook to clear active nudges and reset skip_count when starting a session.

All notable changes to Polaris will be documented in this file.

## [2026-09-01] Sprint: Triage & Morning Brief
### Changed
- **Thermonuclear Security Update**: Fixed 12 tables that were exposed by weak RLS policies (`auth only` or `Allow all for authenticated`). Added missing `user_id` columns to `workout_goals`, `workout_performance`, and `plan_exercises` to ensure cross-tenant data isolation.
- **Hardware Scout Tag System Fixes**: Replaced raw text spans with pill-styled UI badges for tags (`Deadline`, `Effort`, `Fit`) in `HardwareScoutPanel.jsx`. Added optimistic UI updates for dismissing and activating opportunities.
- **Local Triage Pipeline Fix**: Fixed bug where `task_triage.js` failed to parse the local LLM output when exactly one unsorted task was found (handling object vs array responses).

- **Eisenhower Matrix Coordinates Fix**: Added a Supabase migration to create missing canvas_x and canvas_y columns in the 	asks table, resolving the bug where untethered tasks would snap back or disappear when dragged across the spatial canvas.
- **Backlog Obliteration Fix**: Removed the hover-state trash icon from the Brain Dump Backlog list to prevent accidental deletions while attempting to drag. Task deletion is now safely located inside the Task Details pane with a confirmation prompt.
- **Hide Far Scheduled Tasks**: Added a toggle control to the Eisenhower Canvas to hide tasks scheduled more than 7 days in the future, keeping the matrix clean while preserving visibility for upcoming week deliverables.

- **Day Guide View Scrolling Fix**: Resolved layout height and scroll truncation across all four sub-tabs (`Matrix`, `Picks`, `Auditor`, `Brief`). Replaced conflicting `min-h-screen` and `md:h-screen` classes with `h-full` and added `min-h-0` flex constraints on parent wrappers, allowing content to scroll smoothly to the bottom without getting clipped by Dashboard overflow boundaries. Added `pb-32` spacing to ensure buttons and lists clear the viewport.
- **Morning Brief Edge Function**: Migrated Morning Brief generation logic to a Supabase Edge Function (`generate-morning-brief`). RSS fetching and parsing for fixed feeds, manual summary processing for curated feeds, Groq API calling, reasoning suppression, and JSON extraction now run entirely server-side. Removed `VITE_GROQ_API_KEY` from the client `.env` and rewired `useMorningBrief` and `DayBriefView` to invoke the Edge Function directly via `supabase.functions.invoke`.
- **Day Brief Redesign**: Refactored `DayBriefView` to use the `useTodaysTasks` hook as its data source, matching the task scope used elsewhere in the app. Replaced the "...and X more" pattern with full lists, and added a dynamic summary paragraph at the top detailing the count of urgent/strategic tasks and the title of the current highest-priority weekly campaign goal.
- **Goal Scopes Updated**: The 5-year goal scope (`5yr`) was renamed to "Decade" (`decade`) across the UI, components, and database schema.
- **Anchor Panel Layout Shift**: Restored the Anchor Panel's toggle button to its clean `absolute` positioning to eliminate the empty glass bar on the left side of the screen when collapsed. When expanded, the panel now acts as a `w-96` flex container that correctly shifts adjacent content to the right (like the Brain Dump panel and Day Guide header) instead of blocking it.
- **Brain Dump Layout Impeccable Alignment**: Fixed horrendous vertical misalignment down the left axis of the Brain Dump panel by standardizing all internal container paddings to `px-4 py-3`. Unlocked perfect horizontal alignment and rhythm between the header, quick capture input, search bar, and task cards. Also centered the collapse chevron when the panel is closed to eliminate the squished "no padding" bug, and made the tabs (`flex-1`) distribute evenly to fix the awkward empty gap.
- **Form Input Consistency**: Replaced mismatched `rounded-xl` corners on the "DUMP" button and input field with `rounded-lg` to match the search bar and project design guidelines ("somewhat rounded rectangles").
- **Brain Dump Text Wrap**: Refined the "Notes" section wrapping to use `break-words` instead of `break-all`. This ensures that normal words are no longer split aggressively in the middle of characters, while long unbroken URLs still wrap properly.
- **Brain Dump Tabs Overflow**: Replaced the text labels (`BACKLOG`, `COMPLETED`, `DETAILS`) with vector icons (`List`, `CheckCircle2`, `FileText`) and numeric counters. This completely eliminates the horizontal cramming issue and guarantees all tabs and the collapse chevron fit comfortably without scrolling.
- **Matrix Canvas Controls**: Removed the floating controls bar (zoom, completed toggle, AI audit trigger) from the Spatial Matrix canvas to declutter the interface, as these functions are redundant or accessible elsewhere.
- **Matrix Sidebar Layout Shift**: Moved the "Brain Dump" sidebar in the Day Guide's Matrix Canvas view to the left side of the screen. This prevents it from getting cut off by the global Reminders Panel that sits on the right.
- **Brain Dump Nav Styling**: Fixed the Brain Dump sub-navigation tabs to follow the "somewhat rounded rectangles" design system (`rounded-lg`), added `whitespace-nowrap` to prevent awkward text wrapping, and improved padding for better legibility.
- **Day Guide Tab Order**: Reordered the Day Guide sub-tabs to push "DAY BRIEF" to the 4th position as it's considered non-essential for now. The default view upon opening Day Guide is now the "CONSTELLATION MATRIX" (Spatial).

### Added
- **Pomodoro Pop-Out Timer**: Implemented a Picture-in-Picture (PiP) mode for the Pomodoro Timer using the experimental Document PiP API. Clicking the pop-out icon opens a dedicated, floating window for the timer that persists on top of other applications, keeping it fully visible without needing multiple tabs open.

- **Morning Brief Read More Links**: Added "Read more ->" links to each Morning Brief item card across `SparkPopup` and `DayBriefView`, opening the original article source in a new tab with security attributes (`target="_blank" rel="noopener noreferrer"`).
- **Morning Brief UI**: Wired up the `useMorningSequence` hook to the UI. Created `SparkPopup` to display the day's positive climate signals. It automatically pops up during the "spark" stage on initialization and includes a dismiss button that marks the brief as seen, navigating straight to the Day Brief view. The day's climate signals are also rendered statically at the top of the Day Brief view so they can be revisited at any time.
- **Morning Brief Generation**: Implemented the `useMorningBrief` hook that triggers on app load. It asks Groq (bypassing the manual opt-in rule as an intentional exception) to generate 3 recent, positive climate-tech/renewable-energy developments based on the user's active `brief_sources` and saves them to `morning_briefs`.
- **Task Details Sub-Nav**: Added a "DETAILS" sub-tab to the Brain Dump side panel in the Day Guide's spatial matrix (`MatrixCanvasView`). Clicking any task pill (in the matrix, backlog, or completed list) now loads the full task details (title, notes, estimate, status) in the side panel without truncation.
- **Surprise Me Task Randomizer**: Built `SurpriseTaskModal.jsx` and added the dice-roll icon to `RemindersPanel` and `FocusBoard` to randomly pick incomplete daily tasks.
- **Unified Tasks Hook**: Created `useTodaysTasks.js` to combine `daily_tasks` and `goals` (where `scope='daily'`) into a unified array.
- **Play View**: Added a mini-games hub under the Orbit tab for zero-tracking, relaxing web games.
- **Hover Lift Animations**: Standardized `glass-hover hover:-translate-y-1 transition-transform` on all clickable card components (Goals, Curriculum, Media, Play, Timeline, Reminders).

### Changed
- **Nudge Formatting**: Refactored overdue nudges to display relative time (e.g., `Due X min ago`, `Due Xh ago`, `Due Xd ago`, capping at `Overdue` past 7 days).
- **Reminders Panel Layout**: Reordered sections to prioritize "Today's Tasks" at the top, followed by "Nudges", and then "Reach Out".

### Fixed
- **Eisenhower Matrix Auto-Tether Restored**: Restored the auto-tethering logic so untethered tasks cleanly snap back into matrix lists when dropped.
- **Task Details Panel UX Improvements**: 
  - Restructured the grid layout to place Quadrant, Estimate, and Status on a single compact line to prevent horizontal overflow in the side panel.
  - Shortened Quadrant dropdown options to 2-letter indicators (Q1, Q2, Q3, Q4) for faster selection.
  - Fixed the Date Picker visual bug (rogue comma appearing) by swapping to the standard system sans-serif font which correctly handles the native date formatter's spacing.


- **Pomodoro Pop-Out Timer Fix**: Completely removed the experimental Document Picture-in-Picture (PiP) API in favor of a standard `window.open` popup. The Document PiP API was found to consume the browser's single global PiP slot, which forcefully kicked out other video PiP sessions (like study lectures) on other tabs. The timer now opens in a safe, isolated window that won't interfere with media playback elsewhere.

- **Pomodoro Pop-Out Timer Fix**: Added robust fallback to traditional `window.open` popup if the experimental Document PiP API fails or is unavailable on localhost. Added a "Bring Back" button and fixed window focus management to prevent the button from becoming unresponsive if the popup is closed forcefully.

- **Mobile Styling**: Fixed tab pill wrapping in `BottomNav.jsx` and padded the `ConstellationGraph` container to prevent nodes from clipping on small screens.
- **Service Worker Message Parsing**: Updated `sw-notifications.js` to correctly handle `Array.isArray(event.data)` vs `{ type: 'UPDATE_NUDGES', nudges: [...] }` to fix the Nudge notification bug.

-   * * A u t h   B u g   F i x * * :   F i x e d   a   b u g   w h e r e   t h e   G o o g l e   C a l e n d a r   p r o v i d e r   t o k e n   w a s   n o t   p e r s i s t e d   i n   l o c a l S t o r a g e   a c r o s s   p a g e   r e l o a d s ,   c a u s i n g   t h e   a p p   t o   e r r o n e o u s l y   r e q u e s t   r e - a u t h e n t i c a t i o n   e v e r y   t i m e . 
 
 
## [2026-06-09] Database Schema Audit & Fixes
- **Bug Fix (Goals Panel):** Identified and resolved a constraint issue where the `goals` table's `goals_scope_check` blocked `daily` and `side_quest` goal scopes.
- **Bug Fix (Goals Panel):** Added missing `description` and `deadline` columns to the `goals` table to ensure the GoalsPanel functions without silently dropping data.
- **Bug Fix (Fitness Bridge):** Added rigorous `user_id` filtering to the `workout_logs`, `meal_logs`, and `weight_logs` queries in `FitnessBridge.jsx` to prevent data leaking across users if Row Level Security (RLS) is disabled or misconfigured.
- **Bug Fix (Pomodoro Data):** Corrected a silent failure in `CurriculumView.jsx` where it attempted to read a non-existent `duration` column from `pomodoro_logs` instead of the correct `duration_minutes` column.

## [2026-05-24] Curriculum UI/UX Visual Overhaul
- **Aesthetic Update:** Implemented a single-row horizontal scrolling bookshelf, replacing the older grid layout, giving a highly premium "library" feel.
- **Interactive Books:** Upgraded `BookSpine.jsx` to feature 3D interactions. Books now lift outward `translateY(-16px) scale(1.06)` on hover, and execute a fully animated `rotateY` 3D "page flip" when opening.
- **Layout Alignment:** Matched the padding across the `CurriculumView` to mirror the `Timeline` panel (`max-w-2xl mx-auto`), dropping edge-to-edge layouts for a more contained, readable experience.
- **Resources Restructure:** Moved Curriculum Resources from a rigid side-column into an elegant, collapsible dropdown menu nested directly beneath the syllabus.
- **Scrollbar Suppression:** Injected `.scrollbar-hide` CSS utilities into `global.css` to permanently hide ugly browser scrollbars while retaining full horizontal scroll capabilities.

## [2026-05-23] Curriculum Architecture Complete Rewrite (v2)
- **Database Schema Overhaul:** Scrapped the flat curriculum design in favor of a 5-table relational structure: `curriculum_categories`, `curricula`, `curriculum_topics`, `curriculum_resources`, and `media_log`.
- **Database Seeding (`seed_complete.sql`):** Created a monolithic SQL transaction that purges old legacy curriculum data and cleanly seeds 4 master categories, 16 comprehensive subjects (Career, Academic, Self, Media & Lit), and 15 media log watchlist items.
- **Media Log / Watchlist:** Implemented a dedicated tracking system for Books, Movies, and Shows, allowing the user to mark items as "In Progress" or "Want to Read", add 5-star ratings, and tag them by genre.

## [2026-05-08] Leveling & XP Engine Integration
# Changelog

All notable changes to Polaris will be documented in this file.

## [2026-09-06] Scout Opportunities Upgrade
- **Scout Precision Upgrade**: Modified the `scout-opportunities` edge function to request full `markdown` content from the Firecrawl search API instead of just relying on the short HTML meta descriptions. The LLM is now fed up to 2000 characters of the actual opportunity page, allowing it to correctly verify strict eligibility requirements (like Bangladeshi citizenship or no-fee applications) rather than guessing from a 160-character snippet.
- **Aggregator Rejection**: Updated the scout LLM prompt to explicitly reject generic aggregator links, newsletters, and "Top 10" lists (like Substack) to ensure only direct, actionable applications make it to the dashboard.
- **Overdue Task Triage (Stages 1 & 2)**: Added `skip_count` column to the `tasks` table and injected current system date into the `task_triage.js` LLM prompt to enable date-aware deadline evaluation.

## [2026-09-01] Sprint: Triage & Morning Brief
### Changed
- **Thermonuclear Security Update**: Fixed 12 tables that were exposed by weak RLS policies (`auth only` or `Allow all for authenticated`). Added missing `user_id` columns to `workout_goals`, `workout_performance`, and `plan_exercises` to ensure cross-tenant data isolation.
- **Hardware Scout Tag System Fixes**: Replaced raw text spans with pill-styled UI badges for tags (`Deadline`, `Effort`, `Fit`) in `HardwareScoutPanel.jsx`. Added optimistic UI updates for dismissing and activating opportunities.
- **Local Triage Pipeline Fix**: Fixed bug where `task_triage.js` failed to parse the local LLM output when exactly one unsorted task was found (handling object vs array responses).

- **Eisenhower Matrix Coordinates Fix**: Added a Supabase migration to create missing canvas_x and canvas_y columns in the 	asks table, resolving the bug where untethered tasks would snap back or disappear when dragged across the spatial canvas.
- **Backlog Obliteration Fix**: Removed the hover-state trash icon from the Brain Dump Backlog list to prevent accidental deletions while attempting to drag. Task deletion is now safely located inside the Task Details pane with a confirmation prompt.
- **Hide Far Scheduled Tasks**: Added a toggle control to the Eisenhower Canvas to hide tasks scheduled more than 7 days in the future, keeping the matrix clean while preserving visibility for upcoming week deliverables.

- **Day Guide View Scrolling Fix**: Resolved layout height and scroll truncation across all four sub-tabs (`Matrix`, `Picks`, `Auditor`, `Brief`). Replaced conflicting `min-h-screen` and `md:h-screen` classes with `h-full` and added `min-h-0` flex constraints on parent wrappers, allowing content to scroll smoothly to the bottom without getting clipped by Dashboard overflow boundaries. Added `pb-32` spacing to ensure buttons and lists clear the viewport.
- **Morning Brief Edge Function**: Migrated Morning Brief generation logic to a Supabase Edge Function (`generate-morning-brief`). RSS fetching and parsing for fixed feeds, manual summary processing for curated feeds, Groq API calling, reasoning suppression, and JSON extraction now run entirely server-side. Removed `VITE_GROQ_API_KEY` from the client `.env` and rewired `useMorningBrief` and `DayBriefView` to invoke the Edge Function directly via `supabase.functions.invoke`.
- **Day Brief Redesign**: Refactored `DayBriefView` to use the `useTodaysTasks` hook as its data source, matching the task scope used elsewhere in the app. Replaced the "...and X more" pattern with full lists, and added a dynamic summary paragraph at the top detailing the count of urgent/strategic tasks and the title of the current highest-priority weekly campaign goal.
- **Goal Scopes Updated**: The 5-year goal scope (`5yr`) was renamed to "Decade" (`decade`) across the UI, components, and database schema.
- **Anchor Panel Layout Shift**: Restored the Anchor Panel's toggle button to its clean `absolute` positioning to eliminate the empty glass bar on the left side of the screen when collapsed. When expanded, the panel now acts as a `w-96` flex container that correctly shifts adjacent content to the right (like the Brain Dump panel and Day Guide header) instead of blocking it.
- **Brain Dump Layout Impeccable Alignment**: Fixed horrendous vertical misalignment down the left axis of the Brain Dump panel by standardizing all internal container paddings to `px-4 py-3`. Unlocked perfect horizontal alignment and rhythm between the header, quick capture input, search bar, and task cards. Also centered the collapse chevron when the panel is closed to eliminate the squished "no padding" bug, and made the tabs (`flex-1`) distribute evenly to fix the awkward empty gap.
- **Form Input Consistency**: Replaced mismatched `rounded-xl` corners on the "DUMP" button and input field with `rounded-lg` to match the search bar and project design guidelines ("somewhat rounded rectangles").
- **Brain Dump Text Wrap**: Refined the "Notes" section wrapping to use `break-words` instead of `break-all`. This ensures that normal words are no longer split aggressively in the middle of characters, while long unbroken URLs still wrap properly.
- **Brain Dump Tabs Overflow**: Replaced the text labels (`BACKLOG`, `COMPLETED`, `DETAILS`) with vector icons (`List`, `CheckCircle2`, `FileText`) and numeric counters. This completely eliminates the horizontal cramming issue and guarantees all tabs and the collapse chevron fit comfortably without scrolling.
- **Matrix Canvas Controls**: Removed the floating controls bar (zoom, completed toggle, AI audit trigger) from the Spatial Matrix canvas to declutter the interface, as these functions are redundant or accessible elsewhere.
- **Matrix Sidebar Layout Shift**: Moved the "Brain Dump" sidebar in the Day Guide's Matrix Canvas view to the left side of the screen. This prevents it from getting cut off by the global Reminders Panel that sits on the right.
- **Brain Dump Nav Styling**: Fixed the Brain Dump sub-navigation tabs to follow the "somewhat rounded rectangles" design system (`rounded-lg`), added `whitespace-nowrap` to prevent awkward text wrapping, and improved padding for better legibility.
- **Day Guide Tab Order**: Reordered the Day Guide sub-tabs to push "DAY BRIEF" to the 4th position as it's considered non-essential for now. The default view upon opening Day Guide is now the "CONSTELLATION MATRIX" (Spatial).

### Added
- **Pomodoro Pop-Out Timer**: Implemented a Picture-in-Picture (PiP) mode for the Pomodoro Timer using the experimental Document PiP API. Clicking the pop-out icon opens a dedicated, floating window for the timer that persists on top of other applications, keeping it fully visible without needing multiple tabs open.

- **Morning Brief Read More Links**: Added "Read more ->" links to each Morning Brief item card across `SparkPopup` and `DayBriefView`, opening the original article source in a new tab with security attributes (`target="_blank" rel="noopener noreferrer"`).
- **Morning Brief UI**: Wired up the `useMorningSequence` hook to the UI. Created `SparkPopup` to display the day's positive climate signals. It automatically pops up during the "spark" stage on initialization and includes a dismiss button that marks the brief as seen, navigating straight to the Day Brief view. The day's climate signals are also rendered statically at the top of the Day Brief view so they can be revisited at any time.
- **Morning Brief Generation**: Implemented the `useMorningBrief` hook that triggers on app load. It asks Groq (bypassing the manual opt-in rule as an intentional exception) to generate 3 recent, positive climate-tech/renewable-energy developments based on the user's active `brief_sources` and saves them to `morning_briefs`.
- **Task Details Sub-Nav**: Added a "DETAILS" sub-tab to the Brain Dump side panel in the Day Guide's spatial matrix (`MatrixCanvasView`). Clicking any task pill (in the matrix, backlog, or completed list) now loads the full task details (title, notes, estimate, status) in the side panel without truncation.
- **Surprise Me Task Randomizer**: Built `SurpriseTaskModal.jsx` and added the dice-roll icon to `RemindersPanel` and `FocusBoard` to randomly pick incomplete daily tasks.
- **Unified Tasks Hook**: Created `useTodaysTasks.js` to combine `daily_tasks` and `goals` (where `scope='daily'`) into a unified array.
- **Play View**: Added a mini-games hub under the Orbit tab for zero-tracking, relaxing web games.
- **Hover Lift Animations**: Standardized `glass-hover hover:-translate-y-1 transition-transform` on all clickable card components (Goals, Curriculum, Media, Play, Timeline, Reminders).

### Changed
- **Nudge Formatting**: Refactored overdue nudges to display relative time (e.g., `Due X min ago`, `Due Xh ago`, `Due Xd ago`, capping at `Overdue` past 7 days).
- **Reminders Panel Layout**: Reordered sections to prioritize "Today's Tasks" at the top, followed by "Nudges", and then "Reach Out".

### Fixed
- **Eisenhower Matrix Auto-Tether Restored**: Restored the auto-tethering logic so untethered tasks cleanly snap back into matrix lists when dropped.
- **Task Details Panel UX Improvements**: 
  - Restructured the grid layout to place Quadrant, Estimate, and Status on a single compact line to prevent horizontal overflow in the side panel.
  - Shortened Quadrant dropdown options to 2-letter indicators (Q1, Q2, Q3, Q4) for faster selection.
  - Fixed the Date Picker visual bug (rogue comma appearing) by swapping to the standard system sans-serif font which correctly handles the native date formatter's spacing.


- **Pomodoro Pop-Out Timer Fix**: Completely removed the experimental Document Picture-in-Picture (PiP) API in favor of a standard `window.open` popup. The Document PiP API was found to consume the browser's single global PiP slot, which forcefully kicked out other video PiP sessions (like study lectures) on other tabs. The timer now opens in a safe, isolated window that won't interfere with media playback elsewhere.

- **Pomodoro Pop-Out Timer Fix**: Added robust fallback to traditional `window.open` popup if the experimental Document PiP API fails or is unavailable on localhost. Added a "Bring Back" button and fixed window focus management to prevent the button from becoming unresponsive if the popup is closed forcefully.

- **Mobile Styling**: Fixed tab pill wrapping in `BottomNav.jsx` and padded the `ConstellationGraph` container to prevent nodes from clipping on small screens.
- **Service Worker Message Parsing**: Updated `sw-notifications.js` to correctly handle `Array.isArray(event.data)` vs `{ type: 'UPDATE_NUDGES', nudges: [...] }` to fix the Nudge notification bug.

## [2026-06-09] Database Schema Audit & Fixes
- **Bug Fix (Goals Panel):** Identified and resolved a constraint issue where the `goals` table's `goals_scope_check` blocked `daily` and `side_quest` goal scopes.
- **Bug Fix (Goals Panel):** Added missing `description` and `deadline` columns to the `goals` table to ensure the GoalsPanel functions without silently dropping data.
- **Bug Fix (Fitness Bridge):** Added rigorous `user_id` filtering to the `workout_logs`, `meal_logs`, and `weight_logs` queries in `FitnessBridge.jsx` to prevent data leaking across users if Row Level Security (RLS) is disabled or misconfigured.
- **Bug Fix (Pomodoro Data):** Corrected a silent failure in `CurriculumView.jsx` where it attempted to read a non-existent `duration` column from `pomodoro_logs` instead of the correct `duration_minutes` column.

## [2026-05-24] Curriculum UI/UX Visual Overhaul
- **Aesthetic Update:** Implemented a single-row horizontal scrolling bookshelf, replacing the older grid layout, giving a highly premium "library" feel.
- **Interactive Books:** Upgraded `BookSpine.jsx` to feature 3D interactions. Books now lift outward `translateY(-16px) scale(1.06)` on hover, and execute a fully animated `rotateY` 3D "page flip" when opening.
- **Layout Alignment:** Matched the padding across the `CurriculumView` to mirror the `Timeline` panel (`max-w-2xl mx-auto`), dropping edge-to-edge layouts for a more contained, readable experience.
- **Resources Restructure:** Moved Curriculum Resources from a rigid side-column into an elegant, collapsible dropdown menu nested directly beneath the syllabus.
- **Scrollbar Suppression:** Injected `.scrollbar-hide` CSS utilities into `global.css` to permanently hide ugly browser scrollbars while retaining full horizontal scroll capabilities.

## [2026-05-23] Curriculum Architecture Complete Rewrite (v2)
- **Database Schema Overhaul:** Scrapped the flat curriculum design in favor of a 5-table relational structure: `curriculum_categories`, `curricula`, `curriculum_topics`, `curriculum_resources`, and `media_log`.
- **Database Seeding (`seed_complete.sql`):** Created a monolithic SQL transaction that purges old legacy curriculum data and cleanly seeds 4 master categories, 16 comprehensive subjects (Career, Academic, Self, Media & Lit), and 15 media log watchlist items.
- **Media Log / Watchlist:** Implemented a dedicated tracking system for Books, Movies, and Shows, allowing the user to mark items as "In Progress" or "Want to Read", add 5-star ratings, and tag them by genre.

## [2026-05-08] Leveling & XP Engine Integration
- **Centralized Logic:** Deployed `src/data/xpRewards.js` as the single source of truth for all XP values across the entire application (Pomodoros, Curriculum topics, Goals, I/O Balance).
- **Punishment Removal:** Stripped out the negative (-300 XP) punitive buttons, favoring a purely positive-reinforcement structure based on the user's ADHD-friendly requirements.
- **Global Font Swap:** Set `DM Serif Display` as the global header font to achieve the desired "Dark Academia" aesthetic.

---
*(End of current logs)*
- 2026-09-02: Tweaked DayBriefView to show past opportunities if scouts find none, added System Alerts card to StatsModal and indicator dot to HUD for monitoring background tasks, and improved mobile canvas touch experience in MatrixCanvasView by disabling hover actions.
- 2026-09-02 (Hotfix): Fixed MatrixCanvasView database update crashes caused by unmigrated canvas_x/canvas_y columns, which broke the 'Return to Brain Dump', 'Untether', and 'Retether' task actions.

## [2026-09-04] Scout Opportunities Update
- **Scout Config Updated**: Updated `scout-opportunities` edge function query and LLM prompt to actively look for fully-funded global travel, international internships, and field research expeditions. 
- **Groq Rate Limit Fix**: Fixed an issue where the Scout would fail silently due to requesting 1024 max_tokens (Groq free tier limit is 1000). Reduced `max_tokens` to 800.-   * * B u g   F i x   ( H U D ) : * *   A d d e d   m i s s i n g   \ u s e r _ i d \   f i l t e r s   t o   t h e   \ m o r n i n g _ b r i e f s \   a n d   \ 	 a s k s \   q u e r i e s   i n   \ H U D . j s x \   t o   f i x   s c h e m a   d r i f t   w a r n i n g s   a n d   p r e v e n t   p o t e n t i a l   d a t a   l e a k s . 
 
 

