import { create } from 'zustand'
import type { SyncStatusSummary } from '../lib/sync/status'

interface SyncStatusStore {
  summary: SyncStatusSummary | null
  externalRefreshVersion: number
  setSummary: (summary: SyncStatusSummary | null) => void
  notifyExternalRefresh: (summary: SyncStatusSummary) => void
}

export const useSyncStatusStore = create<SyncStatusStore>((set) => ({
  summary: null,
  externalRefreshVersion: 0,
  setSummary: (summary) => set({ summary }),
  notifyExternalRefresh: (summary) => set((state) => ({
    summary,
    externalRefreshVersion: state.externalRefreshVersion + 1,
  })),
}))