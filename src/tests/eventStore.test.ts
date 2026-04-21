import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Event } from '../types'

const { filterMock, enqueueSyncMock } = vi.hoisted(() => ({
  filterMock: vi.fn(),
  enqueueSyncMock: vi.fn(),
}))

vi.mock('../lib/db', () => ({
  db: {
    events: {
      filter: filterMock,
    },
  },
}))

vi.mock('../lib/sync', () => ({
  enqueueSync: enqueueSyncMock,
}))

import { useEventStore } from '../store/eventStore'

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: crypto.randomUUID(),
    title: 'Test Event',
    trip_label: null,
    date: '2026-04-20',
    time: null,
    location: null,
    buy_in_amount: 20,
    max_players: null,
    notes: null,
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

describe('useEventStore.loadEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEventStore.setState({ events: [], loading: false, loaded: false })
  })

  it('keeps records with blank deleted_at returned by PocketBase', async () => {
    const pulledEvents = [
      makeEvent({ id: 'event-null', deleted_at: null }),
      makeEvent({ id: 'event-empty', deleted_at: '' as unknown as null }),
      makeEvent({ id: 'event-deleted', deleted_at: new Date().toISOString() }),
    ]

    filterMock.mockImplementation((predicate: (event: Event) => boolean) => ({
      toArray: async () => pulledEvents.filter(predicate),
    }))

    await useEventStore.getState().loadEvents()

    expect(useEventStore.getState().events.map((event) => event.id)).toEqual([
      'event-null',
      'event-empty',
    ])
    expect(useEventStore.getState().loaded).toBe(true)
  })
})