import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if ('Notification' in window) {
  Notification.requestPermission()
}

if (import.meta.env.DEV) {
  import('./lib/resyncTodayPlan.js').then(({ resyncTodayPlan, inspectSyncErrors, fixTodayPlan }) => {
    window.__resyncTodayPlan = resyncTodayPlan;
    window.__inspectSyncErrors = inspectSyncErrors;
    window.__fixTodayPlan = fixTodayPlan;
  }).catch(() => {});
}
