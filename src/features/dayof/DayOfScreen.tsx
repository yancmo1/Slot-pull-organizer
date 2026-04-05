import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, CheckCheck, RefreshCw, Calculator, DollarSign, Banknote, CheckCircle2 } from 'lucide-react'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { useSpinRoundStore } from '../../store/spinRoundStore'
import { calculateTotals } from '../../lib/utils/totals'
import { Button } from '../../components/Button'
import { NumberPad } from '../../components/NumberPad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { calculateBillBreakdown, DENOMINATIONS } from '../../lib/utils/billBreakdown'
import type { Participant } from '../../types'

type Filter = 'all' | 'unpaid' | 'unchecked'

export function DayOfScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loading: eventsLoading, loaded: eventsLoaded, loadEvents } = useEventStore()
  const { participants, loadParticipants, toggleCheckedIn, markPaid, checkInAll } = useParticipantStore()
  const {
    currentRound,
    sessionActive,
    sessionLoading,
    loadSession,
    markSpun,
    unmarkSpun,
    startNextRound,
    endSession,
    resumeSession,
    isSpunInCurrentRound,
    getSpunIdsForRound,
  } = useSpinRoundStore()

  const [filter, setFilter] = useState<Filter>('all')
  const [playMode, setPlayMode] = useState(false)
  const [totalCredits, setTotalCredits] = useState('')
  const [showCalculator, setShowCalculator] = useState(false)
  const [showBillBreakdown, setShowBillBreakdown] = useState(false)
  const [showCheckInAllConfirm, setShowCheckInAllConfirm] = useState(false)
  const [showNextRoundConfirm, setShowNextRoundConfirm] = useState(false)
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const stickyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadEvents()
    if (id) {
      loadParticipants(id)
      loadSession(id)
    }
  }, [id, loadEvents, loadParticipants, loadSession])

  const event = events.find((e) => e.id === id)
  if (!eventsLoaded || eventsLoading || sessionLoading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading…</div>
  }
  if (!event) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-4">
        <p className="text-xl font-semibold">Event not found</p>
        <button onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 text-sm">← Back to events</button>
      </div>
    )
  }

  const totals = calculateTotals(participants)
  const roster = participants.filter((p) => !p.waitlist)
  const notCheckedInCount = roster.filter((p) => !p.checked_in).length

  // Derived round state
  const currentRoundSpunIds = getSpunIdsForRound(currentRound)
  const checkedInRoster = roster.filter(p => p.checked_in)
  const currentRoundSpunCount = checkedInRoster.filter(p => currentRoundSpunIds.has(p.id)).length
  const currentRoundRemainingCount = checkedInRoster.length - currentRoundSpunCount
  const allCurrentRoundSpun = checkedInRoster.length > 0 && currentRoundRemainingCount === 0

  // In play mode, only show checked-in participants
  const visibleRoster = playMode ? checkedInRoster : roster

  const filtered = visibleRoster.filter((p) => {
    if (filter === 'unpaid') return p.payment_status !== 'paid'
    if (filter === 'unchecked') return !p.checked_in
    return true
  })

  // In play mode, spun players sink to the bottom; unspun stay at the top
  const sortedFiltered = playMode
    ? [...filtered].sort((a, b) => {
        const aSpun = currentRoundSpunIds.has(a.id) ? 1 : 0
        const bSpun = currentRoundSpunIds.has(b.id) ? 1 : 0
        return aSpun - bSpun
      })
    : filtered

  const handleToggleSpin = async (participantId: string) => {
    if (!id) return
    if (isSpunInCurrentRound(participantId)) {
      await unmarkSpun(id, participantId)
    } else {
      await markSpun(id, participantId)
    }
  }

  const handleNextRound = async () => {
    if (!id) return
    await startNextRound(id)
    setShowNextRoundConfirm(false)
  }

  const handleEndSession = async () => {
    if (!id) return
    await endSession(id)
    setPlayMode(false)
    setShowEndSessionConfirm(false)
  }

  const handleResumeSession = async () => {
    if (!id) return
    await resumeSession(id)
    setPlayMode(true)
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
      <div className="max-w-lg mx-auto">
        {/* Header — not sticky */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <button onClick={() => navigate(`/event/${id}`)} aria-label="Go back" className="text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"><ChevronLeft size={20} /></button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white">☀️ Day-of Mode</h1>
            <p className="text-slate-400 text-sm truncate">{event.title}</p>
          </div>
        </div>

        {/* Sticky control cluster */}
        <div
          ref={stickyRef}
          className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-4 pb-3 pt-1 space-y-2"
        >
          {/* Play Mode Toggle & Check All In */}
          <div className="flex gap-2">
            <Button
              variant={playMode ? 'primary' : 'secondary'}
              size="md"
              onClick={() => {
                if (!playMode && !sessionActive) {
                  handleResumeSession()
                } else {
                  setPlayMode(!playMode)
                }
              }}
              className="flex-1"
            >
              {playMode ? <><Play size={14} className="mr-1.5" />Play Mode ON</> : <><Play size={14} className="mr-1.5" />Play Mode</>}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowCheckInAllConfirm(true)}
              disabled={notCheckedInCount === 0}
              className="flex-1"
            >
              <><CheckCheck size={14} className="mr-1.5" />Check All In ({notCheckedInCount})</>
            </Button>
          </div>

          {/* Round bar (play mode only) */}
          {playMode && (
            <div className="bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold text-sm flex items-center gap-1.5">
                    <RefreshCw size={13} />Round <span className="text-blue-400 font-bold">{currentRound}</span>
                  </span>
                  <span className="text-slate-400 text-xs ml-2">
                    {currentRoundSpunCount} of {checkedInRoster.length} spun
                    {currentRoundRemainingCount > 0 && ` · ${currentRoundRemainingCount} remaining`}
                  </span>
                </div>
                <div className="flex gap-1">
                  {allCurrentRoundSpun ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowNextRoundConfirm(true)}
                    >
                      Start Round {currentRound + 1} →
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowEndSessionConfirm(true)}
                    >
                      End Session
                    </Button>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              {checkedInRoster.length > 0 && (
                <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${(currentRoundSpunCount / checkedInRoster.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Live Totals Bar */}
          <div className="bg-slate-800 rounded-xl p-2.5 grid grid-cols-4 gap-1 text-center border border-slate-700">
            <div>
              <div className="text-white font-bold text-lg leading-tight">{totals.checkedInCount}</div>
              <div className="text-slate-400 text-xs">In</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">{totals.totalSignedUp - totals.checkedInCount}</div>
              <div className="text-slate-400 text-xs">Absent</div>
            </div>
            <div>
              <div className="text-green-400 font-bold text-lg leading-tight">${totals.collectedTotal}</div>
              <div className="text-slate-400 text-xs">Collected</div>
            </div>
            <div>
              <div className="text-red-400 font-bold text-lg leading-tight">${totals.remainingUnpaid}</div>
              <div className="text-slate-400 text-xs">Owed</div>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2">
            {(['all', 'unpaid', 'unchecked'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {f === 'all' ? `All (${roster.length})` : f === 'unpaid' ? `Unpaid` : `Not In`}
              </button>
            ))}
          </div>
        </div>

        {/* "Everyone has spun" banner */}
        {playMode && allCurrentRoundSpun && (
          <div className="mx-4 mt-3 bg-green-900/40 border border-green-700 rounded-xl px-4 py-3 text-center">
            <p className="text-green-300 font-semibold text-sm">🎉 Everyone has spun this round!</p>
            <div className="flex gap-2 mt-2">
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={() => setShowNextRoundConfirm(true)}
              >
                Start Round {currentRound + 1}
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => setShowEndSessionConfirm(true)}
              >
                End Session
              </Button>
            </div>
          </div>
        )}

        {/* Participant cards */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {sortedFiltered.map((p) => (
            <DayOfParticipantCard
              key={p.id}
              participant={p}
              onCheckin={() => toggleCheckedIn(p.id)}
              onPaid={() => markPaid(p.id)}
              playMode={playMode}
              hasSpun={currentRoundSpunIds.has(p.id)}
              onToggleSpin={() => handleToggleSpin(p.id)}
            />
          ))}
          {sortedFiltered.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">No participants match this filter</div>
          )}
        </div>

        {/* Waitlist */}
        {participants.filter(p => p.waitlist).length > 0 && (
          <div className="px-4 mt-4">
            <h2 className="text-slate-400 text-sm font-medium mb-2">Waitlist ({participants.filter(p => p.waitlist).length})</h2>
            <div className="flex flex-col gap-1.5">
              {participants.filter(p => p.waitlist).map((p) => (
                <div key={p.id} className="bg-slate-800 rounded-xl px-3 py-2 border border-slate-700">
                  <span className="text-slate-300 text-sm">{p.display_name}</span>
                  {p.alias_or_real_name && (
                    <span className="text-slate-500 text-xs ml-2">{p.alias_or_real_name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Winnings Calculator */}
        <div className="px-4 mt-4 mb-6">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full"
          >
            <><Calculator size={14} className="mr-1.5" />{showCalculator ? 'Hide Calculator' : 'Show Winnings Calculator'}</>
          </Button>

          {showCalculator && (
            <div className="mt-3 bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <h2 className="text-white text-lg font-bold mb-1 flex items-center gap-2"><DollarSign size={18} />Winnings Calculator</h2>
              <p className="text-slate-500 text-xs mb-4">Based on {totals.checkedInCount} checked-in players · not affected by round</p>

              <div className="mb-4">
                <p className="text-sm font-medium text-slate-300 mb-2">Total Credits Won</p>
                <NumberPad value={totalCredits} onChange={setTotalCredits} />
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
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full gap-1.5"
                      onClick={() => setShowBillBreakdown(true)}
                    >
                      <Banknote size={14} />Bill Breakdown
                    </Button>
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
        title={`Start Round ${currentRound + 1}`}
        message={`This will begin Round ${currentRound + 1}. All spin markers for Round ${currentRound} are preserved in history. Are you sure?`}
        confirmText={`Start Round ${currentRound + 1}`}
      />

      <ConfirmDialog
        open={showEndSessionConfirm}
        onClose={() => setShowEndSessionConfirm(false)}
        onConfirm={handleEndSession}
        title="End Session"
        message="This will end the play session. All round data will be preserved. You can resume play later."
        confirmText="End Session"
      />

      {winnings && (
        <BillBreakdownModal
          open={showBillBreakdown}
          onClose={() => setShowBillBreakdown(false)}
          perPerson={winnings.perPerson}
          checkedInCount={winnings.checkedInCount}
        />
      )}
    </div>
  )
}

function DayOfParticipantCard({
  participant,
  onCheckin,
  onPaid,
  playMode,
  hasSpun,
  onToggleSpin,
}: {
  participant: Participant
  onCheckin: () => void
  onPaid: () => void
  playMode?: boolean
  hasSpun?: boolean
  onToggleSpin?: () => void
}) {
  const isPaid = participant.payment_status === 'paid'
  const isPartial = participant.payment_status === 'partial'

  const paymentBadgeClass = isPaid
    ? 'bg-green-900 text-green-200'
    : isPartial
    ? 'bg-yellow-900 text-yellow-200'
    : 'bg-red-900 text-red-200'

  const paymentBadgeText = isPaid
    ? 'Paid'
    : `$${participant.amount_paid}/$${participant.buy_in_amount}`

  return (
    <div
      className={`bg-slate-800 rounded-xl px-3 py-2.5 border-2 transition-colors ${
        hasSpun
          ? 'border-purple-600 bg-purple-900/20'
          : participant.checked_in
          ? 'border-green-700'
          : 'border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-white font-semibold text-base leading-tight truncate">
            {participant.display_name}
          </p>
          {participant.alias_or_real_name && (
            <p className="text-slate-400 text-xs leading-tight mt-0.5 truncate">
              {participant.alias_or_real_name}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {hasSpun && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <CheckCircle2 size={11} />Spun
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentBadgeClass}`}>
            {paymentBadgeText}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        {playMode && onToggleSpin ? (
          <Button
            size="md"
            variant={hasSpun ? 'primary' : 'secondary'}
            className="flex-1 gap-1.5"
            onClick={onToggleSpin}
          >
            {hasSpun ? <><CheckCircle2 size={14} />Has Spun</> : 'Mark as Spun'}
          </Button>
        ) : (
          <>
            <Button
              size="md"
              variant={participant.checked_in ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={onCheckin}
            >
              {participant.checked_in ? '✓ Checked In' : 'Check In'}
            </Button>
            {!isPaid && (
              <Button
                size="md"
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

function BillBreakdownModal({
  open,
  onClose,
  perPerson,
  checkedInCount,
}: {
  open: boolean
  onClose: () => void
  perPerson: number
  checkedInCount: number
}) {
  const perPersonBreakdown = calculateBillBreakdown(perPerson)
  const totalBreakdown = calculateBillBreakdown(perPerson * checkedInCount)

  return (
    <Modal open={open} onClose={onClose} title="Bill Breakdown">
      <div className="space-y-4">
        <p className="text-slate-400 text-sm">
          How many bills you need to pay each person and in total.
        </p>

        {/* Per person breakdown */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Per Person — ${Math.floor(perPerson).toFixed(0)}
            {perPersonBreakdown.remainder > 0 && (
              <span className="text-slate-400 text-xs ml-1">
                (${perPerson.toFixed(2)} rounded down)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {DENOMINATIONS.map((denom) => (
              <div
                key={denom}
                className={`rounded-xl p-2 text-center border ${
                  perPersonBreakdown[denom] > 0
                    ? 'bg-green-900/30 border-green-700'
                    : 'bg-slate-800 border-slate-700 opacity-40'
                }`}
              >
                <div className="text-slate-300 text-xs">${denom}</div>
                <div className="text-white font-bold text-lg leading-tight">
                  {perPersonBreakdown[denom]}
                </div>
              </div>
            ))}
          </div>
          {perPersonBreakdown.remainder > 0 && (
            <p className="text-slate-500 text-xs mt-1.5">
              + ${perPersonBreakdown.remainder.toFixed(2)} remaining per person
            </p>
          )}
        </div>

        {/* Total breakdown */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Total for All {checkedInCount} Players — ${Math.floor(perPerson * checkedInCount).toFixed(0)}
          </h3>
          <div className="grid grid-cols-5 gap-1.5">
            {DENOMINATIONS.map((denom) => (
              <div
                key={denom}
                className={`rounded-xl p-2 text-center border ${
                  totalBreakdown[denom] > 0
                    ? 'bg-blue-900/30 border-blue-700'
                    : 'bg-slate-800 border-slate-700 opacity-40'
                }`}
              >
                <div className="text-slate-300 text-xs">${denom}</div>
                <div className="text-white font-bold text-lg leading-tight">
                  {totalBreakdown[denom]}
                </div>
              </div>
            ))}
          </div>
          {totalBreakdown.remainder > 0 && (
            <p className="text-slate-500 text-xs mt-1.5">
              + ${totalBreakdown.remainder.toFixed(2)} remaining total
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
