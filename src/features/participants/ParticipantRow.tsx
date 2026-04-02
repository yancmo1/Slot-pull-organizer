import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { ParticipantForm } from './ParticipantForm'
import { useParticipantStore } from '../../store/participantStore'
import type { Participant } from '../../types'

interface ParticipantRowProps {
  participant: Participant
  defaultBuyIn: number
}

export function ParticipantRow({ participant, defaultBuyIn }: ParticipantRowProps) {
  const { toggleCheckedIn, deleteParticipant } = useParticipantStore()
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isOverpaid = participant.amount_paid > participant.buy_in_amount

  return (
    <>
      <div className={`bg-slate-800 rounded-xl p-3 border ${participant.waitlist ? 'border-slate-600' : 'border-slate-700'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleCheckedIn(participant.id)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors flex-shrink-0 ${participant.checked_in ? 'bg-green-700 text-green-100' : 'bg-slate-700 text-slate-400'}`}
            aria-label={participant.checked_in ? 'Checked in' : 'Not checked in'}
          >
            {participant.checked_in ? '✓' : '○'}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-medium truncate">{participant.display_name}</span>
              {participant.waitlist && <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded-full">waitlist</span>}
            </div>
            {participant.alias_or_real_name && (
              <p className="text-slate-400 text-xs truncate">{participant.alias_or_real_name}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge status={participant.payment_status} />
              <span className="text-slate-400 text-xs">${participant.amount_paid}/${participant.buy_in_amount}</span>
              {isOverpaid && (
                <span className="text-green-400 text-xs bg-green-900/30 px-1.5 py-0.5 rounded-full">
                  +${(participant.amount_paid - participant.buy_in_amount).toFixed(2)}
                </span>
              )}
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-xl shadow-xl border border-slate-600 z-10 min-w-[150px]">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600 rounded-t-xl">✏️ Edit</button>
                <button onClick={() => { deleteParticipant(participant.id); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-600 rounded-b-xl">🗑️ Remove</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Participant">
        <ParticipantForm
          eventId={participant.event_id}
          defaultBuyIn={defaultBuyIn}
          participant={participant}
          onSave={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </Modal>
    </>
  )
}
