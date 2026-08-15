# Changelog

All notable changes to Polaris will be documented in this file.

## [Current Version]
### Added
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
