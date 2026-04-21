import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Event } from '../types'

const {
  deleteEventMock,
  deleteEventSessionsMock,
  deleteParticipantsMock,
  deleteSpinRoundEntriesMock,
  enqueueSyncMock,
  filterMock,
  participantToArrayMock,
} = vi.hoisted(() => ({
  deleteEventMock: vi.fn(),
  deleteEventSessionsMock: vi.fn(),
  deleteParticipantsMock: vi.fn(),
  deleteSpinRoundEntriesMock: vi.fn(),
  enqueueSyncMock: vi.fn(),
  filterMock: vi.fn(),
  participantToArrayMock: vi.fn(),
}))

vi.mock('../lib/db', () => ({
  db: {
    events: {
      delete: deleteEventMock,
      filter: filterMock,
    },
    participants: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: participantToArrayMock,
          delete: deleteParticipantsMock,
        })),
      })),
    },
    spinRoundEntries: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: deleteSpinRoundEntriesMock,
        })),
      })),
    },
    eventSessions: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          delete: deleteEventSessionsMock,
        })),
      })),
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
    participantToArrayMock.mockResolvedValue([])
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

  it('queues participant deletes before deleting an event', async () => {
    participantToArrayMock.mockResolvedValue([
      { id: 'participant-1' },
      { id: 'participant-2' },
    ])
    useEventStore.setState({
      events: [makeEvent({ id: 'event-1' })],
      loading: false,
      loaded: true,
    })

    await useEventStore.getState().deleteEvent('event-1')

    expect(enqueueSyncMock).toHaveBeenNthCalledWith(1, 'participant', 'participant-1', 'delete', { id: 'participant-1' })
    expect(enqueueSyncMock).toHaveBeenNthCalledWith(2, 'participant', 'participant-2', 'delete', { id: 'participant-2' })
    expect(enqueueSyncMock).toHaveBeenNthCalledWith(3, 'event', 'event-1', 'delete', { id: 'event-1' })
    expect(deleteParticipantsMock).toHaveBeenCalledTimes(1)
    expect(deleteSpinRoundEntriesMock).toHaveBeenCalledTimes(1)
    expect(deleteEventSessionsMock).toHaveBeenCalledTimes(1)
    expect(deleteEventMock).toHaveBeenCalledWith('event-1')
    expect(useEventStore.getState().events).toEqual([])
  })
})