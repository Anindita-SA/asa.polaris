import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

/**
 * Quadrant weight map:
 * urgent_important = 4
 * important_not_urgent = 3
 * urgent_not_important = 2
 * neither = 1
 * null / unsorted = 0
 */
export const QUADRANT_WEIGHTS = {
  urgent_important: 4,
  important_not_urgent: 3,
  urgent_not_important: 2,
  neither: 1,
};

/**
 * Calculates deadline urgency score:
 * no deadline = 0
 * deadline > 7 days away = 1
 * deadline 3-7 days away = 2
 * deadline < 3 days away = 3
 * deadline today or overdue = 4
 */
export function calculateDeadlineUrgency(deadlineStr) {
  if (!deadlineStr) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadlineStr);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 4; // Today or overdue
  if (diffDays < 3) return 3;  // < 3 days
  if (diffDays <= 7) return 2; // 3-7 days
  return 1;                    // > 7 days
}

/**
 * Calculates duration score:
 * 1 / (estimated_minutes / 60), capped at 4 (so ≤ 15 min scores max 4)
 * if estimated_minutes is null / undefined / <= 0, duration_score = 1 (neutral)
 */
export function calculateDurationScore(estimatedMinutes) {
  if (!estimatedMinutes || typeof estimatedMinutes !== 'number' || estimatedMinutes <= 0) {
    return 1;
  }
  const hours = estimatedMinutes / 60;
  const rawScore = 1 / hours;
  return Math.min(4, Math.max(0.1, rawScore));
}

/**
 * Computes full WSJF score and returns detailed breakdown
 * Score = (quadrant_weight * 0.4) + (deadline_urgency * 0.35) + (duration_score * 0.25)
 */
export function computeWSJFScore(task) {
  const quadrantWeight = task.quadrant ? (QUADRANT_WEIGHTS[task.quadrant] ?? 0) : 0;
  const deadlineUrgency = calculateDeadlineUrgency(task.deadline);
  const durationScore = calculateDurationScore(task.estimated_minutes);

  const totalScore = (quadrantWeight * 0.4) + (deadlineUrgency * 0.35) + (durationScore * 0.25);
  const roundedScore = Math.round(totalScore * 100) / 100;

  return {
    score: roundedScore,
    breakdown: {
      quadrantWeight,
      deadlineUrgency,
      durationScore: Math.round(durationScore * 100) / 100,
    }
  };
}

/**
 * React hook to fetch tasks with status IN ('inbox', 'active') from Supabase tasks table,
 * score each with WSJF algorithm, and return sorted descending by score.
 */
export function useWSJFScore() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAndScoreTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['inbox', 'active']).eq('user_id', user?.id);

      if (fetchError) throw fetchError;

      const scored = (data || []).map((t) => {
        const { score, breakdown } = computeWSJFScore(t);
        return {
          ...t,
          wsjfScore: score,
          scoreBreakdown: breakdown,
        };
      });

      // Sort by score descending
      scored.sort((a, b) => b.wsjfScore - a.wsjfScore);

      setTasks(scored);
    } catch (err) {
      console.error('Error fetching/scoring WSJF tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndScoreTasks();
  }, [fetchAndScoreTasks]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchAndScoreTasks,
  };
}
