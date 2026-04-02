import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { EventForm } from './EventForm'
import { EventCard } from './EventCard'
import { useEventStore } from '../../store/eventStore'
import { usePullToRefresh } from '../../lib/hooks/usePullToRefresh'
import { haptic } from '../../lib/utils/haptic'

export function EventListScreen() {
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => { loadEvents() }, [loadEvents])

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      haptic.medium()
      await loadEvents()
      haptic.success()
    },
  })

  const active = events.filter((e) => !e.archived)
  const archived = events.filter((e) => e.archived)
  const displayed = showArchived ? archived : active

  return (
    <div className="min-h-screen bg-slate-900 text-white page-transition">
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-200"
          style={{ transform: `translate(-50%, ${Math.min(pullDistance, 60)}px)` }}
        >
          <div className={`glass px-4 py-2 rounded-full shadow-lg ${isRefreshing ? 'pull-refresh-indicator' : ''}`}>
            {isRefreshing ? '🔄 Refreshing...' : '⬇️ Pull to refresh'}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white gradient-blue bg-clip-text" style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🎰 Slot Pull</h1>
            <p className="text-slate-400 text-sm">Organizer</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>⚙️</Button>
            <Button
              size="md"
              onClick={() => {
                haptic.light()
                setCreating(true)
              }}
              className="fab-shadow"
            >
              + New Event
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
          <button
            onClick={() => {
              haptic.light()
              setShowArchived(false)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${!showArchived ? 'gradient-blue text-white shadow-lg' : 'glass-light text-slate-300'}`}
          >
            Upcoming ({active.length})
          </button>
          <button
            onClick={() => {
              haptic.light()
              setShowArchived(true)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${showArchived ? 'gradient-blue text-white shadow-lg' : 'glass-light text-slate-300'}`}
          >
            Archived ({archived.length})
          </button>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-500 page-transition">
            <div className="text-6xl mb-4 scale-in">🎰</div>
            <p className="text-lg">{showArchived ? 'No archived events' : 'No events yet'}</p>
            {!showArchived && (
              <Button
                className="mt-4"
                onClick={() => {
                  haptic.light()
                  setCreating(true)
                }}
              >
                Create Your First Event
              </Button>
            )}
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
