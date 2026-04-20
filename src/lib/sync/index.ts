import { db } from '../db'
import type { SyncQueueItem } from '../../types'
import { getPocketBase, isPocketBaseConfigured } from './pocketbase'

const COLLECTION_MAP: Record<SyncQueueItem['entity_type'], string> = {
  event: 'events',
  participant: 'participants',
}

const SYNC_CURSOR_KEY = (collection: string) => `sync_last_${collection}`

export async function enqueueSync(
  entity_type: SyncQueueItem['entity_type'],
  entity_id: string,
  action: SyncQueueItem['action'],
  payload: object
): Promise<void> {
  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    entity_type,
    entity_id,
    action,
    payload,
    created_at: new Date().toISOString(),
    synced_at: null,
    failed_at: null,
  }
  await db.syncQueue.add(item)
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .filter((item) => item.synced_at === null)
    .toArray()
}

export async function purgeSyncQueue(maxAgeDays = 30): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - maxAgeDays)
  const cutoffISO = cutoff.toISOString()
  const old = await db.syncQueue
    .filter((item) => item.created_at < cutoffISO)
    .toArray()
  if (old.length === 0) return 0
  await db.syncQueue.bulkDelete(old.map((item) => item.id))
  return old.length
}

export async function flushSyncQueue(): Promise<void> {
  if (!isPocketBaseConfigured()) return
  const pb = getPocketBase()
  if (!pb.authStore.isValid) return

  const pending = await getPendingSyncItems()
  for (const item of pending) {
    const collection = COLLECTION_MAP[item.entity_type]
    if (!collection) continue
    try {
      if (item.action === 'create') {
        try {
          await pb.collection(collection).create(item.payload, { requestKey: null })
        } catch (createErr: unknown) {
          // If already exists (400), fall through to update
          if ((createErr as { status?: number })?.status === 400) {
            await pb.collection(collection).update(item.entity_id, item.payload, { requestKey: null })
          } else {
            throw createErr
          }
        }
      } else if (item.action === 'update') {
        await pb.collection(collection).update(item.entity_id, item.payload, { requestKey: null })
      } else if (item.action === 'delete') {
        await pb.collection(collection).delete(item.entity_id, { requestKey: null })
      }
      await db.syncQueue.update(item.id, { synced_at: new Date().toISOString() })
    } catch {
      await db.syncQueue.update(item.id, { failed_at: new Date().toISOString() })
    }
  }
}

export async function pullChanges(): Promise<void> {
  if (!isPocketBaseConfigured()) return
  const pb = getPocketBase()
  if (!pb.authStore.isValid) return

  try {
    for (const [entityType, collection] of Object.entries(COLLECTION_MAP)) {
      const cursorKey = SYNC_CURSOR_KEY(collection)
      const lastSyncedAt = localStorage.getItem(cursorKey) ?? '2000-01-01T00:00:00Z'

      const records = await pb.collection(collection).getFullList({
        filter: `updated_at > "${lastSyncedAt}"`,
        requestKey: null,
      })

      if (records.length > 0) {
        if (entityType === 'event') {
          await db.events.bulkPut(records as never)
        } else if (entityType === 'participant') {
          await db.participants.bulkPut(records as never)
        }
      }

      localStorage.setItem(cursorKey, new Date().toISOString())
    }
  } catch (err) {
    console.error('[pullChanges] sync error:', err)
  }
}
