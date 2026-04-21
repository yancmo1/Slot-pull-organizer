import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  eventState,
  getFullListMock,
  isPocketBaseConfiguredMock,
  participantState,
  syncQueueItems,
} = vi.hoisted(() => {
  const eventState = {
    items: [] as Array<Record<string, unknown>>,
  }
  const participantState = {
    items: [] as Array<Record<string, unknown>>,
  }
  const syncQueueItems = {
    items: [] as Array<Record<string, unknown>>,
  }
  const getFullListMock = vi.fn(async (collection: string) => {
    if (collection === 'events') return []
    if (collection === 'participants') return []
    return []
  })

  return {
    eventState,
    getFullListMock,
    isPocketBaseConfiguredMock: vi.fn(),
    participantState,
    syncQueueItems,
  }
})

vi.mock('../lib/db', () => ({
  db: {
    events: {
      bulkPut: vi.fn(async (records: Array<Record<string, unknown>>) => {
        for (const record of records) {
          const index = eventState.items.findIndex((item) => item.id === record.id)
          if (index >= 0) {
            eventState.items[index] = record
          } else {
            eventState.items.push(record)
          }
        }
      }),
      toArray: vi.fn(async () => eventState.items),
      bulkDelete: vi.fn(async (ids: string[]) => {
        eventState.items = eventState.items.filter((item) => !ids.includes(String(item.id)))
      }),
    },
    participants: {
      bulkPut: vi.fn(async (records: Array<Record<string, unknown>>) => {
        for (const record of records) {
          const index = participantState.items.findIndex((item) => item.id === record.id)
          if (index >= 0) {
            participantState.items[index] = record
          } else {
            participantState.items.push(record)
          }
        }
      }),
      toArray: vi.fn(async () => participantState.items),
      bulkDelete: vi.fn(async (ids: string[]) => {
        participantState.items = participantState.items.filter((item) => !ids.includes(String(item.id)))
      }),
    },
    syncQueue: {
      toArray: vi.fn(async () => syncQueueItems.items),
    },
  },
}))

vi.mock('../lib/sync/pocketbase', () => ({
  getPocketBase: () => ({
    authStore: { isValid: true },
    collection: (name: string) => ({
      getFullList: () => getFullListMock(name),
    }),
  }),
  isPocketBaseConfigured: isPocketBaseConfiguredMock,
}))

import { pullChanges } from '../lib/sync'

describe('pullChanges delete reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    eventState.items = []
    participantState.items = []
    syncQueueItems.items = []
    isPocketBaseConfiguredMock.mockReturnValue(true)
    getFullListMock.mockImplementation(async (collection: string) => {
      if (collection === 'events') return []
      if (collection === 'participants') return []
      return []
    })
  })

  it('removes local records that no longer exist remotely when no local sync is pending', async () => {
    eventState.items = [{ id: 'event-gone', title: 'Gone' }]
    participantState.items = [{ id: 'participant-gone', event_id: 'event-gone', display_name: 'Gone' }]

    const result = await pullChanges()

    expect(result).toMatchObject({ status: 'completed', recordCount: 0 })
    expect(eventState.items).toEqual([])
    expect(participantState.items).toEqual([])
  })

  it('keeps local rows that are still waiting in the sync queue even if the remote list is empty', async () => {
    eventState.items = [{ id: 'local-pending-event', title: 'Pending' }]
    participantState.items = [{ id: 'local-pending-participant', event_id: 'local-pending-event', display_name: 'Pending' }]
    syncQueueItems.items = [
      {
        id: 'queue-1',
        entity_type: 'event',
        entity_id: 'local-pending-event',
        action: 'create',
        payload: { id: 'local-pending-event' },
        created_at: '2026-04-21T00:00:00.000Z',
        synced_at: null,
        failed_at: null,
      },
      {
        id: 'queue-2',
        entity_type: 'participant',
        entity_id: 'local-pending-participant',
        action: 'create',
        payload: { id: 'local-pending-participant' },
        created_at: '2026-04-21T00:00:01.000Z',
        synced_at: null,
        failed_at: null,
      },
    ]

    const result = await pullChanges()

    expect(result.status).toBe('completed')
    expect(eventState.items).toEqual([{ id: 'local-pending-event', title: 'Pending' }])
    expect(participantState.items).toEqual([{ id: 'local-pending-participant', event_id: 'local-pending-event', display_name: 'Pending' }])
  })
})