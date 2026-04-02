import { describe, it, expect } from 'vitest'
import { calculateRoundProgress } from '../lib/utils/roundProgress'
import { calculateTotals } from '../lib/utils/totals'
import type { Participant, SpinRoundEntry } from '../types'

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: crypto.randomUUID(),
    event_id: 'event-1',
    display_name: 'Test User',
    alias_or_real_name: null,
    buy_in_amount: 20,
    amount_paid: 0,
    payment_status: 'unpaid',
    payment_method: null,
    checked_in: false,
    waitlist: false,
    notes: null,
    sort_order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

function makeSpinEntry(overrides: Partial<SpinRoundEntry> = {}): SpinRoundEntry {
  return {
    id: crypto.randomUUID(),
    event_id: 'event-1',
    participant_id: 'p1',
    round_number: 1,
    has_spun: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('calculateRoundProgress', () => {
  it('returns zero counts when no participants', () => {
    const progress = calculateRoundProgress([], [], 1)
    expect(progress.totalEligible).toBe(0)
    expect(progress.spunCount).toBe(0)
    expect(progress.remainingCount).toBe(0)
    expect(progress.allSpun).toBe(false)
  })

  it('counts only checked-in non-waitlist participants as eligible', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const p2 = makeParticipant({ id: 'p2', checked_in: false })
    const p3 = makeParticipant({ id: 'p3', checked_in: true, waitlist: true })
    const progress = calculateRoundProgress([p1, p2, p3], [], 1)
    expect(progress.totalEligible).toBe(1)
  })

  it('counts spun participants for current round', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const p2 = makeParticipant({ id: 'p2', checked_in: true })
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 1, has_spun: true }),
    ]
    const progress = calculateRoundProgress([p1, p2], entries, 1)
    expect(progress.spunCount).toBe(1)
    expect(progress.remainingCount).toBe(1)
    expect(progress.allSpun).toBe(false)
  })

  it('reports allSpun = true when all eligible have spun', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const p2 = makeParticipant({ id: 'p2', checked_in: true })
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 1, has_spun: true }),
      makeSpinEntry({ participant_id: 'p2', round_number: 1, has_spun: true }),
    ]
    const progress = calculateRoundProgress([p1, p2], entries, 1)
    expect(progress.spunCount).toBe(2)
    expect(progress.remainingCount).toBe(0)
    expect(progress.allSpun).toBe(true)
  })

  it('ignores spin entries from other rounds', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 2, has_spun: true }),
    ]
    // Current round is 1, entry is for round 2
    const progress = calculateRoundProgress([p1], entries, 1)
    expect(progress.spunCount).toBe(0)
    expect(progress.allSpun).toBe(false)
  })

  it('ignores has_spun=false entries', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 1, has_spun: false }),
    ]
    const progress = calculateRoundProgress([p1], entries, 1)
    expect(progress.spunCount).toBe(0)
  })

  it('excludes deleted participants from eligible count', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const p2 = makeParticipant({ id: 'p2', checked_in: true, deleted_at: new Date().toISOString() })
    const progress = calculateRoundProgress([p1, p2], [], 1)
    expect(progress.totalEligible).toBe(1)
  })
})

describe('next round creation behavior', () => {
  it('next round starts with zero spun (previous entries are from round 1)', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const p2 = makeParticipant({ id: 'p2', checked_in: true })
    // Round 1 spin entries
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 1, has_spun: true }),
      makeSpinEntry({ participant_id: 'p2', round_number: 1, has_spun: true }),
    ]
    // Start round 2 — entries from round 1 are preserved but don't affect round 2
    const round2Progress = calculateRoundProgress([p1, p2], entries, 2)
    expect(round2Progress.spunCount).toBe(0)
    expect(round2Progress.remainingCount).toBe(2)
    expect(round2Progress.allSpun).toBe(false)
  })

  it('round 1 history is preserved after starting round 2', () => {
    const p1 = makeParticipant({ id: 'p1', checked_in: true })
    const entries = [
      makeSpinEntry({ participant_id: 'p1', round_number: 1, has_spun: true }),
    ]
    const round1Progress = calculateRoundProgress([p1], entries, 1)
    const round2Progress = calculateRoundProgress([p1], entries, 2)
    // Round 1 history still shows as spun
    expect(round1Progress.spunCount).toBe(1)
    // Round 2 correctly shows nothing spun
    expect(round2Progress.spunCount).toBe(0)
  })
})

describe('winnings calculator round independence', () => {
  it('checkedInCount is based on checked-in roster, not round spin state', () => {
    const participants = [
      makeParticipant({ id: 'p1', checked_in: true }),
      makeParticipant({ id: 'p2', checked_in: true }),
      makeParticipant({ id: 'p3', checked_in: false }),
      makeParticipant({ id: 'p4', checked_in: true, waitlist: true }),
    ]
    const totals = calculateTotals(participants)
    // Winnings calculator uses checkedInCount regardless of who has spun
    expect(totals.checkedInCount).toBe(2)
  })

  it('starting a new round does not change checkedInCount', () => {
    const participants = [
      makeParticipant({ id: 'p1', checked_in: true }),
      makeParticipant({ id: 'p2', checked_in: true }),
    ]
    const totals = calculateTotals(participants)
    // Before and after round change, checkedInCount stays the same
    expect(totals.checkedInCount).toBe(2)

    // Simulate starting a new round — participants unchanged, only spin entries reset
    const totalsAfterNewRound = calculateTotals(participants)
    expect(totalsAfterNewRound.checkedInCount).toBe(2)
  })
})
