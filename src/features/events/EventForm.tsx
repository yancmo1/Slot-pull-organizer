import { useState } from 'react'
import { Input } from '../../components/Input'
import { Textarea } from '../../components/Textarea'
import { Button } from '../../components/Button'
import { useEventStore } from '../../store/eventStore'
import type { Event } from '../../types'

interface EventFormProps {
  event?: Event
  onSave: () => void
  onCancel: () => void
}

export function EventForm({ event, onSave, onCancel }: EventFormProps) {
  const { createEvent, updateEvent } = useEventStore()
  const [title, setTitle] = useState(event?.title ?? '')
  const [trip_label, setTripLabel] = useState(event?.trip_label ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [time, setTime] = useState(event?.time ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [buy_in_amount, setBuyIn] = useState(String(event?.buy_in_amount ?? '20'))
  const [max_players, setMaxPlayers] = useState(String(event?.max_players ?? ''))
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = 'Title is required'
    if (!date) e.date = 'Date is required'
    if (!buy_in_amount || isNaN(Number(buy_in_amount)) || Number(buy_in_amount) < 0)
      e.buy_in_amount = 'Valid buy-in amount is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        trip_label: trip_label.trim() || null,
        date,
        time: time || null,
        location: location.trim() || null,
        buy_in_amount: Number(buy_in_amount),
        max_players: max_players ? Number(max_players) : null,
        notes: notes.trim() || null,
      }
      if (event) {
        await updateEvent(event.id, data)
      } else {
        await createEvent(data)
      }
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Event Title *" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} placeholder="Saturday Night Slot Pull" />
      <Input label="Trip Label" value={trip_label} onChange={(e) => setTripLabel(e.target.value)} placeholder="Carnival Cruise 2025" />
      <Input label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Casino Deck 8" />
      <Input label="Buy-In Amount ($) *" type="number" min="0" step="0.01" value={buy_in_amount} onChange={(e) => setBuyIn(e.target.value)} error={errors.buy_in_amount} />
      <Input label="Max Players" type="number" min="1" value={max_players} onChange={(e) => setMaxPlayers(e.target.value)} placeholder="Optional" />
      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}</Button>
      </div>
    </form>
  )
}
