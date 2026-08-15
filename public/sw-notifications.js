const timers = {};

self.addEventListener('message', (event) => {
  let nudges = null;
  if (event.data && event.data.type === 'UPDATE_NUDGES') {
    nudges = event.data.nudges;
  } else if (Array.isArray(event.data)) {
    nudges = event.data;
  }

  if (nudges) {
    // Clear existing timers
    Object.values(timers).forEach(clearTimeout);
    for (const key in timers) {
      delete timers[key];
    }

    // Setup new timers
    nudges.forEach(nudge => {
      scheduleNudge(nudge);
    });
  }
});

function scheduleNudge(nudge) {
  if (!nudge.id || !nudge.intervalMs) return;

  timers[nudge.id] = setTimeout(() => {
    self.registration.showNotification(nudge.title || 'Polaris Reminder', {
      body: 'Time to check in!',
      icon: '/asa.polaris/pwa-192x192.png',
      badge: '/asa.polaris/pwa-192x192.png',
      data: nudge
    });
    
    // Reschedule for the next cycle automatically
    scheduleNudge(nudge);
  }, Math.max(0, nudge.intervalMs));
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToFocus = new URL('/asa.polaris/', self.location.origin).href;
      
      for (const client of clientList) {
        // If we find an open window for Polaris, focus it
        if (client.url.startsWith(urlToFocus) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/asa.polaris/');
      }
    })
  );
});
