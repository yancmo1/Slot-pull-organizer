import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmVariant?: 'primary' | 'danger'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-slate-300">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant === 'danger' ? 'secondary' : 'primary'}
            onClick={handleConfirm}
            className={confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
