'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, installMap, isBspInstalled } from '@/lib/maps/install'
import { ensurePermission, markInstalled, isInstalledLocally } from '@/lib/maps/folder-store'
import type { InstallStatus } from '@/lib/maps/install'
import {
  BTN_REINSTALL, BTN_CANCEL, BTN_INSTALLING, BTN_INSTALLED, BTN_INSTALL, BTN_DOWNLOAD,
  PHASE_DOWNLOADING, PHASE_VERIFYING, PHASE_EXTRACTING, PHASE_WRITING,
} from '@/lib/constants/messages'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getTypeBadge(tags: string[]): { label: string; color: string } | null {
  if (tags.includes('de_')) return { label: 'BOMB/DEFUSE', color: 'var(--accent-orange)' }
  if (tags.includes('cs_')) return { label: 'HOSTAGE RESCUE', color: 'var(--accent-red)' }
  return null
}

export function MapCard({
  map,
  gameFolder,
  onPickFolder,
  installedBsps,
  onInstalled,
  onOpenDetail,
  selected = false,
  onToggleSelect,
  autoInstall = false,
  onBatchTriggered,
  installStatus,
  onInstallStatusChange,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
  onOpenDetail: (map: MapEntry) => void
  selected?: boolean
  onToggleSelect?: () => void
  autoInstall?: boolean
  onBatchTriggered?: () => void
  installStatus?: InstallStatus | null
  onInstallStatusChange?: (id: string, status: InstallStatus | null) => void
}) {
  const [installed, setInstalled] = useState(() => isInstalledLocally(map.id))
  const [installCount, setInstallCount] = useState(map.installCount)
  const [confirmReinstall, setConfirmReinstall] = useState(false)
  const supportsFileApi = isFileSystemAccessSupported()
  const isInstalling = installStatus != null && installStatus.phase !== 'done' && installStatus.phase !== 'error'

  const downloadProgress = installStatus?.phase === 'downloading' ? installStatus.progress : null

  useEffect(() => {
    setInstalled(isBspInstalled(map.originalName, installedBsps) || isInstalledLocally(map.id))
  }, [installedBsps, map.originalName, map.id])

  useEffect(() => {
    if (!autoInstall) return
    void doInstall()
    onBatchTriggered?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInstall])

  async function doInstall() {
    onInstallStatusChange?.(map.id, { phase: 'downloading', progress: 0 })
    try {
      let handle = gameFolder
      if (!handle) { await onPickFolder(); return }
      const permitted = await ensurePermission(handle)
      if (!permitted) {
        onInstallStatusChange?.(map.id, { phase: 'error', message: 'Folder access denied.' })
        return
      }
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()
      await installMap(map, url, sha256, handle, (s: InstallStatus) => onInstallStatusChange?.(map.id, s))
      markInstalled(map.id)
      fetch(`/api/maps/${map.id}/install`, { method: 'POST' }).catch(() => {})
      setInstalled(true)
      setInstallCount(c => c + 1)
      onInstalled()
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Unknown error'
      onInstallStatusChange?.(map.id, { phase: 'error', message: msg })
    }
  }

  async function handleRawDownload() {
    try {
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url } = await res.json()
      const fileRes = await fetch(url)
      if (!fileRes.ok) throw new Error('Download failed')
      const blob = await fileRes.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `${map.originalName}.${map.format}`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      onInstallStatusChange?.(map.id, { phase: 'error', message: (err as Error).message ?? 'Download failed.' })
    }
  }

  const badge = getTypeBadge(map.tags)
  const screenshotUrl = map.screenshotKeys?.[0] ?? null

  const cardBorder = installed
    ? 'border-[var(--border-installed)]'
    : isInstalling
      ? 'border-[var(--accent-orange)]'
      : 'border-[var(--border)] hover:border-[var(--accent-cyan)]'

  const phaseLabel = installStatus
    ? installStatus.phase === 'downloading' ? PHASE_DOWNLOADING(Math.round(installStatus.progress))
    : installStatus.phase === 'verifying' ? PHASE_VERIFYING
    : installStatus.phase === 'extracting' ? PHASE_EXTRACTING
    : installStatus.phase === 'writing' ? PHASE_WRITING(installStatus.done, installStatus.total)
    : null
    : null

  return (
    <div className={`bg-[var(--bg-surface)] border rounded-lg overflow-hidden transition-colors ${cardBorder}`}>

      {/* Thumbnail zone */}
      <div
        data-testid="card-thumbnail"
        className="relative h-28 cursor-pointer"
        style={{ background: screenshotUrl ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)' }}
        onClick={() => onOpenDetail(map)}
      >
        {screenshotUrl && (
          <img src={screenshotUrl} alt={map.originalName} className="w-full h-full object-cover" />
        )}
        {badge && (
          <span
            className="absolute top-1.5 left-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded-sm text-black inline-block text-center min-w-[7rem]"
            style={{ background: badge.color }}
          >
            {badge.label}
          </span>
        )}
        <button
          className="absolute top-1.5 right-2 w-4 h-4 rounded-sm border flex items-center justify-center"
          style={{
            background: selected ? 'var(--accent-orange)' : 'rgba(0,0,0,0.5)',
            borderColor: selected ? 'var(--accent-orange)' : 'var(--text-muted)',
          }}
          onClick={e => { e.stopPropagation(); onToggleSelect?.() }}
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          {selected && <span className="text-black text-xs font-bold leading-none">✓</span>}
        </button>
        {isInstalling && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--border)]">
            <div
              className="h-full bg-[var(--accent-orange)] transition-all duration-300"
              style={{ width: `${downloadProgress ?? 50}%` }}
            />
          </div>
        )}
        {installed && !isInstalling && (
          <div className="absolute inset-0 bg-[var(--accent-green)] opacity-5 pointer-events-none" />
        )}
      </div>

      {/* Info zone */}
      <div className="px-2.5 py-2">
        <div
          className="text-xs font-mono font-bold text-[var(--text-primary)] mb-1 cursor-pointer hover:text-[var(--accent-cyan)] truncate"
          onClick={() => onOpenDetail(map)}
        >
          {map.originalName}
        </div>
        <div className="flex justify-between items-center mb-2 text-[var(--text-muted)] text-xs font-mono">
          {isInstalling && phaseLabel ? (
            <span className="text-[var(--accent-orange)] truncate">{phaseLabel}</span>
          ) : (
            <span>{formatBytes(map.size)}</span>
          )}
          <span>↓ {installCount.toLocaleString()}</span>
        </div>

        {supportsFileApi ? (
          confirmReinstall ? (
            <div className="flex gap-1">
              <button
                className="flex-1 py-1.5 rounded text-xs font-mono font-bold bg-[var(--accent-orange)] text-black hover:opacity-90 transition-opacity"
                onClick={() => { setConfirmReinstall(false); void doInstall() }}
              >
                {BTN_REINSTALL}
              </button>
              <button
                className="px-2 py-1.5 rounded text-xs font-mono text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
                onClick={() => setConfirmReinstall(false)}
              >
                {BTN_CANCEL}
              </button>
            </div>
          ) : (
            <button
              className={`w-full py-1.5 rounded text-xs font-mono font-bold tracking-wide transition-colors ${
                isInstalling
                  ? 'bg-[var(--bg-inset)] text-[var(--accent-orange)] border border-[var(--accent-orange)]'
                  : installed
                    ? 'bg-transparent text-[var(--accent-green)] border border-[var(--accent-green)] hover:opacity-80'
                    : 'bg-[var(--accent-orange)] text-black hover:opacity-90'
              }`}
              onClick={() => { if (isInstalling) return; if (installed) { setConfirmReinstall(true) } else { void doInstall() } }}
              disabled={isInstalling}
            >
              {isInstalling ? BTN_INSTALLING : installed ? BTN_INSTALLED : BTN_INSTALL}
            </button>
          )
        ) : (
          <button
            aria-label="install (download)"
            className="w-full py-1.5 rounded text-xs font-mono font-bold bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
            onClick={handleRawDownload}
          >
            {BTN_DOWNLOAD}
          </button>
        )}
      </div>
    </div>
  )
}
