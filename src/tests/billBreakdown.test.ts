import { describe, it, expect } from 'vitest'
import { calculateBillBreakdown, calculateCashierBillPlan } from '../lib/utils/billBreakdown'

describe('calculateBillBreakdown', () => {
  it('breaks down a round dollar amount into bills', () => {
    const result = calculateBillBreakdown(135)
    expect(result[100]).toBe(1)
    expect(result[20]).toBe(1)
    expect(result[10]).toBe(1)
    expect(result[5]).toBe(1)
    expect(result[1]).toBe(0)
    expect(result.remainder).toBe(0)
  })

  it('floors fractional amounts and stores remainder', () => {
    const result = calculateBillBreakdown(67.75)
    expect(result[100]).toBe(0)
    expect(result[20]).toBe(3)
    expect(result[10]).toBe(0)
    expect(result[5]).toBe(1)
    expect(result[1]).toBe(2)
    expect(result.remainder).toBe(0.75)
  })

  it('handles amounts less than 1 dollar', () => {
    const result = calculateBillBreakdown(0.50)
    expect(result[100]).toBe(0)
    expect(result[20]).toBe(0)
    expect(result[10]).toBe(0)
    expect(result[5]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result.remainder).toBe(0.5)
  })

  it('handles exactly 100 dollars', () => {
    const result = calculateBillBreakdown(100)
    expect(result[100]).toBe(1)
    expect(result[20]).toBe(0)
    expect(result[10]).toBe(0)
    expect(result[5]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result.remainder).toBe(0)
  })

  it('handles zero', () => {
    const result = calculateBillBreakdown(0)
    expect(result[100]).toBe(0)
    expect(result[20]).toBe(0)
    expect(result[10]).toBe(0)
    expect(result[5]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result.remainder).toBe(0)
  })

  it('handles large amounts with many bills', () => {
    // $346 = 3×$100 + 2×$20 + 1×$5 + 1×$1
    const result = calculateBillBreakdown(346)
    expect(result[100]).toBe(3)
    expect(result[20]).toBe(2)
    expect(result[10]).toBe(0)
    expect(result[5]).toBe(1)
    expect(result[1]).toBe(1)
    expect(result.remainder).toBe(0)
  })
})

describe('calculateCashierBillPlan', () => {
  it('keeps a cashier-ready bill mix separate from the greedy total breakdown', () => {
    const result = calculateCashierBillPlan(25, 3)

    expect(result.perPersonWholeAmount).toBe(25)
    expect(result.totalWholeAmount).toBe(75)

    expect(result.perPersonBreakdown[20]).toBe(1)
    expect(result.perPersonBreakdown[5]).toBe(1)

    expect(result.totalBreakdown[20]).toBe(3)
    expect(result.totalBreakdown[10]).toBe(1)
    expect(result.totalBreakdown[5]).toBe(1)

    expect(result.cashierBreakdown[20]).toBe(3)
    expect(result.cashierBreakdown[10]).toBe(0)
    expect(result.cashierBreakdown[5]).toBe(3)
    expect(result.cashierBreakdown[1]).toBe(0)
  })

  it('removes cents from payout totals while tracking what was dropped', () => {
    const result = calculateCashierBillPlan(27.75, 4)

    expect(result.perPersonWholeAmount).toBe(27)
    expect(result.totalWholeAmount).toBe(108)
    expect(result.droppedCentsTotal).toBe(3)

    expect(result.totalBreakdown[100]).toBe(1)
    expect(result.totalBreakdown[5]).toBe(1)
    expect(result.totalBreakdown[1]).toBe(3)

    expect(result.cashierBreakdown[20]).toBe(4)
    expect(result.cashierBreakdown[5]).toBe(4)
    expect(result.cashierBreakdown[1]).toBe(8)
  })

  it('tracks exact total cents removed for repeating-decimal splits', () => {
    const result = calculateCashierBillPlan(100 / 3, 3)

    expect(result.perPersonWholeAmount).toBe(33)
    expect(result.totalWholeAmount).toBe(99)
    expect(result.droppedCentsTotal).toBe(1)
  })

  it('handles payouts below one dollar without requesting any bills', () => {
    const result = calculateCashierBillPlan(0.5, 5)

    expect(result.perPersonWholeAmount).toBe(0)
    expect(result.totalWholeAmount).toBe(0)
    expect(result.droppedCentsTotal).toBe(2.5)

    expect(result.cashierBreakdown[100]).toBe(0)
    expect(result.cashierBreakdown[20]).toBe(0)
    expect(result.cashierBreakdown[10]).toBe(0)
    expect(result.cashierBreakdown[5]).toBe(0)
    expect(result.cashierBreakdown[1]).toBe(0)
  })
})
