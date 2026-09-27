import { supabase } from '../lib/supabase';
import { safeMutate } from '../lib/safeMutate';
import { useAuth } from './useAuth';
import { useCelebration } from './useCelebration';
import { offlineSelect, offlineUpdate } from '../lib/offlineApi';

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

  const performRollup = async (goalId, userId) => {
    let currentId = goalId;
    while (currentId) {
      const { data: goalDataList } = await offlineSelect('goals', { id: currentId, user_id: userId });
      const goalData = goalDataList && goalDataList[0];
      if (!goalData || !goalData.parent_goal_id) break;

      const parentId = goalData.parent_goal_id;

      const { data: siblings } = await offlineSelect('goals', { parent_goal_id: parentId, user_id: userId });
      if (!siblings || siblings.length === 0) break;

      let sum = 0;
      for (const sib of siblings) {
        const t = sib.target || 1;
        sum += Math.min(sib.current / t, 1);
      }
      const avgProgress = sum / siblings.length;

      const { data: parentGoalList } = await offlineSelect('goals', { id: parentId, user_id: userId });
      const parentGoal = parentGoalList && parentGoalList[0];
      if (!parentGoal) break;

      const parentTarget = parentGoal.target || 1;
      // Round to 2 decimal places to avoid float precision issues, or just use it directly
      const newCurrent = Math.round(parentTarget * avgProgress * 100) / 100;
      const completed = newCurrent >= parentTarget;
      const wasCompleted = parentGoal.completed;

      await offlineUpdate('goals', { id: parentId, user_id: userId }, { current: newCurrent, completed });

      if (completed && !wasCompleted) {
        trackXP(wasCompleted, completed, parentGoal.xp_reward || 50);
      }

      if (completed && !wasCompleted && parentGoal.google_task_id) {
        patchGoogleTask(parentGoal.google_task_id, 'completed');
      } else if (!completed && wasCompleted && parentGoal.google_task_id) {
        patchGoogleTask(parentGoal.google_task_id, 'needsAction');
      }

      currentId = parentId;
    }
  };

  const toggleGoal = async (goal, onUpdate, e) => {
    if (!user?.id) return;
    const completed = !goal.completed;
    const newCurrent = completed ? Math.max(goal.current, goal.target || 1) : 0;
    const wasCompleted = goal.completed;

    if (onUpdate) {
      onUpdate({ ...goal, current: newCurrent, completed });
    }

    await offlineUpdate('goals', { id: goal.id, user_id: user.id }, { current: newCurrent, completed });

    if (completed && !wasCompleted) celebrate(e ? { x: e.clientX, y: e.clientY } : undefined);
    trackXP(wasCompleted, completed, goal.xp_reward || 50);

    if (completed && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'completed');
    } else if (!completed && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'needsAction');
    }

    await performRollup(goal.id, user.id);
  };

  const updateGoalProgress = async (goal, delta, onUpdate, e) => {
    if (!user?.id) return;
    const newCurrent = Math.max(0, Math.min(goal.current + delta, goal.target || 1));
    const completed = newCurrent >= (goal.target || 1);
    const wasCompleted = goal.completed;

    if (onUpdate) {
      onUpdate({ ...goal, current: newCurrent, completed });
    }

    await offlineUpdate('goals', { id: goal.id, user_id: user.id }, { current: newCurrent, completed });

    if (completed && !wasCompleted) celebrate(e ? { x: e.clientX, y: e.clientY } : undefined);
    trackXP(wasCompleted, completed, goal.xp_reward || 50);

    if (completed && !wasCompleted && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'completed');
    } else if (!completed && wasCompleted && goal.google_task_id) {
      patchGoogleTask(goal.google_task_id, 'needsAction');
    }

    await performRollup(goal.id, user.id);
  };

  return { toggleGoal, updateGoalProgress };
};

