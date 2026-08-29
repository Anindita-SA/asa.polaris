import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useCelebration } from './useCelebration';

export const useGoalCompletion = () => {
  const { user, trackXP, providerToken } = useAuth();
  const { celebrate } = useCelebration();

  const patchGoogleTask = async (taskId, status) => {
    if (!providerToken) return;
    try {
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${providerToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
    } catch (e) {
      console.error("Failed to sync completed status to Google Tasks:", e);
    }
  };

  const toggleGoal = async (goal, onUpdate, e) => {
    const completed = !goal.completed;
    const newCurrent = completed ? Math.max(goal.current, goal.target || 1) : 0;
    const wasCompleted = goal.completed;

    if (onUpdate) {
      onUpdate({ ...goal, current: newCurrent, completed });
    }

    await supabase.from('goals').update({ current: newCurrent, completed }).eq('id', goal.id).eq('user_id', user?.id);

    if (completed && !wasCompleted) celebrate(e ? { x: e.clientX, y: e.clientY } : undefined);
    trackXP(wasCompleted, completed, goal.xp_reward || 50);

    if (completed && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'completed');
    } else if (!completed && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'needsAction');
    }
  };

  const updateGoalProgress = async (goal, delta, onUpdate, e) => {
    const newCurrent = Math.max(0, Math.min(goal.current + delta, goal.target || 1));
    const completed = newCurrent >= (goal.target || 1);
    const wasCompleted = goal.completed;

    if (onUpdate) {
      onUpdate({ ...goal, current: newCurrent, completed });
    }

    await supabase.from('goals').update({ current: newCurrent, completed }).eq('id', goal.id).eq('user_id', user?.id);

    if (completed && !wasCompleted) celebrate(e ? { x: e.clientX, y: e.clientY } : undefined);
    trackXP(wasCompleted, completed, goal.xp_reward || 50);

    if (completed && !wasCompleted && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'completed');
    } else if (!completed && wasCompleted && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'needsAction');
    }
  };

  return { toggleGoal, updateGoalProgress };
};
