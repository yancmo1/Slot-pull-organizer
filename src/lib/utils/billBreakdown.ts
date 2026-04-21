export const DENOMINATIONS = [100, 20, 10, 5, 1] as const

export type BillBreakdown = {
  [denom: number]: number
  remainder: number
}

export interface CashierBillPlan {
  perPersonWholeAmount: number
  totalWholeAmount: number
  droppedCentsTotal: number
  perPersonBreakdown: BillBreakdown
  totalBreakdown: BillBreakdown
  cashierBreakdown: BillBreakdown
}

/**
 * Given a dollar amount, returns how many of each bill denomination
 * (100, 20, 10, 5, 1) are needed, plus any leftover cents.
 */
export function calculateBillBreakdown(amount: number): BillBreakdown {
  const flooredAmount = Math.floor(amount)
  const breakdown: BillBreakdown = { remainder: parseFloat((amount - flooredAmount).toFixed(2)) }

  let remaining = flooredAmount
  for (const denom of DENOMINATIONS) {
    const count = Math.floor(remaining / denom)
    breakdown[denom] = count
    remaining -= count * denom
  }

  return breakdown
}

export function calculateCashierBillPlan(
  perPerson: number,
  checkedInCount: number,
): CashierBillPlan {
  const safePerPerson = Math.max(0, perPerson)
  const safeCheckedInCount = Math.max(0, checkedInCount)
  const perPersonWholeAmount = Math.max(0, Math.floor(safePerPerson))
  const totalWholeAmount = perPersonWholeAmount * safeCheckedInCount
  const rawTotalAmount = safePerPerson * safeCheckedInCount
  const droppedCentsTotal = parseFloat((rawTotalAmount - totalWholeAmount).toFixed(2))

  const perPersonBreakdown = calculateBillBreakdown(perPersonWholeAmount)
  const totalBreakdown = calculateBillBreakdown(totalWholeAmount)
  const cashierBreakdown: BillBreakdown = { remainder: 0 }

  for (const denom of DENOMINATIONS) {
    cashierBreakdown[denom] = perPersonBreakdown[denom] * safeCheckedInCount
  }

  return {
    perPersonWholeAmount,
    totalWholeAmount,
    droppedCentsTotal,
    perPersonBreakdown,
    totalBreakdown,
    cashierBreakdown,
  }
}
