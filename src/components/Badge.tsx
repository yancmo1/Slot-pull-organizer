interface BadgeProps {
  status: 'unpaid' | 'partial' | 'paid'
}

export function Badge({ status }: BadgeProps) {
  const styles = {
    unpaid: 'bg-red-500/15 text-red-300 border border-red-500/30',
    partial: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    paid: 'bg-green-500/15 text-green-300 border border-green-500/30',
  }
  const labels = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
