import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/Button'
import { useEventStore } from '../../store/eventStore'
import { useParticipantStore } from '../../store/participantStore'
import { exportAllToJSON, importFromJSON } from '../../lib/utils/export'
import { db } from '../../lib/db'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const { participants } = useParticipantStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExportJSON = () => {
    exportAllToJSON(events, participants)
    setMessage({ type: 'success', text: 'Backup exported successfully!' })
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setMessage(null)
    try {
      const data = await importFromJSON(file)
      if (confirm(`Import ${data.events.length} events and ${data.participants.length} participants? This will merge with existing data.`)) {
        await db.events.bulkPut(data.events)
        await db.participants.bulkPut(data.participants)
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-2 -ml-2">←</button>
          <h1 className="text-2xl font-bold">⚙️ Settings</h1>
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
              <Button variant="secondary" className="w-full" onClick={handleExportJSON}>
                📤 Export JSON Backup
              </Button>
              <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? 'Importing…' : '📥 Import JSON Backup'}
              </Button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h2 className="text-white font-semibold mb-1">About</h2>
            <p className="text-slate-400 text-sm">Cruise Slot Pull Organizer — offline-first PWA. All data is stored locally on your device.</p>
            <p className="text-slate-500 text-xs mt-2">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
