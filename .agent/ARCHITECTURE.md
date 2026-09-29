# Polaris Architecture Map

This document maps features/tabs/panels to their component files, hooks, Supabase tables, and shared utilities.

## 1. Day Guide & Planning
**Files:**
- `src/components/views/DayGuideView.jsx`
- `src/components/DayChunker.jsx`
- `src/components/TodaysTasksShuffle.jsx`
- `src/components/journal/DailyTasks.jsx`
- `src/components/views/DayBriefView.jsx`
**Hooks:** `useTodaysTasks.js`, `useMorningBrief.js`, `useMorningSequence.js`
**Tables:** `tasks`, `daily_tasks`, `day_plan_blocks`, `morning_briefs`, `goals`, `hardware_opportunities`, `media_log`
**Shared By:** Focus Board, Node Panel, Timeline, Hardware Scout (all interact with `tasks`).

## 2. Matrix Canvas (Task Matrix)
**Files:**
- `src/components/views/MatrixCanvasView.jsx`
- `src/components/TaskMatrix.jsx`
**Hooks:** `useWSJFScore.js`
**Tables:** `tasks`, `milestones`, `recurring_task_templates`, `task_estimate_calibration`
**Shared By:** Day Guide, Focus Board (shares `tasks`), Journal (shares `recurring_task_templates`).

## 3. Focus Board
**Files:**
- `src/components/panels/FocusBoard.jsx`
**Tables:** `focus_items`, `milestones`, `tasks`, `backburner`
**Shared By:** Matrix Canvas, Timeline, Node Panel (shares `milestones`, `tasks`).

## 4. Curriculum / Library
**Files:**
- `src/components/panels/Curriculum.jsx`
- `src/components/curriculum/CurriculumShelf.jsx`
- `src/components/curriculum/CurriculumView.jsx`
- `src/components/curriculum/MediaLog.jsx`
- `src/components/curriculum/PracticeScoreTracker.jsx`
- `src/components/curriculum/TopicCard.jsx`
- `src/components/curriculum/BookSpine.jsx`
- `src/components/curriculum/AddMediaModal.jsx`
**Tables:** `curriculum_categories`, `curricula`, `curriculum_topics`, `curriculum_resources`, `media_log`, `practice_scores`, `pomodoro_logs`
**Shared By:** Day Brief View (shares `media_log`), Pomodoro Timer (shares `pomodoro_logs`).

## 5. Journal & Highlights
**Files:**
- `src/components/journal/Journal.jsx`
- `src/components/journal/MonthlyHabitGrid.jsx`
- `src/components/journal/WinsBook.jsx`
- `src/components/journal/YearInPixels.jsx`
**Hooks:** `useRecurringTasks.js`
**Tables:** `highlights`, `mood_logs`, `recurring_task_templates`, `tasks`, `nodes`, `wins`
**Shared By:** Matrix Canvas (shares `recurring_task_templates`), Goals / Constellation (shares `nodes`).

## 6. Goals & Constellation
**Files:**
- `src/components/widgets/GoalsPanel.jsx`
- `src/components/graph/ConstellationGraph.jsx`
- `src/components/graph/GoalConstellation.jsx`
**Hooks:** `useGoalCompletion.js`, `useGoogleTasks.js`
**Tables:** `goals`, `nodes`
**Shared By:** Journal, Timeline, Node Panel (shares `nodes`); Pomodoro Timer (shares `goals`).

## 7. Node Panel & Timeline
**Files:**
- `src/components/panels/NodePanel.jsx`
- `src/components/panels/Timeline.jsx`
**Tables:** `goals`, `milestones`, `tasks`, `nodes`
**Shared By:** Focus Board, Goals & Constellation.

## 8. Reach Out & Relationships
**Files:**
- `src/components/panels/ReachOutView.jsx`
- `src/components/panels/RelationshipsView.jsx`
- `src/components/panels/reachout/ReachOutFilterBar.jsx`
- `src/components/panels/reachout/BatchImportModal.jsx`
- `src/components/panels/reachout/ReachOutTargetCard.jsx`
- `src/components/panels/reachout/TargetFormModal.jsx`
**Hooks:** `useContactReminders.js`
**Tables:** `outreach_targets`, `contacts`
**Shared By:** Standalone network modules.

## 9. Hardware Scout
**Files:**
- `src/components/panels/HardwareScoutPanel.jsx`
**Tables:** `hardware_opportunities`, `tasks`
**Shared By:** Day Brief View.

## 10. Reminders & Nudges
**Files:**
- `src/components/panels/RemindersPanel.jsx`
**Hooks:** `useNudgeScheduler.js`
**Tables:** `tasks`, `nudges`
**Shared By:** Background scheduler.

## 11. Fitness Bridge
**Files:**
- `src/components/panels/FitnessBridge.jsx`
**Tables:** `workout_logs`, `meal_logs`, `weight_logs`
**Shared By:** Standalone health tracker.

## 12. Play View (Mini Games)
**Files:**
- `src/components/orbit/PlayView.jsx`
**Tables:** `mini_games`

## 13. Anchor Panel
**Files:**
- `src/components/anchor/AnchorPanel.jsx`
**Tables:** `eulogies`

## 14. Settings
**Files:**
- `src/components/panels/SettingsPanel.jsx`
- `src/components/modals/NotificationSettingsModal.jsx`
**Hooks:** `useUserSettings.js`, `useNotificationSettings.js`
**Tables:** `user_settings`, `recurring_task_templates`

## Shared Utilities
- **`src/lib/offlineApi.js`, `offlineStore.js`, `syncManager.js`, `syncQueue.js`**: Core indexedDB + Supabase sync engine. Used by EVERY feature that mutates data.
- **`src/lib/supabase.js`**: App-wide database client initialization.
- **`src/lib/llm.js`**: AI integration used heavily in Planning (Day Guide) and potentially Hardware Scout.
- **`src/lib/safeMutate.js`**: Wrapper for executing offline mutations safely.
- **`src/lib/sound.js`**: App-wide UI interaction sounds.
- **`src/hooks/useAuth.jsx`**: Global app auth and initial context hydration.
- **`src/components/layout/*`** (`HUD.jsx`, `BottomNav.jsx`, `Starfield.jsx`, `BottomSheet.jsx`): Shared shell layout.
- **`src/components/widgets/*`** (`PomodoroTimer.jsx`, `MusicPlayer.jsx`): Floating global tools.
