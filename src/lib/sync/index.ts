import { db } from '../db'
import type { SyncQueueItem } from '../../types'
import { getPocketBase, isPocketBaseConfigured } from './pocketbase'

const COLLECTION_MAP: Record<SyncQueueItem['entity_type'], string> = {
  event: 'events',
  participant: 'participants',
}

function normalizePulledRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    ...record,
    deleted_at: record.deleted_at === '' ? null : record.deleted_at,
  }
}

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

/** Look up a PocketBase record's own ID by the app's local UUID stored in local_id. */
async function getPBRecordIdByLocalId(
  pb: ReturnType<typeof getPocketBase>,
  collection: string,
  localId: string,
): Promise<string | null> {
  try {
    const results = await pb.collection(collection).getList(1, 1, {
      filter: `local_id = '${localId}'`,
      requestKey: null,
    })
    return results.items[0]?.id ?? null
  } catch {
    return null
  }
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
      // Strip the local UUID `id` from the payload — PocketBase uses its own 15-char IDs.
      // We store our UUID in the `local_id` field for bidirectional mapping.
      const { id: _localId, ...payloadWithoutId } = item.payload as Record<string, unknown>
      void _localId

      if (item.action === 'create') {
        const createPayload = { ...payloadWithoutId, local_id: item.entity_id }
        try {
          await pb.collection(collection).create(createPayload, { requestKey: null })
        } catch (createErr: unknown) {
          // If already exists (409/400 duplicate local_id), fall through to update
          const status = (createErr as { status?: number })?.status
          if (status === 400 || status === 409) {
            const pbId = await getPBRecordIdByLocalId(pb, collection, item.entity_id)
            if (pbId) {
              await pb.collection(collection).update(pbId, payloadWithoutId, { requestKey: null })
            } else {
              throw createErr
            }
          } else {
            throw createErr
          }
        }
      } else if (item.action === 'update') {
        const pbId = await getPBRecordIdByLocalId(pb, collection, item.entity_id)
        if (!pbId) throw new Error(`PB record not found for local_id=${item.entity_id}`)
        await pb.collection(collection).update(pbId, payloadWithoutId, { requestKey: null })
      } else if (item.action === 'delete') {
        const pbId = await getPBRecordIdByLocalId(pb, collection, item.entity_id)
        if (!pbId) {
          // Already deleted or never synced — mark as done
          await db.syncQueue.update(item.id, { synced_at: new Date().toISOString() })
          continue
        }
        await pb.collection(collection).delete(pbId, { requestKey: null })
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
      // Pull all records unconditionally. The `updated` system field is not
      // exposed by the collection's API rules, making date-filtered queries
      // return 400. For this app's data size a full pull is fast and correct.
      const records = await pb.collection(collection).getFullList({
        requestKey: null,
      })

      if (records.length > 0) {
        // Remap PB records to local format:
        // - Use local_id as the record's id (our app's UUID), falling back to PB's id
        // - Strip PB-specific metadata fields that don't belong in the local schema
        const localRecords = records.map((rec) => {
          const {
            id: pbId,
            local_id: localId,
            collectionId: _cId,
            collectionName: _cName,
            ...rest
          } = rec as Record<string, unknown>
          return {
            ...normalizePulledRecord(rest),
            id: (localId as string | undefined) ?? pbId,
          }
        })

        if (entityType === 'event') {
          await db.events.bulkPut(localRecords as never)
        } else if (entityType === 'participant') {
          await db.participants.bulkPut(localRecords as never)
        }
      }
    }
  } catch (err) {
    console.error('[pullChanges] sync error:', err)
  }
}
