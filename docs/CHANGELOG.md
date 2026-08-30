# Changelog

All notable changes to Polaris will be documented in this file.

## [Current Version]
### Changed
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
- **Pomodoro Pop-Out Timer Fix**: Completely removed the experimental Document Picture-in-Picture (PiP) API in favor of a standard `window.open` popup. The Document PiP API was found to consume the browser's single global PiP slot, which forcefully kicked out other video PiP sessions (like study lectures) on other tabs. The timer now opens in a safe, isolated window that won't interfere with media playback elsewhere.

- **Pomodoro Pop-Out Timer Fix**: Added robust fallback to traditional `window.open` popup if the experimental Document PiP API fails or is unavailable on localhost. Added a "Bring Back" button and fixed window focus management to prevent the button from becoming unresponsive if the popup is closed forcefully.

- **Mobile Styling**: Fixed tab pill wrapping in `BottomNav.jsx` and padded the `ConstellationGraph` container to prevent nodes from clipping on small screens.
- **Service Worker Message Parsing**: Updated `sw-notifications.js` to correctly handle `Array.isArray(event.data)` vs `{ type: 'UPDATE_NUDGES', nudges: [...] }` to fix the Nudge notification bug.

