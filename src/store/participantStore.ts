import { create } from 'zustand'
import { db } from '../lib/db'
import { enqueueSync } from '../lib/sync'
import { calculatePaymentStatus } from '../lib/utils/paymentStatus'
import type { Participant } from '../types'

interface ParticipantStore {
  participants: Participant[]
  loading: boolean
  loadParticipants: (eventId: string) => Promise<void>
  createParticipant: (data: Omit<Participant, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'payment_status'>) => Promise<Participant>
  updateParticipant: (id: string, data: Partial<Participant>) => Promise<void>
  deleteParticipant: (id: string) => Promise<void>
  toggleCheckedIn: (id: string) => Promise<void>
  toggleWaitlist: (id: string) => Promise<void>
  markPaid: (id: string) => Promise<void>
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participants: [],
  loading: false,

  loadParticipants: async (eventId) => {
    set({ loading: true })
    const participants = await db.participants
      .where('event_id')
      .equals(eventId)
      .filter((p) => !p.deleted_at)
      .toArray()
    set({ participants, loading: false })
  },

  createParticipant: async (data) => {
    const now = new Date().toISOString()
    const participant: Participant = {
      ...data,
      id: crypto.randomUUID(),
      payment_status: calculatePaymentStatus(data.amount_paid, data.buy_in_amount),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
    await db.participants.add(participant)
    await enqueueSync('participant', participant.id, 'create', participant)
    set((state) => ({ participants: [...state.participants, participant] }))
    return participant
  },

  updateParticipant: async (id, data) => {
    const existing = get().participants.find((p) => p.id === id)
    if (!existing) return
    const now = new Date().toISOString()
    const merged = { ...existing, ...data }
    const payment_status = calculatePaymentStatus(merged.amount_paid, merged.buy_in_amount)
    const updates = { ...data, payment_status, updated_at: now }
    await db.participants.update(id, updates)
    await enqueueSync('participant', id, 'update', updates)
    set((state) => ({
      participants: state.participants.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }))
  },

  deleteParticipant: async (id) => {
    const now = new Date().toISOString()
    const updates = { deleted_at: now, updated_at: now }
    await db.participants.update(id, updates)
    await enqueueSync('participant', id, 'delete', { id })
    set((state) => ({ participants: state.participants.filter((p) => p.id !== id) }))
  },

  toggleCheckedIn: async (id) => {
    const p = get().participants.find((p) => p.id === id)
    if (!p) return
    await get().updateParticipant(id, { checked_in: !p.checked_in })
  },

  toggleWaitlist: async (id) => {
    const p = get().participants.find((p) => p.id === id)
    if (!p) return
    await get().updateParticipant(id, { waitlist: !p.waitlist })
  },

  markPaid: async (id) => {
    const p = get().participants.find((p) => p.id === id)
    if (!p) return
    await get().updateParticipant(id, { amount_paid: p.buy_in_amount })
  },
}))
