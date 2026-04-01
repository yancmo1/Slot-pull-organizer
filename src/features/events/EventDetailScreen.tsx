import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { ParticipantForm } from '../participants/ParticipantForm'
import { ParticipantRow } from '../participants/ParticipantRow'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { calculateTotals } from '../../lib/utils/totals'
import { exportEventToCSV } from '../../lib/utils/export'

type Filter = 'all' | 'unpaid' | 'checked-in' | 'waitlist'

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const { participants, loadParticipants } = useParticipantStore()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    loadEvents()
    if (id) loadParticipants(id)
  }, [id, loadEvents, loadParticipants])

  const event = events.find((e) => e.id === id)
  if (!event) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading…</div>

  const totals = calculateTotals(participants)

  const filtered = participants.filter((p) => {
    if (filter === 'unpaid') return p.payment_status !== 'paid' && !p.waitlist
    if (filter === 'checked-in') return p.checked_in
    if (filter === 'waitlist') return p.waitlist
    return true
  })

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${participants.length})` },
    { key: 'unpaid', label: `Unpaid (${participants.filter(p => p.payment_status !== 'paid' && !p.waitlist).length})` },
    { key: 'checked-in', label: `In (${totals.checkedInCount})` },
    { key: 'waitlist', label: `Wait (${totals.waitlistCount})` },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-2 -ml-2 mt-0.5">←</button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{event.title}</h1>
            {event.trip_label && <p className="text-blue-400 text-sm">{event.trip_label}</p>}
            <p className="text-slate-400 text-sm">{event.date}{event.location ? ` · ${event.location}` : ''}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => navigate(`/event/${id}/dayof`)}>☀️ Day-of</Button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Signed Up', value: totals.totalSignedUp },
            { label: 'Checked In', value: totals.checkedInCount },
            { label: 'Waitlist', value: totals.waitlistCount },
            { label: 'Expected', value: `$${totals.expectedTotal}` },
            { label: 'Collected', value: `$${totals.collectedTotal}` },
            { label: 'Remaining', value: `$${totals.remainingUnpaid}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{stat.value}</div>
              <div className="text-slate-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button size="sm" className="flex-1" onClick={() => setAdding(true)}>+ Add Participant</Button>
          <Button size="sm" variant="secondary" onClick={() => exportEventToCSV(event, participants)}>📊 CSV</Button>
        </div>

        {/* Participant list */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No participants found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((p) => (
              <ParticipantRow key={p.id} participant={p} defaultBuyIn={event.buy_in_amount} />
            ))}
          </div>
        )}
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add Participant">
        <ParticipantForm
          eventId={event.id}
          defaultBuyIn={event.buy_in_amount}
          onSave={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      </Modal>
    </div>
  )
}
