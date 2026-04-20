import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { EventListScreen } from './features/events/EventListScreen'
import { EventDetailScreen } from './features/events/EventDetailScreen'
import { DayOfScreen } from './features/dayof/DayOfScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { isPocketBaseConfigured } from './lib/sync/pocketbase'
import { isSignedIn } from './lib/sync/auth'
import { pullChanges, flushSyncQueue } from './lib/sync'
import { useEventStore } from './store/eventStore'

function App() {
  useEffect(() => {
    const sync = async () => {
      if (!isPocketBaseConfigured() || !isSignedIn()) return
      await flushSyncQueue()
      await pullChanges()
      // Refresh in-memory store so the UI reflects what was just pulled
      await useEventStore.getState().loadEvents()
    }

    if (navigator.onLine) sync()

    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<EventListScreen />} />
        <Route path="/event/:id" element={<EventDetailScreen />} />
        <Route path="/event/:id/dayof" element={<DayOfScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </HashRouter>
  )
}

export default App
