import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncStatusSummary } from '../lib/sync/status'
import {
  SYNC_STATUS_SUCCESS_HIDE_DELAY_MS,
  shouldHideSyncStatus,
  useSyncStatusStore,
} from '../store/syncStatusStore'

const readySummary: SyncStatusSummary = {
  mode: 'ready',
  title: 'Sync ready',
  detail: 'Events and participants can sync across devices.',
  pendingCount: 0,
  failedCount: 0,
  lastSuccessfulSyncAt: null,
}

const refreshedSummary: SyncStatusSummary = {
  mode: 'refreshed',
  title: 'Latest available changes refreshed',
  detail: 'Events and participants were refreshed.',
  pendingCount: 0,
  failedCount: 0,
  lastSuccessfulSyncAt: new Date().toISOString(),
}

describe('syncStatusStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useSyncStatusStore.setState({ summary: null, externalRefreshVersion: 0 })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    useSyncStatusStore.setState({ summary: null, externalRefreshVersion: 0 })
  })

  it('identifies clean ready and refreshed summaries as hideable', () => {
    expect(shouldHideSyncStatus(readySummary)).toBe(true)
    expect(shouldHideSyncStatus(refreshedSummary)).toBe(true)
    expect(shouldHideSyncStatus({
      ...readySummary,
      pendingCount: 1,
    })).toBe(false)
  })

  it('hides ready summaries immediately when nothing needs attention', () => {
    useSyncStatusStore.getState().setSummary(readySummary)

    expect(useSyncStatusStore.getState().summary).toBeNull()
  })

  it('shows refreshed summaries briefly, then hides them after five seconds', () => {
    useSyncStatusStore.getState().notifyExternalRefresh(refreshedSummary)

    expect(useSyncStatusStore.getState().summary).toEqual(refreshedSummary)
    expect(useSyncStatusStore.getState().externalRefreshVersion).toBe(1)

    vi.advanceTimersByTime(SYNC_STATUS_SUCCESS_HIDE_DELAY_MS - 1)
    expect(useSyncStatusStore.getState().summary).toEqual(refreshedSummary)

    vi.advanceTimersByTime(1)
    expect(useSyncStatusStore.getState().summary).toBeNull()
  })

  it('keeps actionable summaries visible', () => {
    const actionableSummary: SyncStatusSummary = {
      ...refreshedSummary,
      pendingCount: 2,
      detail: '2 changes are waiting to sync.',
    }

    useSyncStatusStore.getState().setSummary(actionableSummary)
    vi.advanceTimersByTime(SYNC_STATUS_SUCCESS_HIDE_DELAY_MS)

    expect(useSyncStatusStore.getState().summary).toEqual(actionableSummary)
  })
})