import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, Search, RefreshCw, ArrowDown } from 'lucide-react'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { SyncStatusCard } from '../../components/SyncStatusCard'
import { EventForm } from './EventForm'
import { EventCard } from './EventCard'
import { useEventStore } from '../../store/eventStore'
import { useSyncStatusStore } from '../../store/syncStatusStore'
import { usePullToRefresh } from '../../lib/hooks/usePullToRefresh'
import { haptic } from '../../lib/utils/haptic'
import { getSyncStatusSummary, runSyncAction } from '../../lib/sync/status'
import { isSignedIn } from '../../lib/sync/auth'
import { isPocketBaseConfigured } from '../../lib/sync/pocketbase'

export function EventListScreen() {
  const navigate = useNavigate()
  const { events, loadEvents } = useEventStore()
  const [creating, setCreating] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)
  const syncStatus = useSyncStatusStore((state) => state.summary)
  const externalRefreshVersion = useSyncStatusStore((state) => state.externalRefreshVersion)
  const setSyncStatus = useSyncStatusStore((state) => state.setSummary)

  const refreshEvents = useCallback(async () => {
    await loadEvents()
    setStatsRefreshKey((current) => current + 1)
  }, [loadEvents])

  const loadSyncStatus = useCallback(async () => {
    setSyncStatus(await getSyncStatusSummary())
  }, [setSyncStatus])

  const handleSync = async () => {
    haptic.medium()
    setSyncing(true)
    try {
      const summary = await runSyncAction(refreshEvents)
      setSyncStatus(summary)
      if (summary.mode === 'partial-failure') {
        haptic.warning()
      } else {
        haptic.success()
      }
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      await refreshEvents()
      await loadSyncStatus()
    }

    void bootstrap()
  }, [loadSyncStatus, refreshEvents])

  const canRemoteSync = useMemo(
    () => isPocketBaseConfigured() && isSignedIn() && navigator.onLine,
    [syncStatus],
  )

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      haptic.medium()
      const summary = await runSyncAction(refreshEvents)
      setSyncStatus(summary)
      if (summary.mode === 'partial-failure') {
        haptic.warning()
      } else {
        haptic.success()
      }
    },
  })

  const active = events.filter((e) => !e.archived)
  const archived = events.filter((e) => e.archived)
  const baseDisplayed = showArchived ? archived : active
  const hasAnyEvents = events.length > 0
  const pullIndicatorOffsetClass = useMemo(() => {
    if (pullDistance >= 60) return 'translate-y-[60px]'
    if (pullDistance >= 48) return 'translate-y-12'
    if (pullDistance >= 32) return 'translate-y-8'
    if (pullDistance >= 16) return 'translate-y-4'
    return 'translate-y-0'
  }, [pullDistance])

  // Filter by search query
  const displayed = searchQuery
    ? baseDisplayed.filter((e) => {
        const query = searchQuery.toLowerCase()
        return (
          e.title.toLowerCase().includes(query) ||
          e.trip_label?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query)
        )
      })
    : baseDisplayed

  return (
    <div className="min-h-screen bg-slate-900 text-white page-transition">
      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${pullIndicatorOffsetClass}`}
        >
          <div className="glass px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            {isRefreshing
              ? <><RefreshCw size={14} className="animate-spin" /><span className="text-sm">{canRemoteSync ? 'Syncing...' : 'Refreshing...'}</span></>
              : <><ArrowDown size={14} /><span className="text-sm">{canRemoteSync ? 'Pull to sync' : 'Pull to refresh'}</span></>
            }
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">🎰 Slot Pull</h1>
            <p className="text-slate-400 text-sm">Organizer</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sync"
              disabled={syncing}
              onClick={handleSync}
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}><Settings size={18} /></Button>
            <Button
              size="md"
              onClick={() => {
                haptic.light()
                setCreating(true)
              }}
              className="fab-shadow"
            >
              + New Event
            </Button>
          </div>
        </div>

        {syncStatus && (
          <div className="mb-4">
            <SyncStatusCard summary={syncStatus} compact />
          </div>
        )}

        {hasAnyEvents && (
          <>
            <div className="flex items-center justify-between gap-2 mb-4 overflow-x-auto hide-scrollbar pb-1">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    haptic.light()
                    setShowArchived(false)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${!showArchived ? 'gradient-blue text-white shadow-lg' : 'glass-light text-slate-300'}`}
                >
                  Upcoming ({active.length})
                </button>
                <button
                  onClick={() => {
                    haptic.light()
                    setShowArchived(true)
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${showArchived ? 'gradient-blue text-white shadow-lg' : 'glass-light text-slate-300'}`}
                >
                  Archived ({archived.length})
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        {displayed.length === 0 ? (
          <div className="text-center py-16 text-slate-500 page-transition">
            {!hasAnyEvents ? (
              <>
                <div className="text-6xl mb-4 scale-in">🎰</div>
                <p className="text-lg text-slate-200">No events yet</p>
                <p className="text-sm text-slate-400 mt-2">Create an event first, then add your roster when you’re ready.</p>
                <div className="flex flex-col gap-3 mt-5 max-w-xs mx-auto">
                  <Button
                    onClick={() => {
                      haptic.light()
                      setCreating(true)
                    }}
                  >
                    Create Your First Event
                  </Button>
                  <Button variant="secondary" onClick={() => navigate('/settings')}>
                    Sync or restore data
                  </Button>
                </div>
              </>
            ) : searchQuery ? (
              <>
                <p className="text-lg text-slate-200">No events match “{searchQuery}”</p>
                <p className="text-sm text-slate-400 mt-2">Try a different search or clear it to see everything again.</p>
                <Button variant="ghost" className="mt-4" onClick={() => setSearchQuery('')}>
                  Clear search
                </Button>
              </>
            ) : showArchived ? (
              <>
                <p className="text-lg text-slate-200">No archived events</p>
                <p className="text-sm text-slate-400 mt-2">Archived events will show up here when you tuck them away.</p>
              </>
            ) : (
              <>
                <p className="text-lg text-slate-200">No upcoming events</p>
                <p className="text-sm text-slate-400 mt-2">Switch to archived or create a new event to get back in business.</p>
                <div className="flex flex-col gap-3 mt-5 max-w-xs mx-auto">
                  <Button
                    onClick={() => {
                      haptic.light()
                      setCreating(true)
                    }}
                  >
                    Create New Event
                  </Button>
                  {archived.length > 0 && (
                    <Button variant="secondary" onClick={() => setShowArchived(true)}>
                      View Archived Events
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayed.map((event) => (
              <EventCard key={event.id} event={event} statsRefreshKey={statsRefreshKey + externalRefreshVersion} />
            ))}
          </div>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create Event">
        <EventForm onSave={() => setCreating(false)} onCancel={() => setCreating(false)} />
      </Modal>
    </div>
  )
}
