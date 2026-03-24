'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { ConfirmModal } from '@/components/ConfirmModal'
import { isFileSystemAccessSupported, installMap, isBspInstalled } from '@/lib/maps/install'
import { ensurePermission, markInstalled, isInstalledLocally } from '@/lib/maps/folder-store'
import { useNotifications } from '@/lib/auth/notification-context'
import type { InstallStatus } from '@/lib/maps/install'
import { Button, Badge } from '@/components/ui'

const FORMAT_VARIANTS: Record<string, 'info'> = {
  zip: 'info',
  '7z': 'info',
  rar: 'info',
}

const TAG_SHORT: Record<string, string> = {
  'de_': 'DE',
  'cs_': 'CS',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapCard({
  map,
  gameFolder,
  onPickFolder,
  installedBsps,
  onInstalled,
  selected = false,
  onToggleSelect,
  autoInstall = false,
  onBatchTriggered,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
  installedBsps: Set<string>
  onInstalled: () => void
  selected?: boolean
  onToggleSelect?: () => void
  autoInstall?: boolean
  onBatchTriggered?: () => void
}) {
  const [installed, setInstalled] = useState(() => isInstalledLocally(map.id))
  const [installCount, setInstallCount] = useState(map.installCount)
  const [confirmReinstall, setConfirmReinstall] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)
  const supportsFileApi = isFileSystemAccessSupported()
  const { startProgress, updateProgress } = useNotifications()

  useEffect(() => {
    setInstalled(isBspInstalled(map.originalName, installedBsps) || isInstalledLocally(map.id))
  }, [installedBsps, map.originalName, map.id])

  useEffect(() => {
    if (!autoInstall) return
    async function run() {
      await handleInstall()
      onBatchTriggered?.()
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInstall])

  async function handleRawDownload() {
    const res = await fetch(`/api/download/${map.id}`)
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url
    a.download = `${map.originalName}.${map.format}`
    a.click()
  }

  async function handleInstall() {
    if (installed) {
      setConfirmReinstall(true)
      return
    }
    await doInstall()
  }

  async function doInstall() {
    setIsInstalling(true)
    const notifId = `install-${map.id}-${Date.now()}`
    startProgress(notifId, map.originalName)
    try {
      let handle = gameFolder
      if (!handle) {
        await onPickFolder()
        return
      }

      const permitted = await ensurePermission(handle)
      if (!permitted) {
        updateProgress(notifId, { phase: 'error', message: 'Folder access was denied.' })
        return
      }

      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()

      await installMap(map, url, sha256, handle, (s: InstallStatus) => updateProgress(notifId, s))
      markInstalled(map.id)
      fetch(`/api/maps/${map.id}/install`, { method: 'POST' }).catch(() => {})
      setInstalled(true)
      setInstallCount(c => c + 1)
      onInstalled()
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      const msg = (err as Error).message ?? 'Unknown error'
      updateProgress(notifId, { phase: 'error', message: msg })
    } finally {
      setIsInstalling(false)
    }
  }


  return (
    <>
      <div className="flex items-center justify-between px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={e => { e.stopPropagation(); onToggleSelect?.() }}
            className="w-4 h-4 shrink-0 cursor-pointer accent-blue-500"
          />
          <Badge variant={FORMAT_VARIANTS[map.format] ?? 'default'} className="shrink-0">
            {map.format}
          </Badge>
          {map.tags.filter(tag => tag in TAG_SHORT).map(tag => (
            <Badge key={tag} variant="default" className="shrink-0">
              {TAG_SHORT[tag]}
            </Badge>
          ))}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)] truncate">{map.originalName}</span>
              {installed && (
                <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  ✓ Installed
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} {new Date(map.uploadedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ⚙ {installCount}
            </span>
            {map.uploader && (
              <div className="flex items-center gap-1 mt-0.5">
                <img src={map.uploader.avatar} alt="" className="w-4 h-4 rounded-full" />
                <span className="text-xs text-[var(--text-muted)]">by {map.uploader.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          {supportsFileApi ? (
            <Button
              variant={installed ? 'secondary' : 'success'}
              size="md"
              loading={isInstalling}
              onClick={handleInstall}
            >
              {isInstalling ? 'Installing…' : installed ? 'Reinstall' : gameFolder ? 'Install' : 'Choose Folder & Install'}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleRawDownload}>
              Download
            </Button>
          )}
        </div>
      </div>

      {confirmReinstall && (
        <ConfirmModal
          message={`"${map.originalName}" is already installed. Reinstall it?`}
          confirmLabel="Reinstall"
          onConfirm={() => { setConfirmReinstall(false); doInstall() }}
          onCancel={() => setConfirmReinstall(false)}
        />
      )}
    </>
  )
}
