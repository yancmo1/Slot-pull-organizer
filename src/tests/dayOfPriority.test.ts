import { describe, expect, it } from 'vitest'
import type { Participant } from '../types'
import {
  getDayOfPriorityLabel,
  matchesDayOfFilter,
  sortDayOfParticipants,
} from '../lib/utils/dayOfPriority'

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

describe('day-of priority helpers', () => {
  it('prioritizes check-in, then payment, then ready-to-spin participants', () => {
    const spunIds = new Set<string>()
    const participants = [
      makeParticipant({ id: 'paid', display_name: 'Paid Player', checked_in: true, payment_status: 'paid', amount_paid: 20 }),
      makeParticipant({ id: 'unchecked', display_name: 'Unchecked Player', checked_in: false }),
      makeParticipant({ id: 'unpaid', display_name: 'Unpaid Player', checked_in: true, payment_status: 'partial', amount_paid: 10 }),
    ]

    const sorted = sortDayOfParticipants(participants, { playMode: false, spunIds })

    expect(sorted.map((participant) => participant.id)).toEqual(['unchecked', 'unpaid', 'paid'])
  })

  it('marks remaining-to-spin players in play mode', () => {
    const participant = makeParticipant({ id: 'ready', checked_in: true, payment_status: 'paid', amount_paid: 20 })

    expect(getDayOfPriorityLabel(participant, { playMode: true, spunIds: new Set() })).toBe('Ready to spin')
    expect(matchesDayOfFilter(participant, 'remaining', { playMode: true, spunIds: new Set() })).toBe(true)
  })

  it('treats needs-action as check-in or payment work', () => {
    const unpaid = makeParticipant({ id: 'unpaid', checked_in: true, payment_status: 'partial', amount_paid: 5 })
    const unchecked = makeParticipant({ id: 'unchecked', checked_in: false })

    expect(matchesDayOfFilter(unpaid, 'needs-action', { playMode: false, spunIds: new Set() })).toBe(true)
    expect(matchesDayOfFilter(unchecked, 'needs-action', { playMode: false, spunIds: new Set() })).toBe(true)
  })
})