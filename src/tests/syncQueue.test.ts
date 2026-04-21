import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  collectionMock,
  createMock,
  isPocketBaseConfiguredMock,
  queueState,
  remoteRecords,
  syncQueueUpdateMock,
  updateMock,
} = vi.hoisted(() => {
  const queueState = {
    items: [] as Array<Record<string, unknown>>,
  }
  const remoteRecords = new Map<string, string>()
  const createMock = vi.fn(async (payload: Record<string, unknown>) => {
    const localId = payload.local_id as string
    remoteRecords.set(localId, `pb-${localId}`)
    return { id: `pb-${localId}` }
  })
  const updateMock = vi.fn(async () => undefined)
  const deleteMock = vi.fn(async () => undefined)
  const getListMock = vi.fn(async (_page: number, _perPage: number, options?: { filter?: string }) => {
    const localId = options?.filter?.match(/local_id = '([^']+)'/)?.[1]
    const pbId = localId ? remoteRecords.get(localId) : undefined

    return {
      items: pbId ? [{ id: pbId }] : [],
    }
  })
  const collectionMock = vi.fn(() => ({
    create: createMock,
    update: updateMock,
    delete: deleteMock,
    getList: getListMock,
  }))
  const syncQueueUpdateMock = vi.fn(async (id: string, updates: Record<string, unknown>) => {
    const item = queueState.items.find((entry) => entry.id === id)
    if (item) {
      Object.assign(item, updates)
    }
    return 1
  })

  return {
    collectionMock,
    createMock,
    deleteMock,
    getListMock,
    isPocketBaseConfiguredMock: vi.fn(),
    queueState,
    remoteRecords,
    syncQueueUpdateMock,
    updateMock,
  }
})

vi.mock('../lib/db', () => ({
  db: {
    syncQueue: {
      filter: (predicate: (item: Record<string, unknown>) => boolean) => ({
        toArray: async () => queueState.items.filter(predicate),
      }),
      update: syncQueueUpdateMock,
    },
  },
}))

vi.mock('../lib/sync/pocketbase', () => ({
  getPocketBase: () => ({
    authStore: { isValid: true },
    collection: collectionMock,
  }),
  isPocketBaseConfigured: isPocketBaseConfiguredMock,
}))

import { flushSyncQueue } from '../lib/sync'

describe('flushSyncQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queueState.items = []
    remoteRecords.clear()
    isPocketBaseConfiguredMock.mockReturnValue(true)
  })

  it('flushes queued changes oldest-first so updates do not run before creates', async () => {
    queueState.items = [
      {
        id: 'update-item',
        entity_type: 'participant',
        entity_id: 'local-1',
        action: 'update',
        payload: { display_name: 'Updated name' },
        created_at: '2026-04-20T10:00:01.000Z',
        synced_at: null,
        failed_at: null,
      },
      {
        id: 'create-item',
        entity_type: 'participant',
        entity_id: 'local-1',
        action: 'create',
        payload: { id: 'local-1', display_name: 'Updated name' },
        created_at: '2026-04-20T10:00:00.000Z',
        synced_at: null,
        failed_at: null,
      },
    ]

    const result = await flushSyncQueue()

    expect(result).toMatchObject({
      status: 'completed',
      attemptedCount: 2,
      syncedCount: 2,
      failedCount: 0,
    })
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(updateMock.mock.invocationCallOrder[0])
    expect(queueState.items.every((item) => item.synced_at)).toBe(true)
    expect(queueState.items.every((item) => item.failed_at === null)).toBe(true)
  })

  it('prefers create before update for the same record when timestamps tie', async () => {
    queueState.items = [
      {
        id: 'update-item',
        entity_type: 'event',
        entity_id: 'local-2',
        action: 'update',
        payload: { title: 'Updated event' },
        created_at: '2026-04-20T10:00:00.000Z',
        synced_at: null,
        failed_at: null,
      },
      {
        id: 'create-item',
        entity_type: 'event',
        entity_id: 'local-2',
        action: 'create',
        payload: { id: 'local-2', title: 'Updated event' },
        created_at: '2026-04-20T10:00:00.000Z',
        synced_at: null,
        failed_at: null,
      },
    ]

    const result = await flushSyncQueue()

    expect(result.failedCount).toBe(0)
    expect(createMock.mock.invocationCallOrder[0]).toBeLessThan(updateMock.mock.invocationCallOrder[0])
  })
})