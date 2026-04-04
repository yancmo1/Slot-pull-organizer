import { useState } from 'react'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { useParticipantStore } from '../../store/participantStore'
import { capitalizeWords } from '../../lib/utils/formatName'
import type { Participant } from '../../types'

interface ParticipantFormProps {
  eventId: string
  defaultBuyIn: number
  participant?: Participant
  onSave: () => void
  onCancel: () => void
}

export function ParticipantForm({ eventId, defaultBuyIn, participant, onSave, onCancel }: ParticipantFormProps) {
  const { createParticipant, updateParticipant } = useParticipantStore()
  const [display_name, setDisplayName] = useState(participant?.display_name ?? '')
  const [alias_or_real_name, setAlias] = useState(participant?.alias_or_real_name ?? '')
  const [buy_in_amount, setBuyIn] = useState(String(participant?.buy_in_amount ?? defaultBuyIn))
  const [amount_paid, setAmountPaid] = useState(String(participant?.amount_paid ?? 0))
  const [payment_method, setPaymentMethod] = useState(participant?.payment_method ?? 'Cash')
  const [waitlist, setWaitlist] = useState(participant?.waitlist ?? false)
  const [notes, setNotes] = useState(participant?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!display_name.trim()) e.display_name = 'Name is required'
    if (isNaN(Number(buy_in_amount)) || Number(buy_in_amount) < 0) e.buy_in_amount = 'Valid amount required'
    if (isNaN(Number(amount_paid)) || Number(amount_paid) < 0) e.amount_paid = 'Valid amount required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const data = {
        event_id: eventId,
        display_name: display_name.trim(),
        alias_or_real_name: alias_or_real_name.trim() || null,
        buy_in_amount: Number(buy_in_amount),
        amount_paid: Number(amount_paid),
        payment_method: payment_method.trim() || null,
        checked_in: participant?.checked_in ?? false,
        waitlist,
        notes: notes.trim() || null,
        sort_order: participant?.sort_order ?? null,
      }
      if (participant) {
        await updateParticipant(participant.id, data)
      } else {
        await createParticipant(data)
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Display Name *" value={display_name} onChange={(e) => setDisplayName(capitalizeWords(e.target.value))} error={errors.display_name} placeholder="Jane D." />
      <Input label="Alias / Real Name" value={alias_or_real_name} onChange={(e) => setAlias(capitalizeWords(e.target.value))} placeholder="Jane Doe (optional)" />
      <Input label="Buy-In ($)" type="number" min="0" step="0.01" value={buy_in_amount} onChange={(e) => setBuyIn(e.target.value)} error={errors.buy_in_amount} />
      <Input label="Amount Paid ($)" type="number" min="0" step="0.01" value={amount_paid} onChange={(e) => setAmountPaid(e.target.value)} error={errors.amount_paid} />
      <div className="flex flex-col gap-1.5">
        <label className="text-slate-300 text-sm font-medium">Payment Method</label>
        <select
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
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : participant ? 'Save Changes' : 'Add Participant'}</Button>
      </div>
    </form>
  )
}
