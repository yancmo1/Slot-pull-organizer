import type { Participant, SpinRoundEntry } from '../../types'

export interface RoundProgress {
  currentRound: number
  totalEligible: number
  spunCount: number
  remainingCount: number
  allSpun: boolean
}

/**
 * Calculate spin progress for the current round.
 * Eligible participants = checked-in, non-waitlist roster members.
 */
export function calculateRoundProgress(
  participants: Participant[],
  spinEntries: SpinRoundEntry[],
  currentRound: number
): RoundProgress {
  const active = participants.filter(p => !p.deleted_at)
  const checkedInRoster = active.filter(p => !p.waitlist && p.checked_in)

  const spunIdsThisRound = new Set(
    spinEntries
      .filter(e => e.round_number === currentRound && e.has_spun)
      .map(e => e.participant_id)
  )

  const spunCount = checkedInRoster.filter(p => spunIdsThisRound.has(p.id)).length
  const totalEligible = checkedInRoster.length
  const remainingCount = totalEligible - spunCount
  const allSpun = totalEligible > 0 && remainingCount === 0

  return {
    currentRound,
    totalEligible,
    spunCount,
    remainingCount,
    allSpun,
  }
}
