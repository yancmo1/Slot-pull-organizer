export const DENOMINATIONS = [100, 20, 10, 5, 1] as const

export type BillBreakdown = {
  [denom: number]: number
  remainder: number
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
