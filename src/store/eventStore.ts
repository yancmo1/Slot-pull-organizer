import { create } from 'zustand'
import { db } from '../lib/db'
import { enqueueSync } from '../lib/sync'
import type { Event } from '../types'

interface EventStore {
  events: Event[]
  loading: boolean
  loadEvents: () => Promise<void>
  createEvent: (data: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'archived'>) => Promise<Event>
  updateEvent: (id: string, data: Partial<Event>) => Promise<void>
  archiveEvent: (id: string) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  duplicateEvent: (id: string) => Promise<Event>
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  loading: false,

  loadEvents: async () => {
    set({ loading: true })
    const events = await db.events
      .filter((e) => e.deleted_at === null || e.deleted_at === undefined)
      .toArray()
    set({ events, loading: false })
  },

  createEvent: async (data) => {
    const now = new Date().toISOString()
    const event: Event = {
      ...data,
      id: crypto.randomUUID(),
      archived: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await db.events.add(event)
    await enqueueSync('event', event.id, 'create', event)
    set((state) => ({ events: [...state.events, event] }))
    return event
  },

  updateEvent: async (id, data) => {
    const now = new Date().toISOString()
    const updates = { ...data, updated_at: now }
    await db.events.update(id, updates)
    await enqueueSync('event', id, 'update', updates)
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }))
  },

  archiveEvent: async (id) => {
    await get().updateEvent(id, { archived: true })
  },

  deleteEvent: async (id) => {
    const now = new Date().toISOString()
    const updates = { deleted_at: now, updated_at: now }
    await db.events.update(id, updates)
    await enqueueSync('event', id, 'delete', { id })
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }))
  },

  duplicateEvent: async (id) => {
    const event = get().events.find((e) => e.id === id)
    if (!event) throw new Error('Event not found')
    const now = new Date().toISOString()
    const duplicate: Event = {
      ...event,
      id: crypto.randomUUID(),
      title: `${event.title} (copy)`,
      archived: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await db.events.add(duplicate)
    await enqueueSync('event', duplicate.id, 'create', duplicate)
    set((state) => ({ events: [...state.events, duplicate] }))
    return duplicate
  },
}))
