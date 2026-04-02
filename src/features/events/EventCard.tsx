import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../components/Modal'
import { EventForm } from './EventForm'
import { useEventStore } from '../../store/eventStore'
import type { Event } from '../../types'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()
  const { archiveEvent, deleteEvent, duplicateEvent } = useEventStore()
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleArchive = async () => {
    await archiveEvent(event.id)
    setMenuOpen(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this event? This cannot be undone.')) {
      await deleteEvent(event.id)
    }
    setMenuOpen(false)
  }

  const handleDuplicate = async () => {
    await duplicateEvent(event.id)
    setMenuOpen(false)
  }

  return (
    <>
      <div className="glass-light rounded-2xl p-4 border border-slate-700/50 card-hover shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <button
            className="flex-1 text-left ripple"
            onClick={() => navigate(`/event/${event.id}`)}
          >
            <h3 className="text-white font-semibold text-lg leading-tight">{event.title}</h3>
            {event.trip_label && <p className="text-blue-400 text-sm mt-0.5">{event.trip_label}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-slate-400 text-sm">
              <span>📅 {event.date}</span>
              {event.time && <span>🕐 {event.time}</span>}
              {event.location && <span>📍 {event.location}</span>}
              <span>💰 ${event.buy_in_amount}</span>
            </div>
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ripple"
              aria-label="Options"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 glass rounded-xl shadow-xl border border-slate-600/50 z-10 min-w-[160px] slide-up">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 rounded-t-xl transition-all ripple">✏️ Edit</button>
                <button onClick={handleDuplicate} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 transition-all ripple">📋 Duplicate</button>
                {!event.archived && <button onClick={handleArchive} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 transition-all ripple">📦 Archive</button>}
                <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-600/50 rounded-b-xl transition-all ripple">🗑️ Delete</button>
              </div>
            )}
          </div>
        </div>
        {event.archived && (
          <span className="mt-2 inline-block px-2 py-0.5 glass text-slate-400 text-xs rounded-full">Archived</span>
        )}
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Event">
        <EventForm event={event} onSave={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </Modal>
    </>
  )
}
