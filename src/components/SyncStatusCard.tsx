import { AlertTriangle, Cloud, CloudOff, HardDrive, RefreshCw } from 'lucide-react'
import type { SyncStatusSummary } from '../lib/sync/status'

interface SyncStatusCardProps {
  summary: SyncStatusSummary
  compact?: boolean
}

function formatRelativeSyncTime(iso: string | null): string | null {
  if (!iso) return null

  const timestamp = new Date(iso).getTime()
  if (Number.isNaN(timestamp)) return null

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)))

  if (diffMinutes < 1) return 'Last refreshed just now'
  if (diffMinutes < 60) return `Last refreshed ${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Last refreshed ${diffHours}h ago`

  return `Last refreshed ${new Date(iso).toLocaleDateString()}`
}

export function SyncStatusCard({ summary, compact = false }: SyncStatusCardProps) {
  const tones = {
    'local-only': {
      border: 'border-slate-700',
      bg: 'bg-slate-800/80',
      iconWrap: 'bg-slate-700/60 text-slate-200',
      text: 'text-slate-300',
      Icon: HardDrive,
    },
    'signed-out': {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      iconWrap: 'bg-blue-500/20 text-blue-300',
      text: 'text-blue-100',
      Icon: CloudOff,
    },
    offline: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      iconWrap: 'bg-amber-500/20 text-amber-300',
      text: 'text-amber-100',
      Icon: CloudOff,
    },
    ready: {
      border: 'border-slate-700',
      bg: 'bg-slate-800/80',
      iconWrap: 'bg-slate-700/60 text-slate-200',
      text: 'text-slate-300',
      Icon: Cloud,
    },
    refreshed: {
      border: 'border-green-500/30',
      bg: 'bg-green-500/10',
      iconWrap: 'bg-green-500/20 text-green-300',
      text: 'text-green-100',
      Icon: RefreshCw,
    },
    'partial-failure': {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      iconWrap: 'bg-amber-500/20 text-amber-300',
      text: 'text-amber-100',
      Icon: AlertTriangle,
    },
  } as const

  const tone = tones[summary.mode]
  const Icon = tone.Icon
  const lastRefreshedLabel = formatRelativeSyncTime(summary.lastSuccessfulSyncAt)
  const sizeClasses = compact ? 'rounded-xl p-3' : 'rounded-2xl p-4'

  return (
    <div className={`${tone.bg} ${tone.border} ${sizeClasses} border`}>
      <div className="flex items-start gap-3">
        <div className={`${tone.iconWrap} rounded-xl p-2 shrink-0`}>
          <Icon size={compact ? 14 : 16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-white font-medium text-sm">{summary.title}</p>
            {summary.failedCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                {summary.failedCount} issue{summary.failedCount === 1 ? '' : 's'}
              </span>
            )}
            {summary.failedCount === 0 && summary.pendingCount > 0 && (
              <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                {summary.pendingCount} queued
              </span>
            )}
          </div>

          <p className={`mt-1 text-xs ${tone.text}`}>{summary.detail}</p>

          {lastRefreshedLabel && (
            <p className="mt-2 text-[11px] text-slate-400">{lastRefreshedLabel}</p>
          )}
        </div>
      </div>
    </div>
  )
}