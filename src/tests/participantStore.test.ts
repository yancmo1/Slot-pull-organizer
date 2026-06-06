import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Participant } from '../types'

const { enqueueSyncMock, updateParticipantRecordMock } = vi.hoisted(() => ({
  enqueueSyncMock: vi.fn(),
  updateParticipantRecordMock: vi.fn(),
}))

vi.mock('../lib/db', () => ({
  db: {
    participants: {
      update: updateParticipantRecordMock,
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        })),
      })),
    },
  },
}))

vi.mock('../lib/sync', () => ({
  enqueueSync: enqueueSyncMock,
}))

import { useParticipantStore } from '../store/participantStore'

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: crypto.randomUUID(),
    event_id: 'event-1',
    display_name: 'Test User',
    alias_or_real_name: null,
    buy_in_amount: 20,
    amount_paid: 0,
    payment_status: 'unpaid',
    paid_out: false,
    payment_method: null,
    checked_in: false,
    waitlist: false,
    notes: null,
    sort_order: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  }
}

describe('useParticipantStore paid-out flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParticipantStore.setState({ participants: [], loading: false })
  })

  it('toggles paid_out for fully paid participants', async () => {
    const participant = makeParticipant({
      id: 'participant-1',
      amount_paid: 20,
      payment_status: 'paid',
      paid_out: false,
    })
    useParticipantStore.setState({ participants: [participant], loading: false })

    await useParticipantStore.getState().togglePaidOut(participant.id)

    expect(updateParticipantRecordMock).toHaveBeenCalledTimes(1)
    expect(useParticipantStore.getState().participants[0].paid_out).toBe(true)
    expect(enqueueSyncMock).toHaveBeenCalledTimes(1)
  })

  it('clears paid_out when paid is toggled off', async () => {
    const participant = makeParticipant({
      id: 'participant-2',
      amount_paid: 20,
      payment_status: 'paid',
      paid_out: true,
    })
    useParticipantStore.setState({ participants: [participant], loading: false })

    await useParticipantStore.getState().togglePaid(participant.id)

    const updated = useParticipantStore.getState().participants[0]
    expect(updated.payment_status).toBe('unpaid')
    expect(updated.paid_out).toBe(false)
  })
})
