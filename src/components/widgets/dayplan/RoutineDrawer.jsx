import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete, generateUUID } from '../../../lib/offlineApi';
import db from '../../../lib/offlineStore';
import { playChime } from '../../../lib/sound';

/**
 * RoutineDrawer component
 * Collapsed accordion housing recurring habits, daily checklist items, and goal checks.
 * Tracks its own separate completion fraction (e.g. 3/5 done) without diluting primary slot focus.
 */
export default function RoutineDrawer({
  userId,
  todayStr
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [habits, setHabits] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);

  // Load routine data
  const loadRoutineData = useCallback(async () => {
    if (!userId) return;
    try {
      // 1. Fetch Habits
      const { data: habitRows } = await offlineSelect('habits', { user_id: userId });
      setHabits(habitRows || []);

      // 2. Fetch Habit Logs for today
      const { data: logRows } = await offlineSelect('habit_logs', { user_id: userId, date: todayStr });
      setHabitLogs(logRows || []);

      // 3. Fetch Daily Tasks for today
      const { data: dtRows } = await offlineSelect('daily_tasks', { user_id: userId, date: todayStr });
      setDailyTasks(dtRows || []);
    } catch (err) {
      console.warn('[RoutineDrawer] Error loading routine data:', err);
    }
  }, [userId, todayStr]);

  useEffect(() => {
    loadRoutineData();

    // Listen to task and habit updates
    const handleUpdate = () => loadRoutineData();
    window.addEventListener('polaris-tasks-changed', handleUpdate);
    return () => window.removeEventListener('polaris-tasks-changed', handleUpdate);
  }, [loadRoutineData]);

  // Toggle habit
  const toggleHabit = async (habitId) => {
    if (!userId) return;
    const existingLog = habitLogs.find(l => l.habit_id === habitId);

    if (existingLog) {
      // Remove log
      await offlineDelete('habit_logs', { id: existingLog.id, user_id: userId });
      setHabitLogs(prev => prev.filter(l => l.id !== existingLog.id));
    } else {
      // Add log
      const newLog = {
        id: generateUUID(),
        user_id: userId,
        habit_id: habitId,
        date: todayStr,
        created_at: new Date().toISOString()
      };
      await offlineInsert('habit_logs', newLog);
      setHabitLogs(prev => [...prev, newLog]);
      playChime('success');
    }
  };

  // Toggle daily task
  const toggleDailyTask = async (task) => {
    if (!userId) return;
    const nextCompleted = !task.completed;
    await offlineUpdate('daily_tasks', { id: task.id, user_id: userId }, {
      completed: nextCompleted,
      updated_at: new Date().toISOString()
    });

    setDailyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: nextCompleted } : t));
    if (nextCompleted) playChime('success');
  };

  // Completion calculation
  const totalRoutines = habits.length + dailyTasks.length;
  const loggedHabitsCount = habits.filter(h => habitLogs.some(l => l.habit_id === h.id)).length;
  const completedDailyTasksCount = dailyTasks.filter(t => t.completed).length;
  const doneRoutines = loggedHabitsCount + completedDailyTasksCount;

  return (
    <div
      className="border border-pulsar/30 bg-void/60 rounded-xl overflow-hidden transition-all"
      data-testid="routine-drawer"
    >
      {/* Header Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-void/80 transition-colors"
        aria-expanded={isOpen}
        data-testid="toggle-routine-drawer"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-nova/60" />
          ) : (
            <ChevronRight className="w-4 h-4 text-nova/60" />
          )}
          <span className="text-base font-semibold font-display text-starlight">
            Routine: Habits & Daily Checks
          </span>
        </div>

        <span
          className="text-xs font-mono font-medium text-nova/70 bg-pulsar/10 border border-pulsar/20 px-2 py-0.5 rounded"
          data-testid="routine-fraction"
        >
          {doneRoutines}/{totalRoutines} done
        </span>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 pt-1 space-y-3 border-t border-pulsar/20" data-testid="routine-content">
          {/* Habits Section */}
          {habits.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-mono uppercase tracking-wider text-nova/50 block">
                Recurring Habits
              </span>
              <div className="space-y-1">
                {habits.map((habit) => {
                  const isLogged = habitLogs.some(l => l.habit_id === habit.id);
                  return (
                    <div
                      key={habit.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg bg-void/40 border border-pulsar/20"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleHabit(habit.id)}
                          className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                            isLogged
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                              : 'bg-void/80 border-pulsar/40 text-transparent hover:border-amber-500/50'
                          }`}
                          aria-label={`Toggle habit: ${habit.title || habit.name}`}
                          data-testid={`habit-toggle-${habit.id}`}
                        >
                          <Check className={`w-4 h-4 stroke-[2.5] ${isLogged ? 'opacity-100 text-amber-400' : 'opacity-0'}`} />
                        </button>
                        <span className={`text-sm font-body truncate ${isLogged ? 'line-through text-nova/50' : 'text-starlight/90'}`}>
                          {habit.title || habit.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Tasks Section */}
          {dailyTasks.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-xs font-mono uppercase tracking-wider text-nova/50 block">
                Daily Checklist
              </span>
              <div className="space-y-1">
                {dailyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 p-2 rounded-lg bg-void/40 border border-pulsar/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleDailyTask(task)}
                        className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center transition-all shrink-0 ${
                          task.completed
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-void/80 border-pulsar/40 text-transparent hover:border-amber-500/50'
                        }`}
                        aria-label={`Toggle daily task: ${task.title || task.task_name}`}
                        data-testid={`daily-task-toggle-${task.id}`}
                      >
                        <Check className={`w-4 h-4 stroke-[2.5] ${task.completed ? 'opacity-100 text-amber-400' : 'opacity-0'}`} />
                      </button>
                      <span className={`text-sm font-body truncate ${task.completed ? 'line-through text-nova/50' : 'text-starlight/90'}`}>
                        {task.title || task.task_name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalRoutines === 0 && (
            <p className="text-xs font-body text-nova/50 italic py-2">
              No habits or daily tasks configured for today.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
