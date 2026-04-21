import { create } from 'zustand'
import type { SyncStatusSummary } from '../lib/sync/status'

export const SYNC_STATUS_SUCCESS_HIDE_DELAY_MS = 5000

export function shouldHideSyncStatus(summary: SyncStatusSummary): boolean {
  return summary.pendingCount === 0
    && summary.failedCount === 0
    && (summary.mode === 'ready' || summary.mode === 'refreshed')
}

function shouldDelaySyncStatusHide(summary: SyncStatusSummary): boolean {
  return shouldHideSyncStatus(summary) && summary.mode === 'refreshed'
}

interface SyncStatusStore {
  summary: SyncStatusSummary | null
  externalRefreshVersion: number
  setSummary: (summary: SyncStatusSummary | null) => void
  notifyExternalRefresh: (summary: SyncStatusSummary) => void
}

let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearHideTimer() {
  if (hideTimer !== null) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  summary: null,
  externalRefreshVersion: 0,
  setSummary: (summary) => {
    clearHideTimer()

    if (!summary || !shouldHideSyncStatus(summary)) {
      set({ summary })
      return
    }

    if (!shouldDelaySyncStatusHide(summary)) {
      set({ summary: null })
      return
    }

    set({ summary })
    hideTimer = setTimeout(() => {
      set((state) => (state.summary === summary ? { summary: null } : state))
      hideTimer = null
    }, SYNC_STATUS_SUCCESS_HIDE_DELAY_MS)
  },
  notifyExternalRefresh: (summary) => {
    clearHideTimer()

    if (!shouldHideSyncStatus(summary)) {
      set((state) => ({
        summary,
        externalRefreshVersion: state.externalRefreshVersion + 1,
      }))
      return
    }

    if (!shouldDelaySyncStatusHide(summary)) {
      set((state) => ({
        summary: null,
        externalRefreshVersion: state.externalRefreshVersion + 1,
      }))
      return
    }

    set((state) => ({
      summary,
      externalRefreshVersion: state.externalRefreshVersion + 1,
    }))

    hideTimer = setTimeout(() => {
      set((state) => (state.summary === summary ? { summary: null } : state))
      hideTimer = null
    }, SYNC_STATUS_SUCCESS_HIDE_DELAY_MS)
  },
}))