import { HashRouter, Routes, Route } from 'react-router-dom'
import { EventListScreen } from './features/events/EventListScreen'
import { EventDetailScreen } from './features/events/EventDetailScreen'
import { DayOfScreen } from './features/dayof/DayOfScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

function App() {
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
