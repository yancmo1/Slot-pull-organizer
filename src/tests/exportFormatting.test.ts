import { describe, expect, it } from 'vitest'
import { buildEventAttendeeList } from '../lib/utils/export'
import type { Event, Participant } from '../types'

const baseEvent: Event = {
  id: 'event-1',
  title: 'Sheps Saturday Slot Pull',
  trip_label: 'Voyager of the Seas',
  date: '2026-06-06',
  time: '14:00',
  location: 'Casino',
  buy_in_amount: 20,
  max_players: null,
  notes: null,
  archived: false,
  created_at: '2026-04-21T00:00:00.000Z',
  updated_at: '2026-04-21T00:00:00.000Z',
  deleted_at: null,
}

function makeParticipant(overrides: Partial<Participant>): Participant {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    event_id: overrides.event_id ?? baseEvent.id,
    display_name: overrides.display_name ?? 'Guest',
    alias_or_real_name: overrides.alias_or_real_name ?? null,
    buy_in_amount: overrides.buy_in_amount ?? 20,
    amount_paid: overrides.amount_paid ?? 0,
    payment_status: overrides.payment_status ?? 'unpaid',
    payment_method: overrides.payment_method ?? null,
    checked_in: overrides.checked_in ?? false,
    waitlist: overrides.waitlist ?? false,
    notes: overrides.notes ?? null,
    sort_order: overrides.sort_order ?? null,
    created_at: overrides.created_at ?? '2026-04-21T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-04-21T00:00:00.000Z',
    deleted_at: overrides.deleted_at ?? null,
  }
}

describe('buildEventAttendeeList', () => {
  it('formats active attendees with event metadata', () => {
    const text = buildEventAttendeeList(baseEvent, [
      makeParticipant({ id: 'p1', display_name: 'Alice' }),
      makeParticipant({ id: 'p2', display_name: 'Bob', alias_or_real_name: 'Robert' }),
    ])

    expect(text).toContain('🎰 Sheps Saturday Slot Pull')
    expect(text).toContain('Voyager of the Seas')
    expect(text).toContain('2026-06-06 • 14:00 • Casino')
    expect(text).toContain('Attendees (2)')
    expect(text).toContain('1. Alice')
    expect(text).toContain('2. Bob (Robert)')
  })

  it('separates waitlist participants and skips deleted rows', () => {
    const text = buildEventAttendeeList(baseEvent, [
      makeParticipant({ id: 'p1', display_name: 'Alice' }),
      makeParticipant({ id: 'p2', display_name: 'Waitlisted Wendy', waitlist: true }),
      makeParticipant({ id: 'p3', display_name: 'Deleted Dana', deleted_at: '2026-04-21T01:00:00.000Z' }),
    ])

    expect(text).toContain('Attendees (1)')
    expect(text).toContain('Waitlist (1)')
    expect(text).toContain('1. Waitlisted Wendy')
    expect(text).not.toContain('Deleted Dana')
  })

  it('shows a friendly empty state when there are no active attendees yet', () => {
    const text = buildEventAttendeeList(baseEvent, [])

    expect(text).toContain('Attendees (0)')
    expect(text).toContain('— None yet')
  })
})