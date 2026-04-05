import { db } from '../db'
import type { SyncQueueItem } from '../../types'

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
