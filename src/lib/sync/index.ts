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
