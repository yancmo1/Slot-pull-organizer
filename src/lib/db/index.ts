import Dexie, { type Table } from 'dexie'
import type { Event, Participant, SyncQueueItem, SpinRoundEntry, EventSession } from '../../types'

export class AppDatabase extends Dexie {
  events!: Table<Event>
  participants!: Table<Participant>
  syncQueue!: Table<SyncQueueItem>
  spinRoundEntries!: Table<SpinRoundEntry>
  eventSessions!: Table<EventSession>

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
    // Version 3: Add spin round entries and event sessions for multi-round play
    this.version(3).stores({
      events: 'id, date, archived, deleted_at',
      participants: 'id, event_id, payment_status, checked_in, waitlist, deleted_at',
      syncQueue: 'id, entity_type, entity_id, action, synced_at',
      spinRoundEntries: 'id, event_id, participant_id, round_number, [event_id+round_number]',
      eventSessions: 'id, event_id',
    })
  }
}

export const db = new AppDatabase()
