import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { calculateTotals } from '../../lib/utils/totals'
import { Button } from '../../components/Button'
import { Input } from '../../components/Input'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { Participant } from '../../types'

type Filter = 'all' | 'unpaid' | 'unchecked'

export function DayOfScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loading: eventsLoading, loaded: eventsLoaded, loadEvents } = useEventStore()
  const { participants, loadParticipants, toggleCheckedIn, markPaid, checkInAll } = useParticipantStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [playMode, setPlayMode] = useState(false)
  const [spunParticipants, setSpunParticipants] = useState<Set<string>>(new Set())
  const [currentRound, setCurrentRound] = useState(1)
  const [totalCredits, setTotalCredits] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)
  const [showCheckInAllConfirm, setShowCheckInAllConfirm] = useState(false)
  const [showNextRoundConfirm, setShowNextRoundConfirm] = useState(false)

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

  const roster = participants.filter((p) => !p.waitlist)
  const notCheckedInCount = roster.filter((p) => !p.checked_in).length

  // In play mode, only show checked-in participants
  const visibleRoster = playMode ? roster.filter((p) => p.checked_in) : roster

  const filtered = visibleRoster.filter((p) => {
    if (filter === 'unpaid') return p.payment_status !== 'paid'
    if (filter === 'unchecked') return !p.checked_in
    return true
  })

  // In play mode, spun players sink to the bottom; unspun stay at the top
  const sortedFiltered = playMode
    ? [...filtered].sort((a, b) => {
        const aSpun = spunParticipants.has(a.id) ? 1 : 0
        const bSpun = spunParticipants.has(b.id) ? 1 : 0
        return aSpun - bSpun
      })
    : filtered

  const handleToggleSpin = (participantId: string) => {
    setSpunParticipants(prev => {
      const newSet = new Set(prev)
      if (newSet.has(participantId)) {
        newSet.delete(participantId)
      } else {
        newSet.add(participantId)
      }
      return newSet
    })
  }

  const handleNextRound = () => {
    setCurrentRound(prev => prev + 1)
    setSpunParticipants(new Set())
    setShowNextRoundConfirm(false)
  }

  const handleCheckInAll = async () => {
    if (!id) return
    await checkInAll(id)
    setShowCheckInAllConfirm(false)
  }

  const calculateWinnings = () => {
    const credits = parseFloat(totalCredits)
    if (isNaN(credits) || credits <= 0) return null

    const checkedInCount = totals.checkedInCount
    if (checkedInCount === 0) return null

    let totalAfterTax = credits
    let taxDeducted = 0

    if (credits > 2000) {
      taxDeducted = credits * 0.33
      totalAfterTax = credits - taxDeducted
    }

    const perPerson = totalAfterTax / checkedInCount

    return {
      original: credits,
      taxDeducted,
      afterTax: totalAfterTax,
      perPerson,
      checkedInCount
    }
  }

  const winnings = calculateWinnings()

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

        {/* Play Mode Toggle & Check In All */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={playMode ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setPlayMode(!playMode)}
            className="flex-1"
          >
            {playMode ? '🎮 Play Mode ON' : '🎮 Play Mode'}
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowCheckInAllConfirm(true)}
            disabled={notCheckedInCount === 0}
            className="flex-1"
          >
            ✓ Check All In ({notCheckedInCount})
          </Button>
        </div>

        {/* Round indicator + Next Round button (play mode only) */}
        {playMode && (
          <div className="flex items-center justify-between bg-slate-800 rounded-2xl px-4 py-3 mb-4 border border-slate-700">
            <span className="text-white font-semibold">
              🔄 Round <span className="text-blue-400 font-bold">{currentRound}</span>
            </span>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowNextRoundConfirm(true)}
            >
              Next Round →
            </Button>
          </div>
        )}

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
          {sortedFiltered.map((p) => (
            <DayOfParticipantCard
              key={p.id}
              participant={p}
              onCheckin={() => toggleCheckedIn(p.id)}
              onPaid={() => markPaid(p.id)}
              playMode={playMode}
              hasSpun={spunParticipants.has(p.id)}
              onToggleSpin={() => handleToggleSpin(p.id)}
            />
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

        {/* Calculator Section */}
        <div className="mt-6 mb-6">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full"
          >
            {showCalculator ? '📊 Hide Calculator' : '📊 Show Winnings Calculator'}
          </Button>

          {showCalculator && (
            <div className="mt-4 bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h2 className="text-white text-lg font-bold mb-4">💰 Winnings Calculator</h2>

              <div className="mb-4">
                <Input
                  label="Total Credits Won"
                  type="number"
                  value={totalCredits}
                  onChange={(e) => setTotalCredits(e.target.value)}
                  placeholder="Enter total credits"
                  className="text-lg"
                />
              </div>

              {winnings && (
                <div className="space-y-3">
                  <div className="bg-slate-700 rounded-xl p-3">
                    <div className="text-slate-400 text-sm">Original Amount</div>
                    <div className="text-white text-xl font-bold">${winnings.original.toFixed(2)}</div>
                  </div>

                  {winnings.taxDeducted > 0 && (
                    <div className="bg-red-900/30 rounded-xl p-3 border border-red-700">
                      <div className="text-red-300 text-sm">Tax Deducted (33%)</div>
                      <div className="text-red-200 text-xl font-bold">-${winnings.taxDeducted.toFixed(2)}</div>
                    </div>
                  )}

                  <div className="bg-green-900/30 rounded-xl p-3 border border-green-700">
                    <div className="text-green-300 text-sm">After Tax Total</div>
                    <div className="text-green-200 text-xl font-bold">${winnings.afterTax.toFixed(2)}</div>
                  </div>

                  <div className="bg-blue-900/30 rounded-xl p-4 border-2 border-blue-600">
                    <div className="text-blue-300 text-sm">Per Person ({winnings.checkedInCount} checked in)</div>
                    <div className="text-blue-100 text-3xl font-bold">${winnings.perPerson.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {totalCredits && !winnings && (
                <div className="text-red-400 text-sm mt-2">
                  Please enter a valid amount greater than 0
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showCheckInAllConfirm}
        onClose={() => setShowCheckInAllConfirm(false)}
        onConfirm={handleCheckInAll}
        title="Check In All Participants"
        message={`This will check in all ${notCheckedInCount} unchecked participants. Are you sure?`}
        confirmText="Check In All"
      />

      <ConfirmDialog
        open={showNextRoundConfirm}
        onClose={() => setShowNextRoundConfirm(false)}
        onConfirm={handleNextRound}
        title="Start Next Round"
        message={`This will clear all spun markers and begin Round ${currentRound + 1}. Are you sure?`}
        confirmText="Start Round"
      />
    </div>
  )
}

function DayOfParticipantCard({ participant, onCheckin, onPaid, playMode, hasSpun, onToggleSpin }: {
  participant: Participant
  onCheckin: () => void
  onPaid: () => void
  playMode?: boolean
  hasSpun?: boolean
  onToggleSpin?: () => void
}) {
  const isPaid = participant.payment_status === 'paid'
  return (
    <div className={`bg-slate-800 rounded-2xl p-4 border-2 transition-colors ${
      hasSpun ? 'border-purple-600 bg-purple-900/20' :
      participant.checked_in ? 'border-green-700' : 'border-slate-700'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-white font-semibold text-lg">{participant.display_name}</p>
          {participant.alias_or_real_name && <p className="text-slate-400 text-sm">{participant.alias_or_real_name}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {hasSpun && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-900 text-purple-200">
              ✓ Spun
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPaid ? 'bg-green-900 text-green-200' : participant.payment_status === 'partial' ? 'bg-yellow-900 text-yellow-200' : 'bg-red-900 text-red-200'}`}>
            {isPaid ? 'paid' : `$${participant.amount_paid}/$${participant.buy_in_amount}`}
          </span>
        </div>
      </div>
      <div className="flex gap-3">
        {playMode && onToggleSpin ? (
          <Button
            size="lg"
            variant={hasSpun ? 'primary' : 'secondary'}
            className="flex-1"
            onClick={onToggleSpin}
          >
            {hasSpun ? '✓ Has Spun' : 'Mark as Spun'}
          </Button>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
