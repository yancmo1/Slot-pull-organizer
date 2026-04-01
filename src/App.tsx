import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { EventListScreen } from './features/events/EventListScreen'
import { EventDetailScreen } from './features/events/EventDetailScreen'
import { DayOfScreen } from './features/dayof/DayOfScreen'
import { SettingsScreen } from './features/settings/SettingsScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EventListScreen />} />
        <Route path="/event/:id" element={<EventDetailScreen />} />
        <Route path="/event/:id/dayof" element={<DayOfScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
