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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/asa.polaris/sw-notifications.js')
}
