import { useState, useEffect } from 'react';
import { getPending } from '../lib/syncQueue';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending sync count occasionally
    let isMounted = true;
    const checkPending = async () => {
      try {
        const pending = await getPending();
        if (isMounted) setPendingSyncCount(pending.length);
      } catch (err) {
        console.error("Error checking pending queue", err);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 2000);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, pendingSyncCount };
}
