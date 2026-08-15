import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export const useNudgeScheduler = () => {
  const { user } = useAuth();
  const [nudges, setNudges] = useState([]);
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
  }, [user]);

  const fetchNudges = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('nudges')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true);

    if (error) {
      console.error('Error fetching nudges:', error);
      return;
    }

    const now = Date.now();
    const processedNudges = data.map((nudge) => {
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

    setNudges(processedNudges);

    // Setup scheduling
    if ('serviceWorker' in navigator) {
      if (navigator.serviceWorker.controller) {
        // SW is active, hand off to it
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_NUDGES',
          nudges: processedNudges.map(n => ({
            id: n.id,
            title: n.title,
            intervalMs: n.intervalMs
          }))
        });
        
        // Clear main thread fallbacks
        Object.values(fallbackIntervals.current).forEach(clearTimeout);
        fallbackIntervals.current = {};
        lastScheduledRef.current = {};
      } else {
        // SW controller is null, use main thread fallback
        if (Notification.permission === 'granted') {
          processedNudges.forEach(nudge => {
            // Only schedule if we haven't scheduled this exact nextFireAt yet
            if (lastScheduledRef.current[nudge.id] !== nudge.nextFireAt) {
              if (fallbackIntervals.current[nudge.id]) {
                clearTimeout(fallbackIntervals.current[nudge.id]);
              }
              
              lastScheduledRef.current[nudge.id] = nudge.nextFireAt;
              const timeUntilNext = Math.max(0, nudge.nextFireAt - Date.now());
              
              const fire = () => {
                new Notification(nudge.title, { body: "Polaris nudge" });
                const intId = setInterval(() => {
                  new Notification(nudge.title, { body: "Polaris nudge" });
                }, nudge.intervalMs);
                fallbackIntervals.current[nudge.id] = intId;
              };

              fallbackIntervals.current[nudge.id] = setTimeout(fire, timeUntilNext);
            }
          });
        }
      }
    }
  }, [user]);

  useEffect(() => {
    fetchNudges();
    
    const handleControllerChange = () => {
      fetchNudges(); // Re-run to hand off to SW once it takes control
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }
    
    const interval = setInterval(fetchNudges, 60000);
    return () => {
      clearInterval(interval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
      Object.values(fallbackIntervals.current).forEach(clearTimeout);
    };
  }, [fetchNudges]);

  const dismissNudge = async (id) => {
    localStorage.setItem(`nudge_last_dismissed_${id}`, Date.now().toString());
    setNudges(prev => prev.map(n => n.id === id ? { ...n, isDue: false } : n));
    await fetchNudges();
  };

  return { nudges, dismissNudge, fetchNudges };
};
