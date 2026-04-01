import Dexie, { type Table } from 'dexie'
import type { Event, Participant, SyncQueueItem } from '../../types'

export class AppDatabase extends Dexie {
  events!: Table<Event>
  participants!: Table<Participant>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('CruiseSlotPullDB')
    this.version(1).stores({
      events: 'id, date, archived, deleted_at',
      participants: 'id, event_id, payment_status, checked_in, waitlist, deleted_at',
      syncQueue: 'id, entity_type, entity_id, action, synced_at',
    })
  }
}

export const db = new AppDatabase()
