import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, CheckCheck, RefreshCw, Calculator, DollarSign, Banknote } from 'lucide-react'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { useSpinRoundStore } from '../../store/spinRoundStore'
import { calculateTotals } from '../../lib/utils/totals'
import { Button } from '../../components/Button'
import { NumberPad } from '../../components/NumberPad'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Modal } from '../../components/Modal'
import { calculateCashierBillPlan, DENOMINATIONS } from '../../lib/utils/billBreakdown'
import {
  getDayOfPriorityLabel,
  matchesDayOfFilter,
  sortDayOfParticipants,
  type DayOfFilter,
} from '../../lib/utils/dayOfPriority'
import { DayOfParticipantCard } from './DayOfParticipantCard'

const ROUND_PROGRESS_WIDTH_CLASSES = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-1/2',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-3/4',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const

export function DayOfScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { events, loading: eventsLoading, loaded: eventsLoaded, loadEvents } = useEventStore()
  const { participants, loadParticipants, toggleCheckInWithPayment, markPaid, checkInAll } = useParticipantStore()
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

  const [filter, setFilter] = useState<DayOfFilter>('all')
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
  const roundProgressBucket = checkedInRoster.length === 0
    ? 0
    : Math.min(
        ROUND_PROGRESS_WIDTH_CLASSES.length - 1,
        Math.round((currentRoundSpunCount / checkedInRoster.length) * (ROUND_PROGRESS_WIDTH_CLASSES.length - 1)),
      )
  const roundProgressWidthClass = ROUND_PROGRESS_WIDTH_CLASSES[roundProgressBucket]
  const unpaidCount = roster.filter((participant) => participant.payment_status !== 'paid').length
  const needsActionCount = roster.filter((participant) => !participant.checked_in || participant.payment_status !== 'paid').length

  // In play mode, only show checked-in participants
  const visibleRoster = playMode ? checkedInRoster : roster
  const effectiveFilter: DayOfFilter = playMode
    ? filter === 'unchecked' || filter === 'needs-action'
      ? 'remaining'
      : filter
    : filter === 'remaining'
    ? 'needs-action'
    : filter

  const filtered = visibleRoster.filter((participant) => matchesDayOfFilter(participant, effectiveFilter, {
    playMode,
    spunIds: currentRoundSpunIds,
  }))

  const sortedFiltered = sortDayOfParticipants(filtered, {
    playMode,
    spunIds: currentRoundSpunIds,
  })

  const filterChips: Array<{ key: DayOfFilter; label: string }> = playMode
    ? [
        { key: 'all', label: `All (${checkedInRoster.length})` },
        { key: 'remaining', label: `Remaining (${currentRoundRemainingCount})` },
        { key: 'unpaid', label: `Unpaid (${checkedInRoster.filter((participant) => participant.payment_status !== 'paid').length})` },
      ]
    : [
        { key: 'all', label: `All (${roster.length})` },
        { key: 'needs-action', label: `Needs Action (${needsActionCount})` },
        { key: 'unpaid', label: `Unpaid (${unpaidCount})` },
        { key: 'unchecked', label: `Not In (${notCheckedInCount})` },
      ]

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
                    className={`h-full bg-blue-500 rounded-full transition-all duration-300 ${roundProgressWidthClass}`}
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
          <div className="flex gap-2 flex-wrap">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setFilter(chip.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${effectiveFilter === chip.key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 px-1">
            Round progress and spin history stay on this device for now.
          </p>
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

        {/* Participant cards */}
        <div className="px-4 pt-3 flex flex-col gap-2">
          {sortedFiltered.map((p) => (
            <DayOfParticipantCard
              key={p.id}
              participant={p}
              onCheckin={() => toggleCheckInWithPayment(p.id)}
              onPaid={() => markPaid(p.id)}
              playMode={playMode}
              hasSpun={currentRoundSpunIds.has(p.id)}
              priorityLabel={getDayOfPriorityLabel(p, { playMode, spunIds: currentRoundSpunIds })}
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
  const {
    perPersonWholeAmount,
    totalWholeAmount,
    droppedCentsTotal,
    perPersonBreakdown,
    totalBreakdown,
    cashierBreakdown,
  } = calculateCashierBillPlan(perPerson, checkedInCount)

  const perPersonBundleSummary = DENOMINATIONS
    .filter((denom) => perPersonBreakdown[denom] > 0)
    .map((denom) => `${perPersonBreakdown[denom]} × $${denom}`)
    .join(' · ')

  return (
    <Modal open={open} onClose={onClose} title="Bill Breakdown">
      <div className="space-y-4">
        <p className="text-slate-400 text-sm">
          Whole-dollar payout plan for each player, the full payout total, and the exact bills to grab from the cashier.
        </p>

        {droppedCentsTotal > 0 && (
          <div className="rounded-xl border border-amber-700 bg-amber-900/30 p-3">
            <p className="text-amber-200 text-sm font-medium">Cents removed from payout totals</p>
            <p className="text-amber-300 text-xs mt-1">
              The calculator shows ${perPerson.toFixed(2)} per player, but the cash plan uses ${perPersonWholeAmount.toFixed(0)} each.
              ${droppedCentsTotal.toFixed(2)} stays out of this payout total.
            </p>
          </div>
        )}

        {/* Per person breakdown */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Per Person — ${perPersonWholeAmount.toFixed(0)}
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
        </div>

        {/* Total breakdown */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Total for All {checkedInCount} Players — ${totalWholeAmount.toFixed(0)}
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
        </div>

        {/* Cashier pickup breakdown */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Get From Cashier — ${totalWholeAmount.toFixed(0)} ready to distribute
          </h3>
          <p className="text-slate-400 text-xs mb-2">
            Grab this mix so each player can be paid with the same bill bundle quickly.
            {perPersonBundleSummary ? ` Per player: ${perPersonBundleSummary}.` : ' No whole-dollar bills are needed per player.'}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {DENOMINATIONS.map((denom) => (
              <div
                key={denom}
                className={`rounded-xl p-2 text-center border ${
                  cashierBreakdown[denom] > 0
                    ? 'bg-purple-900/30 border-purple-700'
                    : 'bg-slate-800 border-slate-700 opacity-40'
                }`}
              >
                <div className="text-slate-300 text-xs">${denom}</div>
                <div className="text-white font-bold text-lg leading-tight">
                  {cashierBreakdown[denom]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
