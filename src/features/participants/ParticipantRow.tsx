import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../../components/Badge'
import { Modal } from '../../components/Modal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ParticipantForm } from './ParticipantForm'
import { useParticipantStore } from '../../store/participantStore'
import type { Participant } from '../../types'

interface ParticipantRowProps {
  participant: Participant
  defaultBuyIn: number
}

export function ParticipantRow({ participant, defaultBuyIn }: ParticipantRowProps) {
  const { toggleCheckedIn, togglePaid, deleteParticipant } = useParticipantStore()
  const [editing, setEditing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isPaid = participant.payment_status === 'paid'
  const isOverpaid = participant.amount_paid > participant.buy_in_amount

  const handleDelete = () => {
    deleteParticipant(participant.id)
    setShowDeleteConfirm(false)
  }

  return (
    <>
      <div className={`bg-slate-800 rounded-xl p-3 border relative ${menuOpen ? 'z-30' : 'z-0'} ${participant.waitlist ? 'border-slate-600' : 'border-slate-700'}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-medium truncate">{participant.display_name}</span>
              {participant.waitlist && <span className="text-xs text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded-full">waitlist</span>}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge status={participant.payment_status} />
              <span className="text-slate-400 text-xs">${participant.amount_paid}/${participant.buy_in_amount}</span>
              {isOverpaid && (
                <span className="text-green-400 text-xs bg-green-900/30 px-1.5 py-0.5 rounded-full">
                  +${(participant.amount_paid - participant.buy_in_amount).toFixed(2)}
                </span>
              )}
              {participant.payment_method && (
                <span className="text-blue-400 text-xs bg-blue-900/30 px-1.5 py-0.5 rounded-full">
                  {participant.payment_method}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={participant.checked_in}
                  onChange={() => {
                    void toggleCheckedIn(participant.id)
                  }}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-green-500 focus:ring-green-500 focus:ring-offset-0"
                />
                <span>Checked in</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={() => {
                    void togglePaid(participant.id)
                  }}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                />
                <span>Paid</span>
              </label>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Options"
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 rounded-xl shadow-2xl border border-slate-600 z-50 min-w-[150px]">
                <button onClick={() => { setEditing(true); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-white hover:bg-slate-600 rounded-t-xl flex items-center gap-2.5"><Pencil size={14} />Edit</button>
                <button onClick={() => { setShowDeleteConfirm(true); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-600 rounded-b-xl flex items-center gap-2.5"><Trash2 size={14} />Remove</button>
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
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Remove Participant"
        message={`Are you sure you want to remove ${participant.display_name}? This action cannot be undone.`}
        confirmText="Remove"
        confirmVariant="danger"
      />
    </>
  )
}
