import { describe, expect, it } from 'vitest'
import type { Participant } from '../types'
import {
  buildParticipantDraft,
  getNextParticipantSortOrder,
  shouldDefaultParticipantToWaitlist,
} from '../lib/utils/participantDefaults'

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

describe('participant entry defaults', () => {
  it('builds a day-before participant draft with minimal defaults', () => {
    const draft = buildParticipantDraft({
      eventId: 'event-1',
      defaultBuyIn: 25,
      displayName: 'jane d',
      existingParticipants: [],
    })

    expect(draft).toEqual({
      event_id: 'event-1',
      display_name: 'Jane D',
      alias_or_real_name: null,
      buy_in_amount: 25,
      amount_paid: 0,
      payment_method: null,
      checked_in: false,
      waitlist: false,
      notes: null,
      sort_order: 0,
    })
  })

  it('defaults new participants to the waitlist once an event is at capacity', () => {
    const participants = [
      makeParticipant({ id: '1', waitlist: false }),
      makeParticipant({ id: '2', waitlist: false }),
    ]

    expect(shouldDefaultParticipantToWaitlist(2, participants)).toBe(true)
  })

  it('treats max players of 0 as unlimited for waitlist defaults', () => {
    const participants = [
      makeParticipant({ id: '1', waitlist: false }),
      makeParticipant({ id: '2', waitlist: false }),
    ]

    expect(shouldDefaultParticipantToWaitlist(0, participants)).toBe(false)
  })

  it('assigns the next sort order after the highest explicit value', () => {
    const participants = [
      makeParticipant({ id: '1', sort_order: 2 }),
      makeParticipant({ id: '2', sort_order: 4 }),
      makeParticipant({ id: '3', sort_order: null }),
    ]

    expect(getNextParticipantSortOrder(participants)).toBe(5)
  })
})