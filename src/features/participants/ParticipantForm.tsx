import { useEffect, useMemo, useState } from 'react'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { useParticipantStore } from '../../store/participantStore'
import { capitalizeWords } from '../../lib/utils/formatName'
import { buildParticipantDraft, shouldDefaultParticipantToWaitlist } from '../../lib/utils/participantDefaults'
import type { Participant } from '../../types'

interface ParticipantFormProps {
  eventId: string
  defaultBuyIn: number
  eventMaxPlayers?: number | null
  existingParticipants?: Participant[]
  participant?: Participant
  onSave: () => void
  onCancel: () => void
}

export function ParticipantForm({
  eventId,
  defaultBuyIn,
  eventMaxPlayers = null,
  existingParticipants = [],
  participant,
  onSave,
  onCancel,
}: ParticipantFormProps) {
  const { createParticipant, updateParticipant } = useParticipantStore()
  const [display_name, setDisplayName] = useState(participant?.display_name ?? '')
  const [alias_or_real_name, setAliasOrRealName] = useState(participant?.alias_or_real_name ?? '')
  const [amount_paid, setAmountPaid] = useState(String(participant?.amount_paid ?? 0))
  const [payment_method, setPaymentMethod] = useState(participant?.payment_method ?? '')
  const [notes, setNotes] = useState(participant?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const defaultWaitlist = useMemo(() => {
    if (participant) return participant.waitlist
    return shouldDefaultParticipantToWaitlist(eventMaxPlayers, existingParticipants)
  }, [eventMaxPlayers, existingParticipants, participant])
  const [waitlist, setWaitlist] = useState(defaultWaitlist)

  useEffect(() => {
    if (!participant) {
      setWaitlist(defaultWaitlist)
    }
  }, [defaultWaitlist, participant])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!display_name.trim()) e.display_name = 'Name is required'
    if (isNaN(Number(amount_paid)) || Number(amount_paid) < 0) e.amount_paid = 'Valid amount required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const resetForNextParticipant = () => {
    setDisplayName('')
    setAliasOrRealName('')
    setAmountPaid('0')
    setPaymentMethod('')
    setWaitlist(shouldDefaultParticipantToWaitlist(eventMaxPlayers, existingParticipants))
    setNotes('')
    setErrors({})
  }

  const saveParticipant = async (closeAfterSave: boolean) => {
    if (!validate()) return
    setSaving(true)
    try {
      if (participant) {
        const data = {
          event_id: eventId,
          display_name: display_name.trim(),
          alias_or_real_name: alias_or_real_name.trim() || null,
          buy_in_amount: participant.buy_in_amount,
          amount_paid: Number(amount_paid),
          payment_method: payment_method.trim() || null,
          checked_in: participant.checked_in,
          waitlist,
          notes: notes.trim() || null,
          sort_order: participant.sort_order,
        }
        await updateParticipant(participant.id, data)
        onSave()
      } else {
        const data = buildParticipantDraft({
          eventId,
          defaultBuyIn,
          displayName: display_name,
          aliasOrRealName: alias_or_real_name,
          amountPaid: Number(amount_paid),
          paymentMethod: payment_method,
          waitlist,
          notes,
          existingParticipants,
          maxPlayers: eventMaxPlayers,
        })
        await createParticipant(data)
        if (closeAfterSave) {
          onSave()
        } else {
          resetForNextParticipant()
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveParticipant(true)
  }

  const handleSaveAndAddAnother = async () => {
    await saveParticipant(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Display Name *" value={display_name} onChange={(e) => setDisplayName(capitalizeWords(e.target.value))} error={errors.display_name} placeholder="Jane D." />
      <Input label="Alias / Real Name" value={alias_or_real_name} onChange={(e) => setAliasOrRealName(capitalizeWords(e.target.value))} placeholder="Optional" />
      <Input label="Amount Paid ($)" type="number" min="0" step="0.01" value={amount_paid} onChange={(e) => setAmountPaid(e.target.value)} error={errors.amount_paid} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="participant-payment-method" className="text-slate-300 text-sm font-medium">Payment Method</label>
        <select
          id="participant-payment-method"
          value={payment_method}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Not specified</option>
          <option value="Cash">Cash</option>
          <option value="Venmo">Venmo</option>
          <option value="PayPal">PayPal</option>
          <option value="Zelle">Zelle</option>
          <option value="Check">Check</option>
          <option value="Card">Card</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div className="flex items-center gap-3 py-1">
        <input id="waitlist" type="checkbox" checked={waitlist} onChange={(e) => setWaitlist(e.target.checked)} className="w-5 h-5 rounded accent-blue-600" />
        <label htmlFor="waitlist" className="text-slate-300 text-base">Waitlist</label>
      </div>
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex flex-col gap-3 pt-2">
        {!participant && (
          <Button type="button" variant="secondary" onClick={handleSaveAndAddAnother} disabled={saving}>
            {saving ? 'Saving…' : 'Save & Add Another'}
          </Button>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : participant ? 'Save Changes' : 'Add Participant'}</Button>
        </div>
      </div>
    </form>
  )
}
