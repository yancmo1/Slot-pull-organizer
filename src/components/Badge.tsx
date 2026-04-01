interface BadgeProps {
  status: 'unpaid' | 'partial' | 'paid'
}

export function Badge({ status }: BadgeProps) {
  const styles = {
    unpaid: 'bg-red-900 text-red-200',
    partial: 'bg-yellow-900 text-yellow-200',
    paid: 'bg-green-900 text-green-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}
