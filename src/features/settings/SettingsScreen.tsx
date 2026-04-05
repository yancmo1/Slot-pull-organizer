import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Settings, Upload, Download, Lock, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '../../components/Button'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useEventStore } from '../../store/eventStore'
import { exportAllToJSON, importFromJSON } from '../../lib/utils/export'
import { db } from '../../lib/db'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { loadEvents } = useEventStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const handleExportJSON = async () => {
    await exportAllToJSON()
    setMessage({ type: 'success', text: 'Backup exported successfully!' })
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage(null)
    try {
      const data = await importFromJSON(file)
      if (confirm(`Import ${data.events.length} events and ${data.participants.length} participants? Your current data will be downloaded as a safety backup first.`)) {
        await exportAllToJSON()
        await db.transaction('rw', [db.events, db.participants, db.spinRoundEntries, db.eventSessions], async () => {
          await db.events.bulkPut(data.events)
          await db.participants.bulkPut(data.participants)
          await db.spinRoundEntries.bulkPut(data.spinRoundEntries)
          await db.eventSessions.bulkPut(data.eventSessions)
        })
        await loadEvents()
        setMessage({ type: 'success', text: `Imported ${data.events.length} events and ${data.participants.length} participants.` })
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Import failed' })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleClearAllData = async () => {
    await db.events.clear()
    await db.participants.clear()
    await db.syncQueue.clear()
    await db.spinRoundEntries.clear()
    await db.eventSessions.clear()
    window.location.replace('/')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} aria-label="Go back" className="text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"><ChevronLeft size={20} /></button>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings size={20} />Settings</h1>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h2 className="text-white font-semibold mb-1">Backup & Restore</h2>
            <p className="text-slate-400 text-sm mb-4">Export all your data as a JSON backup file, or import a previous backup.</p>
            <div className="flex flex-col gap-3">
              <Button variant="secondary" className="w-full gap-2" onClick={handleExportJSON}>
                <Upload size={15} />Export JSON Backup
              </Button>
              <Button variant="secondary" className="w-full gap-2" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? 'Importing…' : <><Download size={15} />Import JSON Backup</>}
              </Button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" aria-label="Import JSON backup file" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><Lock size={15} />Privacy Notice</h2>
            <p className="text-slate-400 text-sm">All data is stored locally on this device. JSON backups are not encrypted and contain participant names and payment details. Do not share backup files with untrusted parties.</p>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border border-red-900/40">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2"><AlertTriangle size={15} />Danger Zone</h2>
            <p className="text-slate-400 text-sm mb-4">Permanently erase all events, participants, and session data from this device. This cannot be undone.</p>
            <Button variant="secondary" className="w-full gap-2 text-red-400 border-red-800" onClick={() => setClearConfirmOpen(true)}>
              <Trash2 size={15} />Clear All Local Data
            </Button>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h2 className="text-white font-semibold mb-1">About</h2>
            <p className="text-slate-400 text-sm">Cruise Slot Pull Organizer — offline-first PWA. All data is stored locally on your device.</p>
            <p className="text-slate-500 text-xs mt-2">v1.0.0</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleClearAllData}
        title="Clear All Local Data"
        message="This will permanently delete all events, participants, and session data from this device. This cannot be undone."
        confirmText="Clear All Data"
        confirmVariant="danger"
      />
    </div>
  )
}
