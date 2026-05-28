import { useEffect } from 'react'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { EventListScreen } from './features/events/EventListScreen'
import { EventDetailScreen } from './features/events/EventDetailScreen'
import { DayOfScreen } from './features/dayof/DayOfScreen'
import { DevSandboxScreen } from './features/dev/DevSandboxScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { getSyncStatusSummary, runSyncAction } from './lib/sync/status'
import { useSyncStatusStore } from './store/syncStatusStore'
import { useEventStore } from './store/eventStore'

const BACKGROUND_SYNC_INTERVAL_MS = 30000

function AppShell() {
  const location = useLocation()
  const shouldBypassSandboxSync = import.meta.env.DEV && location.pathname === '/dev/sandbox'

  useEffect(() => {
    if (shouldBypassSandboxSync) return

    let isMounted = true

    const publishSummary = (summary: Awaited<ReturnType<typeof getSyncStatusSummary>>, refreshedData: boolean) => {
      if (!isMounted) return

      if (refreshedData) {
        useSyncStatusStore.getState().notifyExternalRefresh(summary)
        return
      }

      useSyncStatusStore.getState().setSummary(summary)
    }

    const sync = async () => {
      const summary = await runSyncAction(() => useEventStore.getState().loadEvents())
      publishSummary(summary, true)
    }

    const refreshStatus = async () => {
      const summary = await getSyncStatusSummary()
      publishSummary(summary, false)
    }

    if (navigator.onLine) {
      void sync()
    } else {
      void refreshStatus()
    }

    const handleOnline = () => {
      void sync()
    }

    const handleOffline = () => {
      void refreshStatus()
    }

    const backgroundSyncInterval = window.setInterval(() => {
      if (navigator.onLine) {
        void sync()
      }
    }, BACKGROUND_SYNC_INTERVAL_MS)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      isMounted = false
      window.clearInterval(backgroundSyncInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [shouldBypassSandboxSync])

  return (
    <Routes>
      <Route path="/" element={<EventListScreen />} />
      <Route path="/event/:id" element={<EventDetailScreen />} />
      <Route path="/event/:id/dayof" element={<DayOfScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      {import.meta.env.DEV && (
        <Route path="/dev/sandbox" element={<DevSandboxScreen />} />
      )}
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}

export default App
