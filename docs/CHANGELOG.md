# Changelog

All notable changes to Polaris will be documented in this file.

## [Current Version]
### Changed
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
- **Task Details Sub-Nav**: Added a "DETAILS" sub-tab to the Brain Dump side panel in the Day Guide's spatial matrix (`MatrixCanvasView`). Clicking any task pill (in the matrix, backlog, or completed list) now loads the full task details (title, notes, estimate, status) in the side panel without truncation.
- **Surprise Me Task Randomizer**: Built `SurpriseTaskModal.jsx` and added the dice-roll icon to `RemindersPanel` and `FocusBoard` to randomly pick incomplete daily tasks.
- **Unified Tasks Hook**: Created `useTodaysTasks.js` to combine `daily_tasks` and `goals` (where `scope='daily'`) into a unified array.
- **Play View**: Added a mini-games hub under the Orbit tab for zero-tracking, relaxing web games.
- **Hover Lift Animations**: Standardized `glass-hover hover:-translate-y-1 transition-transform` on all clickable card components (Goals, Curriculum, Media, Play, Timeline, Reminders).

### Changed
- **Nudge Formatting**: Refactored overdue nudges to display relative time (e.g., `Due X min ago`, `Due Xh ago`, `Due Xd ago`, capping at `Overdue` past 7 days).
- **Reminders Panel Layout**: Reordered sections to prioritize "Today's Tasks" at the top, followed by "Nudges", and then "Reach Out".

### Fixed
- **Mobile Styling**: Fixed tab pill wrapping in `BottomNav.jsx` and padded the `ConstellationGraph` container to prevent nodes from clipping on small screens.
- **Service Worker Message Parsing**: Updated `sw-notifications.js` to correctly handle `Array.isArray(event.data)` vs `{ type: 'UPDATE_NUDGES', nudges: [...] }` to fix the Nudge notification bug.
