import { describe, it, expect } from 'vitest'
import { calculateBillBreakdown } from '../lib/utils/billBreakdown'

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
