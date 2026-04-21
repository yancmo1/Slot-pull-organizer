import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, FlaskConical, Play } from 'lucide-react'
import { Button } from '../../components/Button'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import type { SyncStatusSummary } from '../../lib/sync/status'
import type { Participant } from '../../types'
import { capitalizeWords } from '../../lib/utils/formatName'
import { getDayOfPriorityLabel } from '../../lib/utils/dayOfPriority'
import { DayOfParticipantCard } from '../dayof/DayOfParticipantCard'

const syncFixtures: Record<string, SyncStatusSummary> = {
  ready: {
    mode: 'ready',
    title: 'Sync ready',
    detail: 'Events and participants can sync across devices. Day-of rounds still stay on this device.',
    pendingCount: 0,
    failedCount: 0,
    lastSuccessfulSyncAt: null,
  },
  refreshed: {
    mode: 'refreshed',
    title: 'Latest available changes refreshed',
    detail: 'Events and participants were refreshed. Day-of rounds still stay on this device.',
    pendingCount: 0,
    failedCount: 0,
    lastSuccessfulSyncAt: new Date().toISOString(),
  },
  partial: {
    mode: 'partial-failure',
    title: 'Sync needs attention',
    detail: '1 change still needs sync. Latest available events and participants were refreshed.',
    pendingCount: 0,
    failedCount: 1,
    lastSuccessfulSyncAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  offline: {
    mode: 'offline',
    title: 'Offline',
    detail: '2 changes will sync when you reconnect.',
    pendingCount: 2,
    failedCount: 0,
    lastSuccessfulSyncAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
  return {
    id: crypto.randomUUID(),
    event_id: 'sandbox-event',
    display_name: 'Test Guest',
    alias_or_real_name: null,
    buy_in_amount: 20,
    amount_paid: 0,
    payment_status: 'unpaid',
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

export function DevSandboxScreen() {
  const navigate = useNavigate()
  const [selectedSyncFixture, setSelectedSyncFixture] = useState<keyof typeof syncFixtures>('ready')
  const [quickName, setQuickName] = useState('')
  const [quickNames, setQuickNames] = useState(['Alice', 'Ben', 'Carla'])
  const [playModePreview, setPlayModePreview] = useState(false)
  const previewSpunIds = new Set<string>()

  const previewParticipants = useMemo(() => ([
    makeParticipant({
      id: 'unchecked',
      display_name: 'Late Arrival',
      checked_in: false,
      payment_status: 'unpaid',
      amount_paid: 0,
    }),
    makeParticipant({
      id: 'unpaid',
      display_name: 'Needs Payment',
      checked_in: true,
      payment_status: 'partial',
      amount_paid: 10,
    }),
    makeParticipant({
      id: 'ready',
      display_name: 'Ready To Spin',
      checked_in: true,
      payment_status: 'paid',
      amount_paid: 20,
    }),
  ]), [])

  const handleQuickAddPreview = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickName.trim()) return
    setQuickNames((current) => [...current, capitalizeWords(quickName.trim())])
    setQuickName('')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} aria-label="Go back" className="text-slate-400 hover:text-white p-2 -ml-2 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center min-w-[44px] min-h-[44px]"><ChevronLeft size={20} /></button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical size={20} />Dev Sandbox</h1>
            <p className="text-slate-400 text-sm">Fixture-driven previews only — no real IndexedDB or sync writes.</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4">
          <div>
            <h2 className="text-white font-semibold mb-1">Sync status preview</h2>
            <p className="text-slate-400 text-sm">Hot reload this screen while tuning copy or card styles.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(syncFixtures).map((fixture) => (
              <Button
                key={fixture}
                size="sm"
                variant={selectedSyncFixture === fixture ? 'primary' : 'secondary'}
                onClick={() => setSelectedSyncFixture(fixture as keyof typeof syncFixtures)}
              >
                {fixture}
              </Button>
            ))}
          </div>
          <SyncStatusCard summary={syncFixtures[selectedSyncFixture]} />
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4">
          <div>
            <h2 className="text-white font-semibold mb-1">Quick Add preview</h2>
            <p className="text-slate-400 text-sm">Try the name-only flow without touching your real event data.</p>
          </div>
          <form onSubmit={handleQuickAddPreview} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(capitalizeWords(e.target.value))}
              placeholder="Type a name and keep going"
              className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
            />
            <Button type="submit" className="sm:min-w-[132px]">Add Name</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {quickNames.map((name) => (
              <span key={name} className="rounded-full bg-slate-700 px-3 py-1 text-sm text-slate-200">{name}</span>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold mb-1">Day-of card preview</h2>
              <p className="text-slate-400 text-sm">Preview the new priority cues and play-mode state without seeding local data.</p>
            </div>
            <Button
              size="sm"
              variant={playModePreview ? 'primary' : 'secondary'}
              onClick={() => setPlayModePreview((current) => !current)}
              className="gap-1.5"
            >
              <Play size={14} />{playModePreview ? 'Play Mode On' : 'Play Mode Off'}
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {previewParticipants.map((participant) => (
              <DayOfParticipantCard
                key={participant.id}
                participant={participant}
                onCheckin={() => {}}
                onPaid={() => {}}
                playMode={playModePreview}
                hasSpun={previewSpunIds.has(participant.id)}
                priorityLabel={getDayOfPriorityLabel(participant, {
                  playMode: playModePreview,
                  spunIds: previewSpunIds,
                })}
                onToggleSpin={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <h2 className="text-white font-semibold mb-1">Developer note</h2>
          <p className="text-slate-400 text-sm">
            This route is only available in development. Edit this screen while `npm run dev` is running and Vite will hot reload it instantly.
          </p>
        </div>
      </div>
    </div>
  )
}