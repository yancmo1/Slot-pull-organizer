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
    // Version 2: Add payment_method field to participants
    this.version(2).stores({
      events: 'id, date, archived, deleted_at',
      participants: 'id, event_id, payment_status, checked_in, waitlist, deleted_at',
      syncQueue: 'id, entity_type, entity_id, action, synced_at',
    }).upgrade(tx => {
      // Existing records will have payment_method as null by default
      return tx.table('participants').toCollection().modify(participant => {
        if (!participant.payment_method) {
          participant.payment_method = null
        }
      })
    })
  }
}

export const db = new AppDatabase()
