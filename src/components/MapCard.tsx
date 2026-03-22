'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import type { InstallStatus } from '@/lib/install'
import { ProgressModal } from './ProgressModal'
import { isFileSystemAccessSupported, installMap, isMapInstalled } from '@/lib/install'
import { ensurePermission } from '@/lib/folder-store'

const FORMAT_COLORS: Record<string, string> = {
  zip: 'bg-blue-100 text-blue-600',
  '7z': 'bg-violet-100 text-violet-600',
  rar: 'bg-orange-100 text-orange-600',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapCard({
  map,
  gameFolder,
  onPickFolder,
}: {
  map: MapEntry
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
}) {
  const [status, setStatus] = useState<InstallStatus | null>(null)
  const [installed, setInstalled] = useState(false)
  const supportsFileApi = isFileSystemAccessSupported()

  useEffect(() => {
    if (!gameFolder) { setInstalled(false); return }
    isMapInstalled(gameFolder, map.originalName).then(setInstalled)
  }, [gameFolder, map.originalName])

  async function handleRawDownload() {
    const res = await fetch(`/api/download/${map.id}`)
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url
    a.download = `${map.originalName}.${map.format}`
    a.click()
  }

  async function handleInstall() {
    try {
      if (installed) {
        const confirmed = confirm(`"${map.originalName}" is already installed. Reinstall it?`)
        if (!confirmed) return
      }

      let handle = gameFolder
      if (!handle) {
        await onPickFolder()
        return
      }

      const permitted = await ensurePermission(handle)
      if (!permitted) {
        setStatus({ phase: 'error', message: 'Folder access was denied. Please choose the folder again.' })
        return
      }

      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()

      await installMap(map, url, sha256, handle, setStatus)
      setInstalled(true)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      setStatus({ phase: 'error', message: (err as Error).message ?? 'Unknown error' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${FORMAT_COLORS[map.format] ?? 'bg-slate-100 text-slate-600'}`}>
            {map.format}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 truncate">{map.originalName}</span>
              {installed && (
                <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                  ✓ Installed
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            {map.uploader && (
              <div className="flex items-center gap-1 mt-0.5">
                <img src={map.uploader.avatar} alt="" className="w-4 h-4 rounded-full" />
                <span className="text-xs text-slate-400">by {map.uploader.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          {supportsFileApi ? (
            <button
              onClick={handleInstall}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                installed
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {installed ? 'Reinstall' : gameFolder ? 'Install' : 'Choose Folder & Install'}
            </button>
          ) : (
            <button
              onClick={handleRawDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Download
            </button>
          )}
        </div>
      </div>

      <ProgressModal
        status={status}
        onClose={() => setStatus(null)}
        onFallbackDownload={handleRawDownload}
      />
    </>
  )
}
