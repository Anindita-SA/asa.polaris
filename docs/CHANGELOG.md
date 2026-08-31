# Changelog

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
- **Centralized Logic:** Deployed `src/data/xpRewards.js` as the single source of truth for all XP values across the entire application (Pomodoros, Curriculum topics, Goals, I/O Balance).
- **Punishment Removal:** Stripped out the negative (-300 XP) punitive buttons, favoring a purely positive-reinforcement structure based on the user's ADHD-friendly requirements.
- **Global Font Swap:** Set `DM Serif Display` as the global header font to achieve the desired "Dark Academia" aesthetic.

---
*(End of current logs)*
