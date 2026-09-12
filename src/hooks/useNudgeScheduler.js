import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { getNotificationSettings, NOTIFICATION_SETTINGS_EVENT } from './useNotificationSettings';

export const useNudgeScheduler = () => {
  const { user } = useAuth();
  const [nudges, setNudges] = useState([]);
  const [allNudges, setAllNudges] = useState([]);
  const fallbackIntervals = useRef({});
  const lastScheduledRef = useRef({});

  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (!user || hasSeededRef.current) return;
    
    const seedNudges = async () => {
      hasSeededRef.current = true;
      const { count } = await supabase
        .from('nudges')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count === 0) {
        await supabase.from('nudges').insert([
          { user_id: user.id, title: "Drink water", interval_minutes: 120, active: true },
          { user_id: user.id, title: "Posture check", interval_minutes: 60, active: true },
          { user_id: user.id, title: "Take a break", interval_minutes: 90, active: true }
        ]);
        fetchNudges();
      }
    };
    
    seedNudges();
  }, [user?.id]);

  const fetchNudges = useCallback(async () => {
    if (!user?.id) return;
    
    const settings = getNotificationSettings();

    // Master Mute Check: clear all scheduling and timers immediately
    if (settings.masterMuted) {
      Object.values(fallbackIntervals.current).forEach(clearTimeout);
      fallbackIntervals.current = {};
      lastScheduledRef.current = {};

      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_NUDGES',
          nudges: []
        });
      }

      if ('clearAppBadge' in navigator) {
        try {
          navigator.clearAppBadge();
        } catch (e) {
          // ignore badge clear error
        }
      }

      setNudges([]);
      setAllNudges([]);
      return;
    }

    const { data, error } = await supabase
      .from('nudges')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    if (error) {
      console.error('Error fetching nudges:', error);
      return;
    }

    // Filter system habit nudges based on settings
    const systemNudges = settings.habitNudgesEnabled ? (data || []) : [];

    const today = new Date().toISOString().split('T')[0];
    const { data: overdueData, error: overdueError } = await supabase
      .from('tasks')
      .select('id, title, deadline, skip_count, category')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .or(`deadline.lt.${today},skip_count.gte.3,category.eq.reminders`);

    if (overdueError) {
      console.error('Error fetching overdue tasks:', overdueError);
    }

    const rawOverdueTasks = (overdueData || []).filter(task => {
      if (task.category === 'reminders') {
        return !task.deadline || task.deadline <= today;
      }
      return task.deadline < today || task.skip_count >= 3;
    });

    // Sort overdue tasks: earliest deadline first, then highest skip_count
    const sortedOverdueTasks = [...rawOverdueTasks].sort((a, b) => {
      if (a.deadline && b.deadline) {
        return a.deadline.localeCompare(b.deadline);
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return (b.skip_count || 0) - (a.skip_count || 0);
    });

    const taskInterval = settings.taskIntervalMinutes || 120;
    let taskNudges = [];

    if (settings.taskMode === 'off') {
      taskNudges = [];
    } else if (settings.taskMode === 'focus_only') {
      if (sortedOverdueTasks.length > 0) {
        const topTask = sortedOverdueTasks[0];
        taskNudges = [{
          id: topTask.id,
          title: topTask.title,
          interval_minutes: taskInterval,
          active: true,
          isTask: true,
          isReminder: topTask.category === 'reminders'
        }];
      }
    } else if (settings.taskMode === 'consolidated') {
      if (sortedOverdueTasks.length > 0) {
        const topTask = sortedOverdueTasks[0];
        const extraCount = sortedOverdueTasks.length - 1;
        const summaryTitle = extraCount > 0
          ? `Polaris Focus: ${topTask.title} (+${extraCount} more)`
          : `Polaris Focus: ${topTask.title}`;
        taskNudges = [{
          id: topTask.id || 'consolidated-focus-task',
          title: summaryTitle,
          interval_minutes: taskInterval,
          active: true,
          isTask: true,
          isReminder: false
        }];
      }
    } else {
      // 'all'
      taskNudges = sortedOverdueTasks.map(task => {
        let interval_minutes = taskInterval;
        if (task.category === 'reminders') {
          interval_minutes = Math.min(taskInterval, 60);
        } else if (task.deadline && task.deadline < today) {
          const daysOverdue = Math.floor((new Date(today) - new Date(task.deadline)) / (1000 * 60 * 60 * 24));
          if (daysOverdue >= 4) {
            interval_minutes = Math.min(taskInterval, 60);
          } else if (daysOverdue >= 2) {
            interval_minutes = Math.min(taskInterval, 120);
          }
        }
        return {
          id: task.id,
          title: task.title,
          interval_minutes,
          active: true,
          isTask: true,
          isReminder: task.category === 'reminders'
        };
      });
    }

    const combinedNudges = [...systemNudges, ...taskNudges];

    const now = Date.now();
    const processedNudges = combinedNudges.map((nudge) => {
      const lastDismissedStr = localStorage.getItem(`nudge_last_dismissed_${nudge.id}`);
      let nextFireAt;
      const intervalMs = nudge.interval_minutes * 60000;
      
      if (lastDismissedStr) {
        nextFireAt = parseInt(lastDismissedStr, 10) + intervalMs;
      } else {
        nextFireAt = now + intervalMs;
        localStorage.setItem(`nudge_last_dismissed_${nudge.id}`, now.toString());
      }

      const isDue = nextFireAt <= now;
      
      return {
        ...nudge,
        isDue,
        nextFireAt,
        intervalMs
      };
    });

    setNudges(processedNudges.filter(n => !n.isTask));
    setAllNudges(processedNudges);

    // Update App Badge for mobile
    if ('setAppBadge' in navigator) {
      try {
        const activeCount = processedNudges.filter(n => n.isTask).length;
        if (activeCount > 0) {
          navigator.setAppBadge(activeCount);
        } else {
          navigator.clearAppBadge();
        }
      } catch (e) {
        console.error('App badge error:', e);
      }
    }

    // Setup scheduling
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        // SW is active, hand off to it
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_NUDGES',
          nudges: processedNudges.map(n => ({
            id: n.id,
            title: n.title,
            intervalMs: n.intervalMs,
            isTask: n.isTask
          }))
        });
        
        // Clear main thread fallbacks
        Object.values(fallbackIntervals.current).forEach(clearTimeout);
        fallbackIntervals.current = {};
        lastScheduledRef.current = {};
      } else {
        // SW controller is null, use main thread fallback
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          processedNudges.forEach(nudge => {
            // Only schedule if we haven't scheduled this exact nextFireAt yet
            if (lastScheduledRef.current[nudge.id] !== nudge.nextFireAt) {
              if (fallbackIntervals.current[nudge.id]) {
                clearTimeout(fallbackIntervals.current[nudge.id]);
              }
              
              lastScheduledRef.current[nudge.id] = nudge.nextFireAt;
              const timeUntilNext = Math.max(0, nudge.nextFireAt - Date.now());
              
              const fire = () => {
                const title = nudge.isTask ? `⚠️ OVERDUE: ${nudge.title}` : nudge.title;
                new Notification(title, { body: "Polaris nudge" });
                const intId = setInterval(() => {
                  new Notification(title, { body: "Polaris nudge" });
                }, nudge.intervalMs);
                fallbackIntervals.current[nudge.id] = intId;
              };

              fallbackIntervals.current[nudge.id] = setTimeout(fire, timeUntilNext);
            }
          });
        }
      }
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNudges();
    
    const handleControllerChange = () => {
      fetchNudges(); // Re-run to hand off to SW once it takes control
    };

    const handleSettingsChanged = () => {
      fetchNudges();
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(NOTIFICATION_SETTINGS_EVENT, handleSettingsChanged);
    }
    
    const interval = setInterval(fetchNudges, 60000);
    return () => {
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener(NOTIFICATION_SETTINGS_EVENT, handleSettingsChanged);
      }
      Object.values(fallbackIntervals.current).forEach(clearTimeout);
    };
  }, [fetchNudges]);

  const dismissNudge = async (id) => {
    localStorage.setItem(`nudge_last_dismissed_${id}`, Date.now().toString());

    // For task-type nudges, increment skip_count in Supabase
    const nudge = allNudges.find(n => n.id === id) || nudges.find(n => n.id === id);
    if (nudge?.isTask && user?.id) {
      try {
        const { data: taskData, error: fetchErr } = await supabase
          .from('tasks')
          .select('skip_count')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (!fetchErr && taskData) {
          const currentSkipCount = taskData.skip_count || 0;
          const { error: updateErr } = await supabase
            .from('tasks')
            .update({ skip_count: currentSkipCount + 1 })
            .eq('id', id)
            .eq('user_id', user.id);

          if (updateErr) console.error('Failed to increment skip_count:', updateErr);
        }
      } catch (err) {
        console.error('Error incrementing skip_count on dismiss:', err);
      }
    }

    setNudges(prev => prev.map(n => n.id === id ? { ...n, isDue: false } : n));
    setAllNudges(prev => prev.map(n => n.id === id ? { ...n, isDue: false } : n));
    await fetchNudges();
  };

  return { nudges, allNudges, dismissNudge, fetchNudges };
};
