import type { Event, Participant, SpinRoundEntry, EventSession } from '../../types'
import { db } from '../db'

const LAST_BACKUP_EXPORT_KEY = 'backup_last_export_at'

export interface BackupData {
  schema_version: 1
  events: Event[]
  participants: Participant[]
  spinRoundEntries: SpinRoundEntry[]
  eventSessions: EventSession[]
  exported_at: string
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function setLastBackupExportAt(value: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_BACKUP_EXPORT_KEY, value)
}

export function getLastBackupExportAt(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LAST_BACKUP_EXPORT_KEY)
}

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

  const safeTitle = sanitizeFilenamePart(event.title) || 'slot-pull-event'
  downloadFile(csvContent, `${safeTitle}-${event.date}.csv`, 'text/csv')
}

function formatAttendeeListName(participant: Participant): string {
  const alias = participant.alias_or_real_name?.trim()
  if (!alias || alias === participant.display_name) {
    return participant.display_name
  }

  return `${participant.display_name} (${alias})`
}

export function buildEventAttendeeList(event: Event, participants: Participant[]): string {
  const activeParticipants = participants.filter((participant) => !participant.deleted_at && !participant.waitlist)
  const waitlistedParticipants = participants.filter((participant) => !participant.deleted_at && participant.waitlist)
  const metadataLine = [event.date, event.time, event.location].filter(Boolean).join(' • ')
  const lines = [`🎰 ${event.title}`]

  if (event.trip_label) {
    lines.push(event.trip_label)
  }

  if (metadataLine) {
    lines.push(metadataLine)
  }

  lines.push('')
  lines.push(`Attendees (${activeParticipants.length})`)

  if (activeParticipants.length === 0) {
    lines.push('— None yet')
  } else {
    activeParticipants.forEach((participant, index) => {
      lines.push(`${index + 1}. ${formatAttendeeListName(participant)}`)
    })
  }

  if (waitlistedParticipants.length > 0) {
    lines.push('')
    lines.push(`Waitlist (${waitlistedParticipants.length})`)
    waitlistedParticipants.forEach((participant, index) => {
      lines.push(`${index + 1}. ${formatAttendeeListName(participant)}`)
    })
  }

  return lines.join('\n')
}

export async function assembleBackupData(): Promise<BackupData> {
  const [events, participants, spinRoundEntries, eventSessions] = await Promise.all([
    db.events.toArray(),
    db.participants.toArray(),
    db.spinRoundEntries.toArray(),
    db.eventSessions.toArray(),
  ])
  return {
    schema_version: 1,
    events,
    participants,
    spinRoundEntries,
    eventSessions,
    exported_at: new Date().toISOString(),
  }
}

export async function exportAllToJSON(): Promise<void> {
  const data = await assembleBackupData()
  const exportedAt = new Date().toISOString()
  setLastBackupExportAt(exportedAt)
  downloadFile(
    JSON.stringify({ ...data, exported_at: exportedAt }, null, 2),
    `slot-pull-backup-${exportedAt.slice(0, 10)}.json`,
    'application/json',
  )
}

export function importFromJSON(file: File): Promise<BackupData> {
  if (file.size > 10 * 1024 * 1024) {
    return Promise.reject(new Error('Backup file is too large (max 10 MB)'))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string)
        if (raw.schema_version !== undefined && raw.schema_version !== 1) {
          reject(new Error('Unsupported backup version'))
          return
        }
        if (!Array.isArray(raw.events)) {
          reject(new Error('Invalid backup: events must be an array'))
          return
        }
        if (!Array.isArray(raw.participants)) {
          reject(new Error('Invalid backup: participants must be an array'))
          return
        }
        const spinRoundEntries: SpinRoundEntry[] = Array.isArray(raw.spinRoundEntries) ? raw.spinRoundEntries : []
        const eventSessions: EventSession[] = Array.isArray(raw.eventSessions) ? raw.eventSessions : []
        const invalidEvents = (raw.events as unknown[]).filter((ev) => {
          const e = ev as Record<string, unknown>
          return !e || typeof e.id !== 'string' || typeof e.title !== 'string' || typeof e.date !== 'string'
        })
        if (invalidEvents.length > 0) {
          reject(new Error(`Invalid backup: ${invalidEvents.length} event(s) missing required fields (id, title, date)`))
          return
        }
        const invalidParticipants = (raw.participants as unknown[]).filter((pt) => {
          const p = pt as Record<string, unknown>
          return !p || typeof p.id !== 'string' || typeof p.event_id !== 'string' || typeof p.display_name !== 'string' || typeof p.buy_in_amount !== 'number' || typeof p.amount_paid !== 'number'
        })
        if (invalidParticipants.length > 0) {
          reject(new Error(`Invalid backup: ${invalidParticipants.length} participant(s) missing required fields`))
          return
        }
        resolve({
          schema_version: 1,
          events: raw.events as Event[],
          participants: raw.participants as Participant[],
          spinRoundEntries,
          eventSessions,
          exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : new Date().toISOString(),
        })
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
