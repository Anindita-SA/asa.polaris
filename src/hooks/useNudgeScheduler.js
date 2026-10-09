import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { safeMutate } from '../lib/safeMutate';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineApi';
import { useAuth } from './useAuth';
import { getNotificationSettings, NOTIFICATION_SETTINGS_EVENT } from './useNotificationSettings';

export const useNudgeScheduler = () => {
  const { user } = useAuth();
  const [nudges, setNudges] = useState([]);
  const [allNudges, setAllNudges] = useState([]);
  const fallbackIntervals = useRef({});
  const lastScheduledRef = useRef({});
  const rawNudgesRef = useRef([]);
  const isPruningRef = useRef(false);

  const hasSeededRef = useRef(false);

  useEffect(() => {
    if (!user?.id || hasSeededRef.current) return;
    
    const seedKey = `polaris_nudges_seeded_${user.id}`;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(seedKey) === 'true') {
      hasSeededRef.current = true;
      return;
    }

    const seedNudges = async () => {
      hasSeededRef.current = true;
      const { data: existingNudges } = await offlineSelect('nudges', { user_id: user.id });

      // If any nudges exist locally in IndexedDB, do not seed defaults
      if (existingNudges && existingNudges.length > 0) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, 'true');
        return;
      }

      // Double-check remote Supabase if online to prevent duplicate seeding across fresh sessions or devices
      if (typeof navigator !== 'undefined' && navigator.onLine && supabase?.from) {
        try {
          const { data: remoteNudges, error: remoteErr } = await supabase
            .from('nudges')
            .select('id, title')
            .eq('user_id', user.id);
          if (!remoteErr && remoteNudges && remoteNudges.length > 0) {
            if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, 'true');
            return;
          }
        } catch (e) {
          // Ignore network errors and continue
        }
      }

      // Default system habit nudges to seed if user has none
      const defaults = [
        { title: "Drink water", interval_minutes: 120, active: true },
        { title: "Posture check", interval_minutes: 60, active: true },
        { title: "Take a break", interval_minutes: 90, active: true }
      ];

      if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, 'true');
      await Promise.all(
        defaults.map(n => offlineInsert('nudges', { user_id: user.id, ...n }))
      );
      fetchNudges();
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

    const { data: allNudgesData, error } = await offlineSelect('nudges', { user_id: user.id });

    if (error) {
      console.error('Error fetching nudges:', error);
      return;
    }

    rawNudgesRef.current = allNudgesData || [];

    // Deduplicate system nudges by normalized title (case-insensitive, trimmed)
    const seenTitles = new Set();
    const uniqueNudges = [];
    const duplicatesToDelete = [];

    (allNudgesData || []).forEach(item => {
      if (!item || !item.title) return;
      const normTitle = item.title.trim().toLowerCase();
      if (!seenTitles.has(normTitle)) {
        seenTitles.add(normTitle);
        uniqueNudges.push(item);
      } else {
        // Redundant duplicate record found
        duplicatesToDelete.push(item);
      }
    });

    // Prune existing duplicate nudges from database/Dexie in the background safely
    if (duplicatesToDelete.length > 0 && user?.id && !isPruningRef.current) {
      isPruningRef.current = true;
      (async () => {
        try {
          for (const dup of duplicatesToDelete) {
            await offlineDelete('nudges', { id: dup.id, user_id: user.id });
          }
        } catch (err) {
          console.error('Error purging duplicate nudge:', err);
        } finally {
          isPruningRef.current = false;
        }
      })();
    }

    const data = uniqueNudges.filter(n => n.active);

    // Filter system habit nudges based on settings
    const systemNudges = settings.habitNudgesEnabled ? (data || []) : [];

    const today = new Date().toISOString().split('T')[0];
    const { data: allTasksData, error: overdueError } = await offlineSelect('tasks', { user_id: user.id });

    if (overdueError) {
      console.error('Error fetching overdue tasks:', overdueError);
    }

    const rawOverdueTasks = (allTasksData || []).filter(task => {
      if (task.status === 'done') return false;
      if (task.category === 'reminders') {
        return !task.deadline || task.deadline <= today;
      }
      return (task.deadline && task.deadline < today) || (task.skip_count >= 3);
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
      const normTitle = (nudge.title || '').trim().toLowerCase();
      const lastDismissedStr = localStorage.getItem(`nudge_last_dismissed_${nudge.id}`) ||
        (normTitle ? localStorage.getItem(`nudge_last_dismissed_title_${normTitle}`) : null);
      let nextFireAt;
      const safeIntervalMinutes = Math.max(1, parseInt(nudge.interval_minutes, 10) || 60);
      const intervalMs = safeIntervalMinutes * 60000;
      
      if (lastDismissedStr) {
        nextFireAt = parseInt(lastDismissedStr, 10) + intervalMs;
      } else {
        nextFireAt = now + intervalMs;
        localStorage.setItem(`nudge_last_dismissed_${nudge.id}`, now.toString());
        if (normTitle) {
          localStorage.setItem(`nudge_last_dismissed_title_${normTitle}`, now.toString());
        }
      }

      const isDue = nextFireAt <= now;
      
      return {
        ...nudge,
        interval_minutes: safeIntervalMinutes,
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
        // SW is active, hand off to it (deduplicate sw nudges by title to prevent duplicate alarms)
        const seenSwTitles = new Set();
        const swNudges = [];
        processedNudges.forEach(n => {
          const nTitle = (n.title || '').trim().toLowerCase();
          if (!seenSwTitles.has(nTitle)) {
            if (nTitle) seenSwTitles.add(nTitle);
            swNudges.push({
              id: n.id,
              title: n.title,
              intervalMs: n.intervalMs,
              isTask: n.isTask
            });
          }
        });

        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_NUDGES',
          nudges: swNudges
        });
        
        // Clear main thread fallbacks
        Object.values(fallbackIntervals.current).forEach(clearTimeout);
        fallbackIntervals.current = {};
        lastScheduledRef.current = {};
      } else {
        // SW controller is null, use main thread fallback
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          const seenFallbackTitles = new Set();
          processedNudges.forEach(nudge => {
            const nTitle = (nudge.title || '').trim().toLowerCase();
            if (seenFallbackTitles.has(nTitle)) return;
            if (nTitle) seenFallbackTitles.add(nTitle);

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
    const nowStr = Date.now().toString();
    localStorage.setItem(`nudge_last_dismissed_${id}`, nowStr);

    const nudge = allNudges.find(n => n.id === id) || nudges.find(n => n.id === id) || rawNudgesRef.current.find(n => n.id === id);
    if (nudge?.title) {
      const normTitle = nudge.title.trim().toLowerCase();
      localStorage.setItem(`nudge_last_dismissed_title_${normTitle}`, nowStr);
      (rawNudgesRef.current || []).forEach(n => {
        if (n?.title && n.title.trim().toLowerCase() === normTitle) {
          localStorage.setItem(`nudge_last_dismissed_${n.id}`, nowStr);
        }
      });
      nudges.forEach(n => {
        if (n?.title && n.title.trim().toLowerCase() === normTitle) {
          localStorage.setItem(`nudge_last_dismissed_${n.id}`, nowStr);
        }
      });
      allNudges.forEach(n => {
        if (n?.title && n.title.trim().toLowerCase() === normTitle) {
          localStorage.setItem(`nudge_last_dismissed_${n.id}`, nowStr);
        }
      });
    }

    // For task-type nudges, increment skip_count in Supabase
    if (nudge?.isTask && user?.id) {
      try {
        const { data: taskData, error: fetchErr } = await offlineSelect('tasks', { id, user_id: user.id });

        if (!fetchErr && taskData && taskData.length > 0) {
          const currentSkipCount = taskData[0].skip_count || 0;
          await offlineUpdate('tasks', { id, user_id: user.id }, { skip_count: currentSkipCount + 1 });
        }
      } catch (err) {
        console.error('Error incrementing skip_count on dismiss:', err);
      }
    }

    const isMatch = (n) => n.id === id || Boolean(nudge?.title && n.title && n.title.trim().toLowerCase() === nudge.title.trim().toLowerCase());
    setNudges(prev => prev.map(n => isMatch(n) ? { ...n, isDue: false } : n));
    setAllNudges(prev => prev.map(n => isMatch(n) ? { ...n, isDue: false } : n));
    await fetchNudges();
  };

  return { nudges, allNudges, dismissNudge, fetchNudges };
};
