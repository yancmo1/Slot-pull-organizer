import { CheckCircle2 } from 'lucide-react'
import { Button } from '../../components/Button'
import type { Participant } from '../../types'

export interface DayOfParticipantCardProps {
  participant: Participant
  onCheckin: () => void
  onPaid: () => void
  playMode?: boolean
  hasSpun?: boolean
  priorityLabel?: string | null
  onToggleSpin?: () => void
}

export function DayOfParticipantCard({
  participant,
  onCheckin,
  onPaid,
  playMode,
  hasSpun,
  priorityLabel,
  onToggleSpin,
}: DayOfParticipantCardProps) {
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
      {priorityLabel && (
        <p className="text-[11px] text-slate-400 mb-2">{priorityLabel}</p>
      )}
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