import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Pencil, Copy, Archive, Trash2, Calendar, Clock, MapPin, DollarSign, Users, UserCheck } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { EventForm } from './EventForm'
import { useEventStore } from '../../store/eventStore'
import { db } from '../../lib/db'
import type { Event } from '../../types'

interface EventCardProps {
  event: Event
}

interface EventStats {
  playerCount: number
  checkedInCount: number
  remainingOwed: number
}

function useEventStats(eventId: string): EventStats | null {
  const [stats, setStats] = useState<EventStats | null>(null)

  useEffect(() => {
    let cancelled = false
    db.participants
      .where('event_id')
      .equals(eventId)
      .filter(p => !p.deleted_at)
      .toArray()
      .then(participants => {
        if (cancelled) return
        const roster = participants.filter(p => !p.waitlist)
        const checkedInCount = roster.filter(p => p.checked_in).length
        const remainingOwed = roster.reduce(
          (sum, p) => sum + Math.max(0, p.buy_in_amount - p.amount_paid),
          0
        )
        setStats({ playerCount: roster.length, checkedInCount, remainingOwed })
      })
    return () => { cancelled = true }
  }, [eventId])

  return stats
}

export function EventCard({ event }: EventCardProps) {
  const navigate = useNavigate()
  const { archiveEvent, deleteEvent, duplicateEvent } = useEventStore()
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const stats = useEventStats(event.id)

  const handleArchive = async () => {
    await archiveEvent(event.id)
    setMenuOpen(false)
  }

  const handleDelete = async () => {
    if (confirm('Delete this event and all its participants? This cannot be undone.')) {
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
              <span className="flex items-center gap-1"><Calendar size={12} />{event.date}</span>
              {event.time && <span className="flex items-center gap-1"><Clock size={12} />{event.time}</span>}
              {event.location && <span className="flex items-center gap-1"><MapPin size={12} />{event.location}</span>}
              <span className="flex items-center gap-1"><DollarSign size={12} />{event.buy_in_amount}</span>
            </div>
            {stats && (
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users size={11} />{stats.playerCount} player{stats.playerCount !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1"><UserCheck size={11} />{stats.checkedInCount} checked in</span>
                {stats.remainingOwed > 0
                  ? <span className="text-red-400">${stats.remainingOwed} owed</span>
                  : <span className="text-green-400">$0 owed</span>
                }
              </div>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all ripple"
              aria-label="Options"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 glass rounded-xl shadow-xl border border-slate-600/50 z-10 min-w-[160px] slide-up">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 rounded-t-xl transition-all ripple flex items-center gap-2.5"><Pencil size={14} />Edit</button>
                <button onClick={handleDuplicate} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 transition-all ripple flex items-center gap-2.5"><Copy size={14} />Duplicate</button>
                {!event.archived && <button onClick={handleArchive} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600/50 transition-all ripple flex items-center gap-2.5"><Archive size={14} />Archive</button>}
                <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-600/50 rounded-b-xl transition-all ripple flex items-center gap-2.5"><Trash2 size={14} />Delete</button>
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
