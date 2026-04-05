import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { purgeSyncQueue } from './lib/sync'

if ('serviceWorker' in navigator) {
  // Capture the controller that was active when the page loaded.
  // We only reload when a *new* SW replaces an existing one, not on the
  // very first install where prevController would be null.
  const prevController = navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (prevController) {
      window.location.reload()
    }
  })

  // Trigger a service-worker update check each time the user returns to the
  // app (e.g. switching back from another tab or re-opening the PWA).
  // Throttled to at most once per hour to avoid excessive network requests.
  let lastUpdateCheck = 0
  const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now()
      if (now - lastUpdateCheck >= UPDATE_CHECK_INTERVAL_MS) {
        lastUpdateCheck = now
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {
            // Silently ignore update-check failures (e.g. offline)
          })
        })
      }
    }
  })
}

// Request persistent storage to reduce eviction risk on mobile browsers
navigator.storage?.persist?.().catch(() => {})

// Purge sync queue items older than 30 days
purgeSyncQueue().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
