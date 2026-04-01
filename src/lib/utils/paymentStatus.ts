import type { Participant } from '../../types'

export function calculatePaymentStatus(
  amount_paid: number,
  buy_in_amount: number
): Participant['payment_status'] {
  if (amount_paid <= 0) return 'unpaid'
  if (amount_paid < buy_in_amount) return 'partial'
  return 'paid'
}
