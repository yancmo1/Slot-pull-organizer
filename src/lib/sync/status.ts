import { isSignedIn } from './auth'
import { flushSyncQueue, getSyncQueueStats, pullChanges, type SyncQueueStats } from './index'
import { isPocketBaseConfigured } from './pocketbase'

const LAST_SUCCESSFUL_SYNC_KEY = 'sync_last_success_at'

export type SyncStatusMode =
  | 'local-only'
  | 'signed-out'
  | 'offline'
  | 'ready'
  | 'refreshed'
  | 'partial-failure'

export interface SyncStatusSummary {
  mode: SyncStatusMode
  title: string
  detail: string
  pendingCount: number
  failedCount: number
  lastSuccessfulSyncAt: string | null
}

interface SyncStatusOverrides {
  mode?: SyncStatusMode
  pendingCount?: number
  failedCount?: number
  lastSuccessfulSyncAt?: string | null
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function getLastSuccessfulSyncAt(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LAST_SUCCESSFUL_SYNC_KEY)
}

function setLastSuccessfulSyncAt(value: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_SUCCESSFUL_SYNC_KEY, value)
}

function resolveDefaultMode(stats: SyncQueueStats): SyncStatusMode {
  if (!isPocketBaseConfigured()) return 'local-only'
  if (!isSignedIn()) return 'signed-out'
  if (!isOnline()) return 'offline'
  if (stats.failedCount > 0) return 'partial-failure'
  return 'ready'
}

function buildSummary(
  mode: SyncStatusMode,
  stats: SyncQueueStats,
  lastSuccessfulSyncAt: string | null,
): SyncStatusSummary {
  if (mode === 'local-only') {
    return {
      mode,
      title: 'Local-only mode',
      detail: stats.pendingCount > 0
        ? 'Your changes stay on this device. Use backups to move data between devices.'
        : 'Your events stay on this device. Use backups if you need to move them elsewhere.',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt,
    }
  }

  if (mode === 'signed-out') {
    return {
      mode,
      title: 'Sync available',
      detail: stats.pendingCount > 0
        ? `Sign in from Settings to sync your queued changes, events, and participants across devices.`
        : 'Sign in from Settings to sync events and participants across devices.',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt,
    }
  }

  if (mode === 'offline') {
    return {
      mode,
      title: 'Offline',
      detail: stats.pendingCount > 0
        ? `${stats.pendingCount} change${stats.pendingCount === 1 ? '' : 's'} will sync when you reconnect.`
        : 'Showing the latest local data available on this device.',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt,
    }
  }

  if (mode === 'partial-failure') {
    return {
      mode,
      title: 'Sync needs attention',
      detail: stats.failedCount > 0
        ? `${stats.failedCount} change${stats.failedCount === 1 ? '' : 's'} still need${stats.failedCount === 1 ? 's' : ''} sync. Latest available events and participants were refreshed.`
        : 'A sync step hit a snag. Showing the latest local data available on this device.',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt,
    }
  }

  if (mode === 'refreshed') {
    return {
      mode,
      title: 'Latest available changes refreshed',
      detail: stats.pendingCount > 0
        ? `${stats.pendingCount} new local change${stats.pendingCount === 1 ? '' : 's'} are queued for the next sync.`
        : 'Events and participants were refreshed. Day-of rounds still stay on this device.',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt,
    }
  }

  return {
    mode,
    title: stats.pendingCount > 0 ? 'Changes queued' : 'Sync ready',
    detail: stats.pendingCount > 0
      ? `${stats.pendingCount} local change${stats.pendingCount === 1 ? '' : 's'} are waiting for the next sync.`
      : 'Events and participants can sync across devices. Day-of rounds still stay on this device.',
    pendingCount: stats.pendingCount,
    failedCount: stats.failedCount,
    lastSuccessfulSyncAt,
  }
}

export async function getSyncStatusSummary(
  overrides: SyncStatusOverrides = {},
): Promise<SyncStatusSummary> {
  const hasOverrideCounts = overrides.pendingCount !== undefined && overrides.failedCount !== undefined
  const stats = hasOverrideCounts
    ? {
        pendingCount: overrides.pendingCount ?? 0,
        failedCount: overrides.failedCount ?? 0,
      }
    : await getSyncQueueStats()
  const lastSuccessfulSyncAt = overrides.lastSuccessfulSyncAt ?? getLastSuccessfulSyncAt()
  const mode = overrides.mode ?? resolveDefaultMode(stats)

  return buildSummary(mode, stats, lastSuccessfulSyncAt)
}

export async function runSyncAction(
  refreshLocalData: () => Promise<void>,
): Promise<SyncStatusSummary> {
  if (!isPocketBaseConfigured()) {
    await refreshLocalData()
    return getSyncStatusSummary({ mode: 'local-only' })
  }

  if (!isSignedIn()) {
    await refreshLocalData()
    return getSyncStatusSummary({ mode: 'signed-out' })
  }

  if (!isOnline()) {
    await refreshLocalData()
    return getSyncStatusSummary({ mode: 'offline' })
  }

  const flushResult = await flushSyncQueue()
  const pullResult = await pullChanges()
  await refreshLocalData()

  const stats = await getSyncQueueStats()

  if (flushResult.status === 'completed' && flushResult.failedCount === 0 && pullResult.status === 'completed' && stats.failedCount === 0) {
    const now = new Date().toISOString()
    setLastSuccessfulSyncAt(now)
    return getSyncStatusSummary({
      mode: 'refreshed',
      pendingCount: stats.pendingCount,
      failedCount: stats.failedCount,
      lastSuccessfulSyncAt: now,
    })
  }

  return getSyncStatusSummary({
    mode: 'partial-failure',
    pendingCount: stats.pendingCount,
    failedCount: stats.failedCount,
  })
}