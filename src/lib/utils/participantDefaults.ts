import type { Participant } from '../../types'
import { capitalizeWords } from './formatName'

interface BuildParticipantDraftOptions {
  eventId: string
  defaultBuyIn: number
  displayName: string
  aliasOrRealName?: string | null
  amountPaid?: number
  paymentMethod?: string | null
  checkedIn?: boolean
  waitlist?: boolean
  notes?: string | null
  sortOrder?: number | null
  existingParticipants?: Pick<Participant, 'deleted_at' | 'sort_order' | 'waitlist'>[]
  maxPlayers?: number | null
}

function getActiveParticipants(
  participants: Pick<Participant, 'deleted_at' | 'sort_order' | 'waitlist'>[],
) {
  return participants.filter((participant) => !participant.deleted_at)
}

export function shouldDefaultParticipantToWaitlist(
  maxPlayers: number | null,
  participants: Pick<Participant, 'deleted_at' | 'waitlist'>[],
): boolean {
  if (maxPlayers === null || maxPlayers <= 0) return false

  const rosterCount = participants.filter(
    (participant) => !participant.deleted_at && !participant.waitlist,
  ).length

  return rosterCount >= maxPlayers
}

export function getNextParticipantSortOrder(
  participants: Pick<Participant, 'deleted_at' | 'sort_order' | 'waitlist'>[],
): number {
  const activeParticipants = getActiveParticipants(participants)
  const explicitSortOrders = activeParticipants
    .map((participant) => participant.sort_order)
    .filter((sortOrder): sortOrder is number => sortOrder !== null)

  if (explicitSortOrders.length > 0) {
    return Math.max(...explicitSortOrders) + 1
  }

  return activeParticipants.length
}

export function buildParticipantDraft({
  eventId,
  defaultBuyIn,
  displayName,
  aliasOrRealName = null,
  amountPaid = 0,
  paymentMethod = null,
  checkedIn = false,
  waitlist,
  notes = null,
  sortOrder,
  existingParticipants = [],
  maxPlayers = null,
}: BuildParticipantDraftOptions): Omit<Participant, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'payment_status'> {
  const normalizedAlias = capitalizeWords(aliasOrRealName?.trim() ?? '')

  return {
    event_id: eventId,
    display_name: capitalizeWords(displayName.trim()),
    alias_or_real_name: normalizedAlias || null,
    buy_in_amount: defaultBuyIn,
    amount_paid: amountPaid,
    payment_method: paymentMethod?.trim() || null,
    checked_in: checkedIn,
    waitlist: waitlist ?? shouldDefaultParticipantToWaitlist(maxPlayers, existingParticipants),
    notes: notes?.trim() || null,
    sort_order: sortOrder ?? getNextParticipantSortOrder(existingParticipants),
  }
}