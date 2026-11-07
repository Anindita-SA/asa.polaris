# Task Timer Searchable Task Selector Implementation Plan

## Problem Statement
In Polaris, the task selection within the Pomodoro Timer (both widget and fullscreen expanded view) previously rendered a native HTML `<select>` tag containing all tasks across Today's Curated list and all Eisenhower quadrants (Q1-Q4). When the user had 20+ active tasks, opening the dropdown expanded a huge, unscrollable OS menu that obscured the entire screen and made locating a specific task cumbersome and slow.

The user requested an inline search capability directly inside the timer widget so they can quickly type keywords (e.g. "lca", "filter", "emi") and select from a compact, categorized list.

---

## Architectural Decisions

1. **Inline Searchable Combobox Component (`TimerTaskSearch.jsx`)**:
   - Create a dedicated, reusable component in `src/components/widgets/TimerTaskSearch.jsx`.
   - Used in both the anchored timer widget and the fullscreen expanded view in `PomodoroTimer.jsx`.
   - Renders a sleek input with a search icon (`Search`), clear button (`X`), and dropdown chevron (`ChevronDown`/`ChevronUp`).
   - Maintains full accessibility and test compatibility by providing `role="combobox"`.

2. **Smart Search & Filter Engine**:
   - When the user types, it filters tasks across all categories in real-time matching against `title` and `notes`.
   - Displays clean quadrant badges (Q1, Q2, Q3, Q4, Today) alongside task titles and estimated duration.
   - When the search query is empty, tasks are categorized by quadrant groups with clear section dividers, capped at a comfortable scrollable height (`max-h-60`) to avoid screen spillover.
   - Fallback action: If no tasks match the search query, the user can click to "Use '[query]' as focus topic", directly setting the session comment/title.

3. **Interaction & State Sync**:
   - Selecting a task automatically triggers `handleSelectTodayTask(taskId)`, syncing task comment, IO type (`classifyTaskType`), and task completion state.
   - Clicking outside automatically closes the dropdown via a click-outside ref handler.
   - Keyboard navigation supports `ArrowDown`, `ArrowUp`, `Enter`, and `Escape`.
   - Backward compatibility: If an event or test emits a change with a matching task ID, it directly selects the task.

4. **Design Language & Quality Rules**:
   - Strictly dark/void background with glassmorphic surfaces (`glass`, `bg-void/90`, `border-pulsar/40`, `border-amber-400/40`).
   - Amber accents for active/attention states.
   - Strictly no gradients (no linear-gradient, radial-gradient, `bg-gradient-*`).
   - Strictly no em dashes or en dashes in any text.

---

## File Changes
- **`src/components/widgets/TimerTaskSearch.jsx`**: New component implementing the searchable combobox.
- **`src/components/widgets/PomodoroTimer.jsx`**: Integrate `TimerTaskSearch` in both the anchored widget view and expanded view.
- **`src/components/widgets/PomodoroTimer.test.jsx`**: Add test coverage for searching and selecting tasks via the new search input, verifying existing test suite remains green.
- **`docs/CHANGELOG.md`**: Document the new searchable timer task selector.

---

## Verification Plan
1. Run `npm test` to verify all 46 test suites and 506 unit tests pass.
2. Run `npm run build` to verify clean Vite build with zero bundle errors.
3. Verify keyboard navigation (arrow keys, enter, escape) and click-outside dismiss.
4. Verify empty state fallback ("Use query as focus topic").
