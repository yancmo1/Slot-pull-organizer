import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Sun, FileDown, Search, RefreshCw, Copy } from 'lucide-react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import { ParticipantForm } from '../participants/ParticipantForm'
import { ParticipantRow } from '../participants/ParticipantRow'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { useSyncStatusStore } from '../../store/syncStatusStore'
import { calculateTotals } from '../../lib/utils/totals'
import { buildEventAttendeeList, exportEventToCSV } from '../../lib/utils/export'
import { buildParticipantDraft } from '../../lib/utils/participantDefaults'
import { getSyncStatusSummary, runSyncAction } from '../../lib/sync/status'
import { capitalizeWords } from '../../lib/utils/formatName'
import { haptic } from '../../lib/utils/haptic'

type Filter = 'all' | 'unpaid' | 'checked-in' | 'waitlist'
type SortBy = 'name' | 'payment' | 'checkin' | 'custom'

function normalizeNameForDuplicateCheck(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loading: eventsLoading, loaded: eventsLoaded, loadEvents } = useEventStore()
  const { participants, loadParticipants, createParticipant } = useParticipantStore()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('custom')
  const [syncing, setSyncing] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAdding, setQuickAdding] = useState(false)
  const [attendeeListOpen, setAttendeeListOpen] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const syncStatus = useSyncStatusStore((state) => state.summary)
  const externalRefreshVersion = useSyncStatusStore((state) => state.externalRefreshVersion)
  const setSyncStatus = useSyncStatusStore((state) => state.setSummary)

  const refreshEventData = useCallback(async () => {
    await loadEvents()
    if (id) await loadParticipants(id)
  }, [id, loadEvents, loadParticipants])

  const loadSyncStatus = useCallback(async () => {
    setSyncStatus(await getSyncStatusSummary())
  }, [setSyncStatus])

  const handleSync = async () => {
    haptic.medium()
    setSyncing(true)
    try {
      const summary = await runSyncAction(refreshEventData)
      setSyncStatus(summary)
      if (summary.mode === 'partial-failure') {
        haptic.warning()
      } else {
        haptic.success()
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      await refreshEventData()
      await loadSyncStatus()
    }

    void bootstrap()
  }, [loadSyncStatus, refreshEventData])

  useEffect(() => {
    if (!id || externalRefreshVersion === 0) return
    void loadParticipants(id)
  }, [externalRefreshVersion, id, loadParticipants])

  const compareParticipants = (a: typeof participants[number], b: typeof participants[number]) => {
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
        if (a.sort_order !== null && b.sort_order !== null) {
          return a.sort_order - b.sort_order
        }
        return 0
    }
  }

  const sortedParticipantsForExport = useMemo(() => {
    return [...participants]
      .filter((participant) => !participant.deleted_at)
      .sort(compareParticipants)
  }, [participants, sortBy])

  const duplicateMatches = useMemo(() => {
    const target = normalizeNameForDuplicateCheck(quickAddName)
    if (!target) return [] as string[]

    return participants
      .filter((participant) => !participant.deleted_at)
      .filter((participant) => (
        normalizeNameForDuplicateCheck(participant.display_name) === target
        || normalizeNameForDuplicateCheck(participant.alias_or_real_name) === target
      ))
      .map((participant) => participant.display_name)
  }, [participants, quickAddName])

  const event = events.find((e) => e.id === id)
  const attendeeListText = useMemo(() => {
    if (!event) return ''
    return buildEventAttendeeList(event, sortedParticipantsForExport)
  }, [event, sortedParticipantsForExport])

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
  const maxPlayers = event.max_players !== null && event.max_players > 0 ? event.max_players : null
  const isAtCapacity = maxPlayers !== null && nonWaitlistCount >= maxPlayers
  const isNearCapacity = maxPlayers !== null && nonWaitlistCount >= maxPlayers * 0.9 && !isAtCapacity
  const hasRoster = participants.length > 0
  const hasSearchOrFilters = searchQuery.trim().length > 0 || filter !== 'all'

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !quickAddName.trim()) return

    if (duplicateMatches.length > 0) {
      haptic.warning()
      const shouldContinue = confirm(
        `Possible duplicate found: ${duplicateMatches.join(', ')}. Add anyway?`,
      )
      if (!shouldContinue) return
    }

    setQuickAdding(true)
    try {
      await createParticipant(buildParticipantDraft({
        eventId: id,
        defaultBuyIn: event.buy_in_amount,
        displayName: quickAddName,
        existingParticipants: participants,
        maxPlayers,
      }))
      setQuickAddName('')
      setFilter('all')
      setSearchQuery('')
      haptic.success()
    } finally {
      setQuickAdding(false)
    }
  }

  const handleCopyAttendeeList = async () => {
    try {
      await navigator.clipboard.writeText(attendeeListText)
      setCopyMessage('Attendee list copied. Paste it straight into Facebook.')
    } catch {
      setCopyMessage('Copy failed here, but the list below is ready to select and paste manually.')
    }
  }

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
  const sorted = [...filtered].sort(compareParticipants)

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
          <button onClick={() => navigate('/')} aria-label="Go back" className="text-slate-400 hover:text-white p-2 -ml-2 mt-0.5 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"><ChevronLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white leading-tight">{event.title}</h1>
            {event.trip_label && <p className="text-blue-400 text-sm">{event.trip_label}</p>}
            <p className="text-slate-400 text-sm">{event.date}{event.location ? ` · ${event.location}` : ''}</p>
          </div>
          <div className="flex gap-2 items-center">
            <Button size="sm" variant="ghost" aria-label="Sync" disabled={syncing} onClick={handleSync}>
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate(`/event/${id}/dayof`)} className="gap-1.5"><Sun size={14} />Day-of</Button>
          </div>
        </div>

        {syncStatus && (
          <div className="mb-4">
            <SyncStatusCard summary={syncStatus} compact />
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 mb-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-white font-semibold text-sm">Quick Add</h2>
              <p className="text-slate-400 text-xs mt-1">
                Start with names now. Buy-in stays ${event.buy_in_amount}, and payment/check-in can wait until day-of.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
              Add with details
            </Button>
          </div>

          <form onSubmit={handleQuickAdd} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={quickAddName}
              onChange={(e) => setQuickAddName(capitalizeWords(e.target.value))}
              placeholder="Type a name and keep going"
              className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            <Button type="submit" disabled={quickAdding || !quickAddName.trim()} className="sm:min-w-[132px]">
              {quickAdding ? 'Adding…' : 'Add Name'}
            </Button>
          </form>

          {duplicateMatches.length > 0 && (
            <p className="text-[11px] text-amber-300 mt-2">
              Possible duplicate{duplicateMatches.length === 1 ? '' : 's'}: {duplicateMatches.join(', ')}
            </p>
          )}

          <p className="text-[11px] text-slate-500 mt-2">
            {isAtCapacity
              ? 'This event is at capacity, so new names will land on the waitlist by default.'
              : 'Alias, notes, payment method, and waitlist tweaks are still available in the full form.'}
          </p>
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

        {hasRoster && (
          <>
            {/* Filter tabs */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-700/80 text-slate-300'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search participants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${sortBy === sort.key ? 'bg-blue-600 text-white' : 'bg-slate-700/80 text-slate-300'}`}
                  >
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => {
                  setCopyMessage(null)
                  setAttendeeListOpen(true)
                }}
              >
                <Copy size={14} />Attendee List
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => exportEventToCSV(event, sortedParticipantsForExport)}><FileDown size={14} />CSV</Button>
            </div>
          </>
        )}

        {/* Participant list */}
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-800/60 border border-slate-700 rounded-2xl">
            {hasRoster ? (
              <>
                <p className="text-lg text-slate-300">No participants match this view</p>
                <p className="text-sm text-slate-400 mt-2">Try clearing the search or switching filters.</p>
                {hasSearchOrFilters && (
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('')
                      setFilter('all')
                      setSortBy('custom')
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-lg text-slate-300">No participants yet</p>
                <p className="text-sm text-slate-400 mt-2">Start with names now; add payment details later.</p>
              </>
            )}
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
          eventMaxPlayers={maxPlayers}
          existingParticipants={participants}
          onSave={() => setAdding(false)}
          onCancel={() => setAdding(false)}
        />
      </Modal>

      <Modal
        open={attendeeListOpen}
        onClose={() => {
          setAttendeeListOpen(false)
          setCopyMessage(null)
        }}
        title="Copy Attendee List"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            This list is formatted for a quick Facebook post or message. Copy it as-is, or tweak anything before you paste.
          </p>

          {copyMessage && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-100">
              {copyMessage}
            </div>
          )}

          <textarea
            readOnly
            value={attendeeListText}
            aria-label="Facebook-ready attendee list"
            className="min-h-[280px] w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:outline-none"
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAttendeeListOpen(false)}>
              Close
            </Button>
            <Button className="gap-2" onClick={handleCopyAttendeeList}>
              <Copy size={15} />Copy List
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
