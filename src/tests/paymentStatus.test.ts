import { describe, it, expect } from 'vitest'
import { calculatePaymentStatus } from '../lib/utils/paymentStatus'

describe('calculatePaymentStatus', () => {
  it('returns unpaid when amount_paid is 0', () => {
    expect(calculatePaymentStatus(0, 20)).toBe('unpaid')
  })

  it('returns unpaid when amount_paid is negative', () => {
    expect(calculatePaymentStatus(-1, 20)).toBe('unpaid')
  })

  it('returns partial when amount_paid > 0 and < buy_in_amount', () => {
    expect(calculatePaymentStatus(10, 20)).toBe('partial')
    expect(calculatePaymentStatus(1, 20)).toBe('partial')
    expect(calculatePaymentStatus(19.99, 20)).toBe('partial')
  })

  it('returns paid when amount_paid equals buy_in_amount', () => {
    expect(calculatePaymentStatus(20, 20)).toBe('paid')
  })

  it('returns paid when amount_paid exceeds buy_in_amount', () => {
    expect(calculatePaymentStatus(25, 20)).toBe('paid')
  })
})
