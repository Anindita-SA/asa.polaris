import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { safeMutate } from '../lib/safeMutate';
import { offlineSelect, offlineInsert, offlineUpdate, offlineDelete } from '../lib/offlineApi';
import { useAuth } from './useAuth';
import { getNotificationSettings, NOTIFICATION_SETTINGS_EVENT } from './useNotificationSettings';

export function normalizeNudgeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u00A0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?,;:]+$/, '');
}

export const useNudgeScheduler = () => {
  const { user } = useAuth();
  const [nudges, setNudges] = useState([]);
  const [allNudges, setAllNudges] = useState([]);
  const fallbackIntervals = useRef({});
  const lastScheduledRef = useRef({});
  const rawNudgesRef = useRef([]);
  const isPruningRef = useRef(false);
  const prunedIdsRef = useRef(new Set());

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

      // 1. Check local Dexie first
      const { data: existingNudges } = await offlineSelect('nudges', { user_id: user.id });
      if (existingNudges && existingNudges.length > 0) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, 'true');
        return;
      }

      // 2. Double-check remote Supabase if online
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

      // 3. User is truly new with 0 nudges in both local and remote stores
      if (typeof localStorage !== 'undefined') localStorage.setItem(seedKey, 'true');
      const defaults = [
        { title: "Drink water", interval_minutes: 120, active: true },
        { title: "Posture check", interval_minutes: 60, active: true },
        { title: "Take a break", interval_minutes: 90, active: true }
      ];

      await Promise.all(
        defaults.map(n => offlineInsert('nudges', { user_id: user.id, ...n }))
      );
      fetchNudges();
    };
    
    seedNudges();
  }, [user?.id]);

  const fetchNudges = useCallback(async () => {
    if (!user?.id || isPruningRef.current) return;
    
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

    // Deduplicate system nudges by normalized title
    const groupedByTitle = new Map();
    const duplicatesToDelete = [];

    (allNudgesData || []).forEach(item => {
      if (!item || !item.title) return;
      const normTitle = normalizeNudgeTitle(item.title);
      if (!normTitle) return;

      if (!groupedByTitle.has(normTitle)) {
        groupedByTitle.set(normTitle, item);
      } else {
        const existing = groupedByTitle.get(normTitle);
        // If existing is inactive but current item is active, keep active as canonical record
        if (!existing.active && item.active) {
          groupedByTitle.set(normTitle, item);
          if (!prunedIdsRef.current.has(existing.id)) {
            duplicatesToDelete.push(existing);
          }
        } else {
          if (!prunedIdsRef.current.has(item.id)) {
            duplicatesToDelete.push(item);
          }
        }
      }
    });

    const uniqueNudges = Array.from(groupedByTitle.values());

    // Prune existing duplicate nudges from database/Dexie in the background safely
    if (duplicatesToDelete.length > 0 && user?.id && !isPruningRef.current) {
      isPruningRef.current = true;
      duplicatesToDelete.forEach(d => prunedIdsRef.current.add(d.id));
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

    // Keep all unique system habit nudges (preserving active and inactive records)
    const systemNudges = settings.habitNudgesEnabled ? uniqueNudges : [];

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
      const normTitle = normalizeNudgeTitle(nudge.title);
      const idDismissed = localStorage.getItem(`nudge_last_dismissed_${nudge.id}`);
      const titleDismissed = normTitle ? localStorage.getItem(`nudge_last_dismissed_title_${normTitle}`) : null;

      let lastDismissedTime = 0;
      if (idDismissed) {
        lastDismissedTime = Math.max(lastDismissedTime, parseInt(idDismissed, 10) || 0);
      }
      if (titleDismissed) {
        lastDismissedTime = Math.max(lastDismissedTime, parseInt(titleDismissed, 10) || 0);
      }

      let nextFireAt;
      const safeIntervalMinutes = Math.max(1, parseInt(nudge.interval_minutes, 10) || 60);
      const intervalMs = safeIntervalMinutes * 60000;
      
      if (lastDismissedTime > 0) {
        nextFireAt = lastDismissedTime + intervalMs;
      } else {
        nextFireAt = now + intervalMs;
        localStorage.setItem(`nudge_last_dismissed_${nudge.id}`, now.toString());
        if (normTitle) {
          localStorage.setItem(`nudge_last_dismissed_title_${normTitle}`, now.toString());
        }
      }

      const isDue = Boolean(nudge.active) && nextFireAt <= now;
      
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

    // Setup scheduling (only active nudges should ring/fire)
    const activeNudgesToSchedule = processedNudges.filter(n => n.active);
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        // SW is active, hand off to it (deduplicate sw nudges by title to prevent duplicate alarms)
        const seenSwTitles = new Set();
        const swNudges = [];
        activeNudgesToSchedule.forEach(n => {
          const nTitle = normalizeNudgeTitle(n.title);
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
          activeNudgesToSchedule.forEach(nudge => {
            const nTitle = normalizeNudgeTitle(nudge.title);
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

  const dismissNudge = async (id, optionalTitle) => {
    const nowStr = Date.now().toString();
    localStorage.setItem(`nudge_last_dismissed_${id}`, nowStr);

    const nudge = allNudges.find(n => n.id === id) || nudges.find(n => n.id === id) || rawNudgesRef.current.find(n => n.id === id);
    const nudgeTitle = optionalTitle || nudge?.title;
    const normTitle = normalizeNudgeTitle(nudgeTitle);

    if (normTitle) {
      localStorage.setItem(`nudge_last_dismissed_title_${normTitle}`, nowStr);
      const allKnown = [...(rawNudgesRef.current || []), ...nudges, ...allNudges];
      allKnown.forEach(n => {
        if (n?.id && normalizeNudgeTitle(n?.title) === normTitle) {
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

    const targetNorm = normTitle;
    const isMatch = (n) => n.id === id || Boolean(targetNorm && n.title && normalizeNudgeTitle(n.title) === targetNorm);
    setNudges(prev => prev.map(n => isMatch(n) ? { ...n, isDue: false } : n));
    setAllNudges(prev => prev.map(n => isMatch(n) ? { ...n, isDue: false } : n));
    await fetchNudges();
  };

  return { nudges, allNudges, dismissNudge, fetchNudges };
};
