import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { calculateTotals } from '../../lib/utils/totals'
import { Button } from '../../components/Button'
import type { Participant } from '../../types'

type Filter = 'all' | 'unpaid' | 'unchecked'

export function DayOfScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const { participants, loadParticipants, toggleCheckedIn, markPaid } = useParticipantStore()
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    loadEvents()
    if (id) loadParticipants(id)
  }, [id, loadEvents, loadParticipants])

  const event = events.find((e) => e.id === id)
  if (!event) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading…</div>

  const totals = calculateTotals(participants)

  const roster = participants.filter((p) => !p.waitlist)
  const filtered = roster.filter((p) => {
    if (filter === 'unpaid') return p.payment_status !== 'paid'
    if (filter === 'unchecked') return !p.checked_in
    return true
  })

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(`/event/${id}`)} className="text-slate-400 hover:text-white p-2 -ml-2">←</button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">☀️ Day-of Mode</h1>
            <p className="text-slate-400 text-sm truncate">{event.title}</p>
          </div>
        </div>

        {/* Live Totals Bar */}
        <div className="bg-slate-800 rounded-2xl p-3 mb-4 grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-white font-bold text-xl">{totals.checkedInCount}</div>
            <div className="text-slate-400 text-xs">In</div>
          </div>
          <div>
            <div className="text-white font-bold text-xl">{totals.totalSignedUp - totals.checkedInCount}</div>
            <div className="text-slate-400 text-xs">Absent</div>
          </div>
          <div>
            <div className="text-green-400 font-bold text-xl">${totals.collectedTotal}</div>
            <div className="text-slate-400 text-xs">Collected</div>
          </div>
          <div>
            <div className="text-red-400 font-bold text-xl">${totals.remainingUnpaid}</div>
            <div className="text-slate-400 text-xs">Owed</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(['all', 'unpaid', 'unchecked'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
            >
              {f === 'all' ? `All (${roster.length})` : f === 'unpaid' ? `Unpaid` : `Not In`}
            </button>
          ))}
        </div>

        {/* Participant cards - large touch targets */}
        <div className="flex flex-col gap-3">
          {filtered.map((p) => (
            <DayOfParticipantCard key={p.id} participant={p} onCheckin={() => toggleCheckedIn(p.id)} onPaid={() => markPaid(p.id)} />
          ))}
        </div>

        {/* Waitlist */}
        {participants.filter(p => p.waitlist).length > 0 && (
          <div className="mt-6">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Waitlist ({participants.filter(p => p.waitlist).length})</h2>
            <div className="flex flex-col gap-2">
              {participants.filter(p => p.waitlist).map((p) => (
                <div key={p.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                  <span className="text-slate-300">{p.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DayOfParticipantCard({ participant, onCheckin, onPaid }: {
  participant: Participant
  onCheckin: () => void
  onPaid: () => void
}) {
  const isPaid = participant.payment_status === 'paid'
  return (
    <div className={`bg-slate-800 rounded-2xl p-4 border-2 transition-colors ${participant.checked_in ? 'border-green-700' : 'border-slate-700'}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-lg">{participant.display_name}</p>
          {participant.alias_or_real_name && <p className="text-slate-400 text-sm">{participant.alias_or_real_name}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPaid ? 'bg-green-900 text-green-200' : participant.payment_status === 'partial' ? 'bg-yellow-900 text-yellow-200' : 'bg-red-900 text-red-200'}`}>
            {isPaid ? 'paid' : `$${participant.amount_paid}/$${participant.buy_in_amount}`}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        <Button
          size="lg"
          variant={participant.checked_in ? 'primary' : 'secondary'}
          className="flex-1"
          onClick={onCheckin}
        >
          {participant.checked_in ? '✓ Checked In' : 'Check In'}
        </Button>
        {!isPaid && (
          <Button
            size="lg"
            variant="secondary"
            className="flex-1"
            onClick={onPaid}
          >
            Mark Paid
          </Button>
        )}
      </div>
    </div>
  )
}
