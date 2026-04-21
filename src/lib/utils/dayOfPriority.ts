import type { Participant } from '../../types'

export type DayOfFilter = 'all' | 'needs-action' | 'unpaid' | 'unchecked' | 'remaining'

interface DayOfPriorityOptions {
  playMode: boolean
  spunIds: Set<string>
}

export function matchesDayOfFilter(
  participant: Participant,
  filter: DayOfFilter,
  { playMode, spunIds }: DayOfPriorityOptions,
): boolean {
  if (filter === 'all') return true
  if (filter === 'unpaid') return participant.payment_status !== 'paid'
  if (filter === 'unchecked') return !playMode && !participant.checked_in
  if (filter === 'remaining') return playMode ? !spunIds.has(participant.id) : !participant.checked_in
  return !participant.checked_in || participant.payment_status !== 'paid'
}

export function getDayOfPriorityLabel(
  participant: Participant,
  { playMode, spunIds }: DayOfPriorityOptions,
): string | null {
  if (!participant.checked_in) return 'Needs check-in'
  if (participant.payment_status !== 'paid') return 'Collect payment'
  if (playMode && !spunIds.has(participant.id)) return 'Ready to spin'
  if (playMode && spunIds.has(participant.id)) return 'Round complete'
  return null
}

export function getDayOfParticipantPriority(
  participant: Participant,
  { playMode, spunIds }: DayOfPriorityOptions,
): number {
  if (!participant.checked_in) return 0
  if (participant.payment_status !== 'paid') return 1
  if (playMode && !spunIds.has(participant.id)) return 2
  if (playMode && spunIds.has(participant.id)) return 4
  return 3
}

export function sortDayOfParticipants(
  participants: Participant[],
  options: DayOfPriorityOptions,
): Participant[] {
  return [...participants].sort((left, right) => {
    const priorityDelta = getDayOfParticipantPriority(left, options) - getDayOfParticipantPriority(right, options)
    if (priorityDelta !== 0) return priorityDelta
    return left.display_name.localeCompare(right.display_name)
  })
}