import { db } from '../db'
import type { SyncQueueItem } from '../../types'
import { getPocketBase, isPocketBaseConfigured } from './pocketbase'

const COLLECTION_MAP: Record<SyncQueueItem['entity_type'], string> = {
  event: 'events',
  participant: 'participants',
}

// v2: renamed to bust stale cursors from the old `updated_at` filter (client
// timestamp). The new filter uses PocketBase's server-set `updated` field.
const SYNC_CURSOR_KEY = (collection: string) => `sync_last_v2_${collection}`

/**
 * Convert any ISO-8601 date string to PocketBase's date format.
 * PocketBase (SQLite) stores `updated` as "YYYY-MM-DD HH:MM:SS.mmmZ" (space, not T).
 * Using T-format in a filter causes string comparison failures because
 * space (0x20) < T (0x54), so PB records are always "less than" an ISO cursor.
 */
const toPBDate = (iso: string) => iso.replace('T', ' ')

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
      filter: `local_id = "${localId}"`,
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
      const cursorKey = SYNC_CURSOR_KEY(collection)
      // Convert any stored ISO T-format cursor to PocketBase's space-format.
      // Old cursors written in T-format are normalised here automatically.
      const lastSyncedAt = toPBDate(localStorage.getItem(cursorKey) ?? '2000-01-01 00:00:00.000Z')

      // Capture query time BEFORE the request so records that arrive during
      // processing are caught on the next pull. Store in PocketBase's date
      // format (space separator) so subsequent filter comparisons work correctly.
      const queryTime = toPBDate(new Date().toISOString())

      // Filter on PocketBase's auto-managed `updated` field (set by PB on every
      // write), NOT our client-set `updated_at` field. This ensures records
      // pushed to PB after our last sync are always returned, regardless of the
      // original creation timestamp on the source device.
      const records = await pb.collection(collection).getFullList({
        filter: `updated > "${lastSyncedAt}"`,
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
            created: _created,
            updated: _updated,
            ...rest
          } = rec as Record<string, unknown>
          return { ...rest, id: (localId as string | undefined) ?? pbId }
        })

        if (entityType === 'event') {
          await db.events.bulkPut(localRecords as never)
        } else if (entityType === 'participant') {
          await db.participants.bulkPut(localRecords as never)
        }
      }

      localStorage.setItem(cursorKey, queryTime)
    }
  } catch (err) {
    console.error('[pullChanges] sync error:', err)
  }
}
