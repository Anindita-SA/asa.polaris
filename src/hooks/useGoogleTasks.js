import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useGoalCompletion } from './useGoalCompletion';

export const useGoogleTasks = () => {
  const { user, providerToken } = useAuth();
  const { toggleGoal } = useGoalCompletion();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const fetchGoogleTasks = async (token) => {
    const res = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=true&showHidden=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch Google Tasks');
    const data = await res.json();
    return data.items || [];
  };

  const patchGoogleTask = async (token, taskId, status) => {
    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`Failed to patch task ${taskId}`);
  };

  const sync = useCallback(async () => {
    if (!user || !providerToken) {
      alert("Please sign in with Google to sync tasks.");
      return null;
    }

    setIsSyncing(true);
    let newCount = 0;
    let completedCount = 0;

    try {
      // a. Fetch all Google Tasks
      const gTasks = await fetchGoogleTasks(providerToken);

      // b. Fetch today's daily goals from Supabase
      const { data: currentGoals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('scope', 'daily');

      if (error) throw error;

      const gTaskMap = new Map(gTasks.map(t => [t.id, t]));
      const goalMapByGTaskId = new Map(
        currentGoals.filter(g => g.google_task_id).map(g => [g.google_task_id, g])
      );

      // c. For each Google Task not already in goals: insert
      const toInsert = [];
      for (const t of gTasks) {
        if (!goalMapByGTaskId.has(t.id) && t.status !== 'completed') {
          toInsert.push({
            user_id: user.id,
            title: t.title,
            scope: 'daily',
            target: 1,
            unit: 'done',
            current: 0,
            completed: false,
            xp_reward: 50,
            google_task_id: t.id
          });
          newCount++;
        }
      }
      
      if (toInsert.length > 0) {
        await supabase.from('goals').insert(toInsert);
      }

      // d. For each Google Task marked completed remotely: mark matching Polaris goal completed
      for (const t of gTasks) {
        if (t.status === 'completed') {
          const matchingGoal = goalMapByGTaskId.get(t.id);
          if (matchingGoal && !matchingGoal.completed) {
            await toggleGoal(matchingGoal, null);
            completedCount++;
          }
        }
      }

      // e. For each Polaris daily goal with google_task_id that is completed: PATCH
      for (const goal of currentGoals) {
        if (goal.google_task_id && goal.completed) {
          // Fire and forget PATCH
          patchGoogleTask(providerToken, goal.google_task_id, 'completed').catch(e => console.error("Failed to patch Google Task:", e));
        }
      }

      setLastSynced(new Date());
      return { newCount, completedCount };

    } catch (err) {
      console.error("Sync error:", err);
      alert("Failed to sync tasks: " + err.message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, providerToken, toggleGoal]);

  return { sync, isSyncing, lastSynced };
};
