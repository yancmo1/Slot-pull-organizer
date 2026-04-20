import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { EventListScreen } from './features/events/EventListScreen'
import { EventDetailScreen } from './features/events/EventDetailScreen'
import { DayOfScreen } from './features/dayof/DayOfScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'
import { isPocketBaseConfigured } from './lib/sync/pocketbase'
import { isSignedIn } from './lib/sync/auth'
import { pullChanges, flushSyncQueue } from './lib/sync'

function App() {
  useEffect(() => {
    const sync = async () => {
      if (!isPocketBaseConfigured() || !isSignedIn()) return
      await pullChanges()
      await flushSyncQueue()
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
