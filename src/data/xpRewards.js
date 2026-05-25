/**
 * POLARIS — Central XP Rewards Registry
 * 
 * All XP values for every action in the app live here.
 * No component should hardcode an XP number — import from this file.
 */

export const XP = {
  // Daily Habits & Rituals
  HABIT_CHECK:        10,   // Checking a habit in monthly grid / daily view
  RITUAL_CHECK:        5,   // Completing a daily ritual item

  // Daily Tasks
  TASK_COMPLETE:       3,   // Completing a small daily task

  // Pomodoro Focus
  POMODORO_PER_MIN:    1,   // XP per minute of focused Pomodoro session

  // Journal
  JOURNAL_ENTRY:      20,   // Writing a daily journal entry
  JOURNAL_PHOTO:       5,   // Uploading a photo to the journal
  MEDIA_LOG:          15,   // Logging a piece of media in Curriculum

  // Goals
  GOAL_COMPLETE:      50,   // Default XP for completing a goal (overridden by goal.xp_reward)

  // Focus Items (3x3 active focus board)
  FOCUS_COMPLETE:     75,   // Completing an active focus board item

  // Milestones
  MILESTONE_COMPLETE: 100,  // Default XP for completing a milestone (overridden by milestone.xp_reward)

  // Curriculum
  TOPIC_COMPLETE:     25,   // Completing a curriculum topic
  CURRICULUM_COMPLETE: 200, // Completing an entire curriculum (all topics done)

  // I/O Balance
  IO_OUTPUT_LOG:       5,   // Logging an output session
  IO_EQUILIBRIUM:     10,   // Bonus for reaching I/O balance
}
