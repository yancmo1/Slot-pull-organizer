import type { Participant } from '../../types'

export function calculatePaymentStatus(
  amount_paid: number,
  buy_in_amount: number
): Participant['payment_status'] {
  if (amount_paid <= 0) return 'unpaid'
  if (amount_paid < buy_in_amount) return 'partial'
  return 'paid'
}

export function getQuickPaidToggleAmount(
  participant: Pick<Participant, 'buy_in_amount'>,
  nextPaid: boolean,
): number {
  return nextPaid ? participant.buy_in_amount : 0
}
