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
type SortBy = 'name' | 'payment' | 'checkin' | 'custom'

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loading: eventsLoading, loaded: eventsLoaded, loadEvents } = useEventStore()
  const { participants, loadParticipants } = useParticipantStore()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('custom')

  useEffect(() => {
    loadEvents()
    if (id) loadParticipants(id)
  }, [id, loadEvents, loadParticipants])

  const event = events.find((e) => e.id === id)
  if (!eventsLoaded || eventsLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading…</div>
  if (!event) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
      <p className="text-xl font-semibold">Event not found</p>
      <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 text-sm">← Back to events</button>
    </div>
  )

  const totals = calculateTotals(participants)

  // Calculate capacity status
  const nonWaitlistCount = participants.filter(p => !p.waitlist).length
  const maxPlayers = event.max_players
  const isAtCapacity = maxPlayers !== null && nonWaitlistCount >= maxPlayers
  const isNearCapacity = maxPlayers !== null && nonWaitlistCount >= maxPlayers * 0.9 && !isAtCapacity

  const filtered = participants.filter((p) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = p.display_name.toLowerCase().includes(query)
      const matchesAlias = p.alias_or_real_name?.toLowerCase().includes(query)
      if (!matchesName && !matchesAlias) return false
    }

    // Filter by status
    if (filter === 'unpaid') return p.payment_status !== 'paid' && !p.waitlist
    if (filter === 'checked-in') return p.checked_in
    if (filter === 'waitlist') return p.waitlist
    return true
  })

  // Sort participants
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.display_name.localeCompare(b.display_name)
      case 'payment': {
        const statusOrder = { unpaid: 0, partial: 1, paid: 2 }
        return statusOrder[a.payment_status] - statusOrder[b.payment_status]
      }
      case 'checkin':
        return (a.checked_in ? 1 : 0) - (b.checked_in ? 1 : 0)
      case 'custom':
      default:
        // Use sort_order if available, otherwise maintain insertion order
        if (a.sort_order !== null && b.sort_order !== null) {
          return a.sort_order - b.sort_order
        }
        return 0
    }
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
            { label: 'Signed Up', value: totals.totalSignedUp, suffix: maxPlayers ? `/${maxPlayers}` : '' },
            { label: 'Checked In', value: totals.checkedInCount },
            { label: 'Waitlist', value: totals.waitlistCount },
            { label: 'Expected', value: `$${totals.expectedTotal}` },
            { label: 'Collected', value: `$${totals.collectedTotal}` },
            { label: 'Remaining', value: `$${totals.remainingUnpaid}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{stat.value}{stat.suffix || ''}</div>
              <div className="text-slate-400 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Capacity warnings */}
        {isAtCapacity && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl p-3 mb-4 flex items-center gap-2">
            <span className="text-lg">🚫</span>
            <div className="flex-1">
              <p className="text-red-300 font-medium text-sm">Event at capacity</p>
              <p className="text-red-400 text-xs">New participants will be added to waitlist</p>
            </div>
          </div>
        )}
        {isNearCapacity && (
          <div className="bg-yellow-900/30 border border-yellow-500 rounded-xl p-3 mb-4 flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-300 font-medium text-sm">Near capacity</p>
              <p className="text-yellow-400 text-xs">{maxPlayers! - nonWaitlistCount} spot{maxPlayers! - nonWaitlistCount !== 1 ? 's' : ''} remaining</p>
            </div>
          </div>
        )}

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

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="🔍 Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Sort */}
        <div className="mb-4">
          <label className="text-slate-400 text-xs mb-2 block">Sort by</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { key: 'custom' as SortBy, label: 'Custom Order' },
              { key: 'name' as SortBy, label: 'Name (A-Z)' },
              { key: 'payment' as SortBy, label: 'Payment Status' },
              { key: 'checkin' as SortBy, label: 'Check-in' },
            ].map((sort) => (
              <button
                key={sort.key}
                onClick={() => setSortBy(sort.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${sortBy === sort.key ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <Button size="sm" className="flex-1" onClick={() => setAdding(true)}>+ Add Participant</Button>
          <Button size="sm" variant="secondary" onClick={() => exportEventToCSV(event, participants)}>📊 CSV</Button>
        </div>

        {/* Participant list */}
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>No participants found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((p) => (
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
