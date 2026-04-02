import { create } from 'zustand'
import { db } from '../lib/db'
import type { SpinRoundEntry } from '../types'

interface SpinRoundStore {
  // Current session state
  currentRound: number
  sessionActive: boolean
  spinEntries: SpinRoundEntry[]
  sessionLoading: boolean

  // Actions
  loadSession: (eventId: string) => Promise<void>
  markSpun: (eventId: string, participantId: string) => Promise<void>
  unmarkSpun: (eventId: string, participantId: string) => Promise<void>
  startNextRound: (eventId: string) => Promise<void>
  endSession: (eventId: string) => Promise<void>
  resumeSession: (eventId: string) => Promise<void>

  // Derived helpers
  isSpunInCurrentRound: (participantId: string) => boolean
  getSpunIdsForRound: (round: number) => Set<string>
}

export const useSpinRoundStore = create<SpinRoundStore>((set, get) => ({
  currentRound: 1,
  sessionActive: false,
  spinEntries: [],
  sessionLoading: false,

  loadSession: async (eventId: string) => {
    set({ sessionLoading: true })
    // Load or create the event session
    let session = await db.eventSessions.where('event_id').equals(eventId).first()
    if (!session) {
      const now = new Date().toISOString()
      session = {
        id: crypto.randomUUID(),
        event_id: eventId,
        current_round: 1,
        session_active: false,
        created_at: now,
        updated_at: now,
      }
      await db.eventSessions.add(session)
    }

    // Load all spin entries for this event
    const spinEntries = await db.spinRoundEntries
      .where('event_id')
      .equals(eventId)
      .toArray()

    set({
      currentRound: session.current_round,
      sessionActive: session.session_active,
      spinEntries,
      sessionLoading: false,
    })
  },

  markSpun: async (eventId: string, participantId: string) => {
    const { currentRound, spinEntries } = get()
    const existing = spinEntries.find(
      e => e.event_id === eventId && e.participant_id === participantId && e.round_number === currentRound
    )
    if (existing) {
      // Update to has_spun = true
      const now = new Date().toISOString()
      await db.spinRoundEntries.update(existing.id, { has_spun: true, updated_at: now })
      set(state => ({
        spinEntries: state.spinEntries.map(e =>
          e.id === existing.id ? { ...e, has_spun: true, updated_at: now } : e
        ),
      }))
    } else {
      // Create new entry
      const now = new Date().toISOString()
      const entry: SpinRoundEntry = {
        id: crypto.randomUUID(),
        event_id: eventId,
        participant_id: participantId,
        round_number: currentRound,
        has_spun: true,
        created_at: now,
        updated_at: now,
      }
      await db.spinRoundEntries.add(entry)
      set(state => ({ spinEntries: [...state.spinEntries, entry] }))
    }
  },

  unmarkSpun: async (eventId: string, participantId: string) => {
    const { currentRound, spinEntries } = get()
    const existing = spinEntries.find(
      e => e.participant_id === participantId && e.round_number === currentRound && e.event_id === eventId
    )
    if (existing) {
      const now = new Date().toISOString()
      await db.spinRoundEntries.update(existing.id, { has_spun: false, updated_at: now })
      set(state => ({
        spinEntries: state.spinEntries.map(e =>
          e.id === existing.id ? { ...e, has_spun: false, updated_at: now } : e
        ),
      }))
    }
  },

  startNextRound: async (eventId: string) => {
    const { currentRound } = get()
    const nextRound = currentRound + 1
    const now = new Date().toISOString()

    // Update session record
    const session = await db.eventSessions.where('event_id').equals(eventId).first()
    if (session) {
      await db.eventSessions.update(session.id, {
        current_round: nextRound,
        session_active: true,
        updated_at: now,
      })
    }

    set({ currentRound: nextRound, sessionActive: true })
  },

  endSession: async (eventId: string) => {
    const now = new Date().toISOString()
    const session = await db.eventSessions.where('event_id').equals(eventId).first()
    if (session) {
      await db.eventSessions.update(session.id, {
        session_active: false,
        updated_at: now,
      })
    }
    set({ sessionActive: false })
  },

  resumeSession: async (eventId: string) => {
    const now = new Date().toISOString()
    const session = await db.eventSessions.where('event_id').equals(eventId).first()
    if (session) {
      await db.eventSessions.update(session.id, {
        session_active: true,
        updated_at: now,
      })
    }
    set({ sessionActive: true })
  },

  isSpunInCurrentRound: (participantId: string) => {
    const { currentRound, spinEntries } = get()
    return spinEntries.some(
      e => e.participant_id === participantId && e.round_number === currentRound && e.has_spun
    )
  },

  getSpunIdsForRound: (round: number) => {
    const { spinEntries } = get()
    return new Set(
      spinEntries
        .filter(e => e.round_number === round && e.has_spun)
        .map(e => e.participant_id)
    )
  },
}))
