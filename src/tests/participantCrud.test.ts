import { describe, it, expect } from 'vitest'
import { calculatePaymentStatus } from '../lib/utils/paymentStatus'
import { calculateTotals } from '../lib/utils/totals'
import type { Participant } from '../types'

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: crypto.randomUUID(),
    event_id: 'event-1',
    display_name: 'Test User',
    alias_or_real_name: null,
    buy_in_amount: 20,
    amount_paid: 0,
    payment_status: 'unpaid',
    checked_in: false,
    waitlist: false,
    notes: null,
    sort_order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

describe('Participant CRUD logic', () => {
  describe('create participant', () => {
    it('assigns correct payment status on creation', () => {
      const status = calculatePaymentStatus(0, 20)
      expect(status).toBe('unpaid')
    })

    it('assigns partial status when partially paid', () => {
      const status = calculatePaymentStatus(10, 20)
      expect(status).toBe('partial')
    })

    it('assigns paid status when fully paid', () => {
      const status = calculatePaymentStatus(20, 20)
      expect(status).toBe('paid')
    })
  })

  describe('update payment status', () => {
    it('recalculates status when amount_paid changes', () => {
      const participant = makeParticipant({ amount_paid: 0, payment_status: 'unpaid' })
      const newStatus = calculatePaymentStatus(20, participant.buy_in_amount)
      expect(newStatus).toBe('paid')
    })
  })

  describe('toggle checked_in', () => {
    it('toggles checked_in flag', () => {
      const participant = makeParticipant({ checked_in: false })
      const updated = { ...participant, checked_in: !participant.checked_in }
      expect(updated.checked_in).toBe(true)
    })
  })

  describe('soft delete', () => {
    it('soft-deleted participants are excluded from totals', () => {
      const participants = [
        makeParticipant({ id: '1' }),
        makeParticipant({ id: '2', deleted_at: new Date().toISOString() }),
      ]
      const totals = calculateTotals(participants)
      expect(totals.totalSignedUp).toBe(1)
    })
  })

  describe('waitlist management', () => {
    it('waitlist participants are excluded from roster totals', () => {
      const participants = [
        makeParticipant({ id: '1', waitlist: false }),
        makeParticipant({ id: '2', waitlist: true }),
      ]
      const totals = calculateTotals(participants)
      expect(totals.totalSignedUp).toBe(1)
      expect(totals.waitlistCount).toBe(1)
    })
  })
})
