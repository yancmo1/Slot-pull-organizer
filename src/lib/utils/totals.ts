import type { Participant, EventTotals } from '../../types'

export function calculateTotals(participants: Participant[]): EventTotals {
  const active = participants.filter((p) => !p.deleted_at)
  const roster = active.filter((p) => !p.waitlist)
  const waitlist = active.filter((p) => p.waitlist)
  const checkedIn = active.filter((p) => p.checked_in)

  const expectedTotal = roster.reduce((sum, p) => sum + p.buy_in_amount, 0)
  const collectedTotal = active.reduce((sum, p) => sum + p.amount_paid, 0)
  const remainingUnpaid = roster.reduce(
    (sum, p) => sum + Math.max(0, p.buy_in_amount - p.amount_paid),
    0
  )

  return {
    totalSignedUp: roster.length,
    checkedInCount: checkedIn.length,
    waitlistCount: waitlist.length,
    expectedTotal,
    collectedTotal,
    remainingUnpaid,
  }
}
