import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { EventForm } from './EventForm'
import { EventCard } from './EventCard'
import { useEventStore } from '../../store/eventStore'

export function EventListScreen() {
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { loadEvents() }, [loadEvents])

  const active = events.filter((e) => !e.archived)
  const archived = events.filter((e) => e.archived)
  const displayed = showArchived ? archived : active

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">🎰 Slot Pull</h1>
            <p className="text-slate-400 text-sm">Organizer</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>⚙️</Button>
            <Button size="md" onClick={() => setCreating(true)}>+ New Event</Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${!showArchived ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Upcoming ({active.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${showArchived ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          >
            Archived ({archived.length})
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-5xl mb-4">🎰</div>
            <p className="text-lg">{showArchived ? 'No archived events' : 'No events yet'}</p>
            {!showArchived && <Button className="mt-4" onClick={() => setCreating(true)}>Create Your First Event</Button>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create Event">
        <EventForm onSave={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  )
}
