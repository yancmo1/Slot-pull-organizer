import type { Event, Participant } from '../../types'

export function exportEventToCSV(event: Event, participants: Participant[]): void {
  const headers = [
    'Name',
    'Alias/Real Name',
    'Buy-In',
    'Amount Paid',
    'Payment Status',
    'Checked In',
    'Waitlist',
    'Notes',
  ]

  const rows = participants
    .filter((p) => !p.deleted_at)
    .map((p) => [
      p.display_name,
      p.alias_or_real_name ?? '',
      p.buy_in_amount.toFixed(2),
      p.amount_paid.toFixed(2),
      p.payment_status,
      p.checked_in ? 'Yes' : 'No',
      p.waitlist ? 'Yes' : 'No',
      p.notes ?? '',
    ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadFile(csvContent, `${event.title}-${event.date}.csv`, 'text/csv')
}

export function exportAllToJSON(events: Event[], participants: Participant[]): void {
  const data = { events, participants, exported_at: new Date().toISOString() }
  downloadFile(JSON.stringify(data, null, 2), 'slot-pull-backup.json', 'application/json')
}

export async function importFromJSON(
  file: File
): Promise<{ events: Event[]; participants: Participant[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data.events || !data.participants) {
          reject(new Error('Invalid backup file format'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('Failed to parse JSON file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
