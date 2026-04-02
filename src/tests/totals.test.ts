import { describe, it, expect } from 'vitest'
import { calculateTotals } from '../lib/utils/totals'
import type { Participant } from '../types'

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

describe('calculateTotals', () => {
  it('returns zeros for empty array', () => {
    const totals = calculateTotals([])
    expect(totals.totalSignedUp).toBe(0)
    expect(totals.checkedInCount).toBe(0)
    expect(totals.waitlistCount).toBe(0)
    expect(totals.expectedTotal).toBe(0)
    expect(totals.collectedTotal).toBe(0)
    expect(totals.remainingUnpaid).toBe(0)
  })

  it('counts roster participants correctly', () => {
    const participants = [
      makeParticipant(),
      makeParticipant(),
      makeParticipant({ waitlist: true }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.totalSignedUp).toBe(2)
    expect(totals.waitlistCount).toBe(1)
  })

  it('counts checked-in participants (roster only)', () => {
    const participants = [
      makeParticipant({ checked_in: true }),
      makeParticipant({ checked_in: true }),
      makeParticipant({ checked_in: false }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.checkedInCount).toBe(2)
  })

  it('excludes waitlist participants from checkedInCount', () => {
    const participants = [
      makeParticipant({ checked_in: true }),
      makeParticipant({ checked_in: true, waitlist: true }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.checkedInCount).toBe(1)
  })

  it('calculates money totals correctly', () => {
    const participants = [
      makeParticipant({ buy_in_amount: 20, amount_paid: 20 }),
      makeParticipant({ buy_in_amount: 20, amount_paid: 10 }),
      makeParticipant({ buy_in_amount: 20, amount_paid: 0 }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.expectedTotal).toBe(60)
    expect(totals.collectedTotal).toBe(30)
    expect(totals.remainingUnpaid).toBe(30)
  })

  it('excludes deleted participants', () => {
    const participants = [
      makeParticipant(),
      makeParticipant({ deleted_at: new Date().toISOString() }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.totalSignedUp).toBe(1)
  })

  it('excludes waitlist from expected total', () => {
    const participants = [
      makeParticipant({ buy_in_amount: 20, amount_paid: 0 }),
      makeParticipant({ buy_in_amount: 20, amount_paid: 0, waitlist: true }),
    ]
    const totals = calculateTotals(participants)
    expect(totals.expectedTotal).toBe(20)
  })
})
