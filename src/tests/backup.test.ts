import { describe, it, expect, vi, beforeEach } from 'vitest'
import { assembleBackupData, importFromJSON } from '../lib/utils/export'

vi.mock('../lib/db', () => ({
  db: {
    events: { toArray: vi.fn(async () => []) },
    participants: { toArray: vi.fn(async () => []) },
    spinRoundEntries: { toArray: vi.fn(async () => []) },
    eventSessions: { toArray: vi.fn(async () => []) },
  },
}))

function makeFile(content: unknown): File {
  return new File([JSON.stringify(content)], 'test.json', { type: 'application/json' })
}

const validEvent = { id: 'e1', title: 'Test Event', date: '2026-01-01' }
const validParticipant = {
  id: 'p1',
  event_id: 'e1',
  display_name: 'Alice',
  buy_in_amount: 20,
  amount_paid: 20,
}

describe('assembleBackupData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns schema_version 1', async () => {
    const data = await assembleBackupData()
    expect(data.schema_version).toBe(1)
  })

  it('includes all tables', async () => {
    const data = await assembleBackupData()
    expect(Array.isArray(data.events)).toBe(true)
    expect(Array.isArray(data.participants)).toBe(true)
    expect(Array.isArray(data.spinRoundEntries)).toBe(true)
    expect(Array.isArray(data.eventSessions)).toBe(true)
  })

  it('includes exported_at timestamp', async () => {
    const data = await assembleBackupData()
    expect(typeof data.exported_at).toBe('string')
    expect(data.exported_at.length).toBeGreaterThan(0)
  })
})

describe('importFromJSON', () => {
  it('rejects file over 10 MB', async () => {
    const file = new File(['x'], 'test.json', { type: 'application/json' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    await expect(importFromJSON(file)).rejects.toThrow('too large')
  })

  it('rejects non-array events', async () => {
    const file = makeFile({ events: 'bad', participants: [] })
    await expect(importFromJSON(file)).rejects.toThrow('events must be an array')
  })

  it('rejects non-array participants', async () => {
    const file = makeFile({ events: [], participants: 'bad' })
    await expect(importFromJSON(file)).rejects.toThrow('participants must be an array')
  })

  it('rejects missing required event fields', async () => {
    const file = makeFile({ events: [{ id: 'e1', date: '2026-01-01' }], participants: [] })
    await expect(importFromJSON(file)).rejects.toThrow('missing required fields')
  })

  it('rejects missing required participant fields', async () => {
    const file = makeFile({
      events: [validEvent],
      participants: [{ id: 'p1', event_id: 'e1', buy_in_amount: 20, amount_paid: 20 }],
    })
    await expect(importFromJSON(file)).rejects.toThrow('missing required fields')
  })

  it('rejects unsupported schema_version', async () => {
    const file = makeFile({ schema_version: 99, events: [validEvent], participants: [validParticipant] })
    await expect(importFromJSON(file)).rejects.toThrow('Unsupported backup version')
  })

  it('accepts legacy backup without schema_version', async () => {
    const file = makeFile({ events: [validEvent], participants: [validParticipant] })
    const result = await importFromJSON(file)
    expect(result.schema_version).toBe(1)
    expect(result.events).toHaveLength(1)
    expect(result.participants).toHaveLength(1)
  })

  it('defaults spinRoundEntries and eventSessions to [] for legacy backups', async () => {
    const file = makeFile({ events: [validEvent], participants: [validParticipant] })
    const result = await importFromJSON(file)
    expect(result.spinRoundEntries).toEqual([])
    expect(result.eventSessions).toEqual([])
  })

  it('rejects invalid JSON', async () => {
    const file = new File(['not json {{{'], 'test.json', { type: 'application/json' })
    await expect(importFromJSON(file)).rejects.toThrow('Failed to parse JSON file')
  })
})
