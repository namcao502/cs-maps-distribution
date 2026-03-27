'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, installMap, isBspInstalled } from '@/lib/maps/install'
import { ensurePermission, markInstalled, isInstalledLocally } from '@/lib/maps/folder-store'
import type { InstallStatus } from '@/lib/maps/install'
import {
  BTN_REINSTALL, BTN_CANCEL, BTN_INSTALLING, BTN_INSTALLED, BTN_INSTALL, BTN_DOWNLOAD,
  PHASE_DOWNLOADING, PHASE_VERIFYING, PHASE_EXTRACTING, PHASE_WRITING,
} from '@/lib/constants/messages'
import { useNotifications } from '@/lib/auth/notification-context'

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
  const { push } = useNotifications()
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
      push(`${map.originalName} installed successfully`, 'success')
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Unknown error'
      onInstallStatusChange?.(map.id, { phase: 'error', message: msg })
      push(`Failed to install ${map.originalName}: ${msg}`, 'error')
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
      push(`${map.originalName} download started`, 'success')
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Download failed.'
      onInstallStatusChange?.(map.id, { phase: 'error', message: msg })
      push(`Failed to download ${map.originalName}: ${msg}`, 'error')
    }
  }

  const badge = getTypeBadge(map.tags)
  const screenshotUrl = map.screenshotKeys?.[0] ?? null

  const cardBorder = installed
    ? 'border-[var(--border-installed)] border-l-[3px] border-l-[var(--accent-green)]'
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
    <div className={`bg-[var(--bg-surface)] border rounded-lg overflow-hidden transition-[colors,transform,box-shadow] duration-200 ${isInstalling ? '' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30'} ${cardBorder}`}>

      {/* Thumbnail zone */}
      <div
        data-testid="card-thumbnail"
        className="relative h-40 sm:h-28 cursor-pointer"
        style={{ background: screenshotUrl ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)' }}
        onClick={() => onOpenDetail(map)}
      >
        {screenshotUrl && (
          <Image src={screenshotUrl} alt={map.originalName} fill unoptimized className="object-cover" />
        )}
        {!screenshotUrl && (
          <>
            <style>{`[data-map-placeholder="${map.id}"]::before { content: "${map.originalName}"; display: block; color: var(--text-muted); font-family: monospace; font-size: 10px; text-align: center; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }`}</style>
            <div
              className="absolute inset-0 flex items-center justify-center px-2 pointer-events-none"
              aria-hidden="true"
              data-testid="card-thumbnail-placeholder"
              data-map-placeholder={map.id}
            />
          </>
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
          className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)] rounded-sm"
          onClick={e => { e.stopPropagation(); onToggleSelect?.() }}
          aria-label={selected ? 'Deselect' : 'Select'}
        >
          <span
            className="w-4 h-4 rounded-sm border flex items-center justify-center"
            style={{
              background: selected ? 'var(--accent-orange)' : 'rgba(0,0,0,0.5)',
              borderColor: selected ? 'var(--accent-orange)' : 'var(--text-muted)',
            }}
          >
            {selected && <span className="text-black text-xs font-bold leading-none">✓</span>}
          </span>
        </button>
        {isInstalling && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--border)]"
            role="progressbar"
            aria-valuenow={Math.round(downloadProgress ?? 50)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Download progress"
          >
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
        <button
          type="button"
          className="text-xs font-mono font-bold text-[var(--text-primary)] mb-1 cursor-pointer hover:text-[var(--accent-cyan)] truncate text-left w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-cyan)] rounded-sm"
          onClick={() => onOpenDetail(map)}
        >
          {map.originalName}
        </button>
        <div className="flex justify-between items-center mb-2 text-[var(--text-muted)] text-xs font-mono">
          {isInstalling && phaseLabel ? (
            <span className="text-[var(--accent-orange)] truncate">{phaseLabel}</span>
          ) : (
            <span>{formatBytes(map.size)}</span>
          )}
          <span className={`flex items-center gap-1 ${installCount > 100 ? 'text-[var(--accent-orange)]' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {installCount.toLocaleString()}
          </span>
        </div>

        {supportsFileApi ? (
          confirmReinstall ? (
            <div className="flex gap-1">
              <button
                className="flex-1 py-1.5 rounded text-xs font-mono font-bold bg-[var(--accent-orange)] text-black hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
                onClick={() => { setConfirmReinstall(false); void doInstall() }}
              >
                {BTN_REINSTALL}
              </button>
              <button
                className="px-2 py-1.5 rounded text-xs font-mono text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
                onClick={() => setConfirmReinstall(false)}
              >
                {BTN_CANCEL}
              </button>
            </div>
          ) : (
            <button
              className={`w-full py-1.5 rounded text-xs font-mono font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)] ${
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
            className="w-full py-1.5 rounded text-xs font-mono font-bold bg-[var(--bg-inset)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-orange)]"
            onClick={handleRawDownload}
          >
            {BTN_DOWNLOAD}
          </button>
        )}
      </div>
    </div>
  )
}
