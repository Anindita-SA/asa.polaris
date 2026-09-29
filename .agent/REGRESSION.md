# Polaris Regression Checks

**HIGH RISK SHARED FILES:**
Modifications to the following shared files require full app regression testing because they are used by 3+ features (almost all data-mutating features):
- `src/lib/offlineApi.js`, `src/lib/offlineStore.js`, `src/lib/syncManager.js`, `src/lib/syncQueue.js`
- `src/lib/supabase.js`, `src/lib/safeMutate.js`
- `src/hooks/useAuth.jsx`
- `src/components/layout/HUD.jsx`, `BottomNav.jsx`

---

## 1. Day Guide & Planning
- **Check 1:** Click to add a new task in the Day Guide. Type "Read 30 mins" and submit. Verify it appears in the list and the estimated duration auto-populates.
- **Check 2:** Drag and drop a task between the "Morning", "Afternoon", and "Evening" chunks. Verify the task stays in the new chunk after a page refresh.
- **Check 3:** Click the checkbox on a task to mark it done. Verify it visually crosses out, moves to the completed section, and triggers a sound/celebration (if enabled).
- **Check 4:** View the Day Brief. Verify that all News & Tech Breakthrough items have their source tag rendering correctly (not an empty box).

## 2. Matrix Canvas (Task Matrix)
- **Check 1:** Open the Task Matrix view. Verify tasks are plotted on the 2D grid based on urgency and importance.
- **Check 2:** Drag a task node from one quadrant to another (e.g., from top-left to bottom-right). Verify its position updates and persists.
- **Check 3:** Double-click or tap a task on the canvas. Verify a modal or detail view opens allowing you to edit its name or deadline.

## 3. Focus Board
- **Check 1:** Add a new Focus Item. Verify it appears in the active focus column.
- **Check 2:** Drag a Focus Item to the "Backburner" area. Verify it moves successfully and clears from the active list.
- **Check 3:** Click to edit a Focus Item's "Why Now" context. Save and verify the text updates in the card.

## 4. Curriculum / Library
- **Check 1:** Open the Curriculum Shelf. Click on a curriculum card. Verify it opens the detailed Curriculum View with chapters/topics.
- **Check 2:** Inside a Curriculum, click "Mark Complete" on a topic. Verify the progress bar updates and the topic shows a completed state.
- **Check 3:** Go to the Media Log (or Add Media Modal). Add a new book or video. Verify it appears on the shelf.

## 5. Journal & Highlights
- **Check 1:** Open the Journal. Type a new "Win" in the Wins Book and save. Verify it appears in today's list.
- **Check 2:** Click a cell in the Monthly Habit Grid to toggle a habit. Verify the cell changes color.
- **Check 3:** Select a mood color in the Year in Pixels grid for today. Verify the grid cell updates immediately.

## 6. Goals & Constellation
- **Check 1:** Open the Constellation Graph. Verify nodes (goals/milestones) render correctly with linking lines.
- **Check 2:** Add a new Goal via the Goals Panel. Set a target number. Verify it appears in the panel and on the graph.
- **Check 3:** Increment progress on an existing goal (e.g., 5/10 to 6/10). Verify the progress bar updates and the graph node visually reflects progress.

## 7. Node Panel & Timeline
- **Check 1:** Open the Timeline view. Verify milestones and tasks are ordered chronologically by deadline.
- **Check 2:** In the Node Panel, create a new child node under an existing node. Verify the hierarchy updates.
- **Check 3:** Update the status of a milestone in the Timeline. Verify it moves to the appropriate section or changes color.

## 8. Reach Out & Relationships
- **Check 1:** Open Reach Out View. Click "Add Target", fill in a name and tier, and save. Verify the new card appears.
- **Check 2:** Use the Reach Out Filter Bar to filter by "Active". Verify the list updates to only show active contacts.
- **Check 3:** Click "Log Contact" on a relationship card. Verify the "Last Contacted" date updates to today.

## 9. Hardware Scout
- **Check 1:** Open the Hardware Scout panel. Add a new opportunity with a URL and deadline. Verify it appears in the list.
- **Check 2:** Change the status of an opportunity from "New" to "Applied". Verify it moves to the correct section.
- **Check 3:** Click on a task linked to an opportunity. Verify it navigates or opens the linked task details.

## 10. Reminders & Nudges
- **Check 1:** Create a new recurring nudge (e.g., every 60 mins). Verify it appears in the active nudges list.
- **Check 2:** Toggle an active nudge to inactive. Verify the UI reflects the change and it moves to the inactive section.

## 11. Fitness Bridge
- **Check 1:** Log a new workout for today. Check off an exercise. Verify it saves.
- **Check 2:** Add a meal log with protein/carbs/fat. Verify the daily macro totals update correctly.
- **Check 3:** Log today's weight. Verify it appears in the recent weight logs history.

## 12. Play View (Mini Games)
- **Check 1:** Open the Play View. Click on a mini-game thumbnail. Verify it launches the game or external URL.

## 13. Anchor Panel
- **Check 1:** Open the Anchor Panel. Edit the eulogy/anchor text and save. Verify the text persists after refreshing the page.

## 14. Settings
- **Check 1:** Open Settings. Change the theme or toggle a notification setting. Verify the setting saves and the UI updates (if applicable).
- **Check 2:** Edit user profile details (e.g., birth year, activity level). Save and verify the changes persist.
