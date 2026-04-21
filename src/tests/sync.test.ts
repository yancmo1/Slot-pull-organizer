import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  isPocketBaseConfiguredMock,
  isSignedInMock,
  flushSyncQueueMock,
  getSyncQueueStatsMock,
  localStorageMock,
  pullChangesMock,
} = vi.hoisted(() => ({
  isPocketBaseConfiguredMock: vi.fn(),
  isSignedInMock: vi.fn(),
  flushSyncQueueMock: vi.fn(),
  getSyncQueueStatsMock: vi.fn(),
  localStorageMock: (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })(),
  pullChangesMock: vi.fn(),
}))

vi.mock('../lib/sync/pocketbase', () => ({
  isPocketBaseConfigured: isPocketBaseConfiguredMock,
}))

vi.mock('../lib/sync/auth', () => ({
  isSignedIn: isSignedInMock,
}))

vi.mock('../lib/sync/index', () => ({
  flushSyncQueue: flushSyncQueueMock,
  getSyncQueueStats: getSyncQueueStatsMock,
  pullChanges: pullChangesMock,
}))

import { getSyncStatusSummary, runSyncAction } from '../lib/sync/status'

describe('sync status helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    isPocketBaseConfiguredMock.mockReturnValue(true)
    isSignedInMock.mockReturnValue(true)
    getSyncQueueStatsMock.mockResolvedValue({ pendingCount: 0, failedCount: 0 })
    flushSyncQueueMock.mockResolvedValue({
      status: 'completed',
      attemptedCount: 0,
      syncedCount: 0,
      failedCount: 0,
    })
    pullChangesMock.mockResolvedValue({ status: 'completed', recordCount: 3 })
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('shows signed-out guidance when sync is configured but no account is active', async () => {
    isSignedInMock.mockReturnValue(false)

    const summary = await getSyncStatusSummary()

    expect(summary.mode).toBe('signed-out')
    expect(summary.title).toBe('Sync available')
    expect(summary.detail).toContain('Sign in from Settings')
  })

  it('stores last successful sync time after a successful remote refresh', async () => {
    const refreshLocalData = vi.fn().mockResolvedValue(undefined)

    const summary = await runSyncAction(refreshLocalData)

    expect(summary.mode).toBe('refreshed')
    expect(refreshLocalData).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('sync_last_success_at')).toBeTruthy()
  })

  it('returns offline status and skips remote calls when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    const refreshLocalData = vi.fn().mockResolvedValue(undefined)

    const summary = await runSyncAction(refreshLocalData)

    expect(summary.mode).toBe('offline')
    expect(refreshLocalData).toHaveBeenCalledTimes(1)
    expect(flushSyncQueueMock).not.toHaveBeenCalled()
    expect(pullChangesMock).not.toHaveBeenCalled()
  })

  it('reports partial failure when queue items still fail to sync', async () => {
    flushSyncQueueMock.mockResolvedValue({
      status: 'completed',
      attemptedCount: 2,
      syncedCount: 1,
      failedCount: 1,
    })
    getSyncQueueStatsMock.mockResolvedValue({ pendingCount: 0, failedCount: 1 })

    const summary = await runSyncAction(vi.fn().mockResolvedValue(undefined))

    expect(summary.mode).toBe('partial-failure')
    expect(summary.failedCount).toBe(1)
  })
})