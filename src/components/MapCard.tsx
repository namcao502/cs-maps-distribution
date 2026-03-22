'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import type { InstallStatus } from '@/lib/install'
import { ProgressModal } from './ProgressModal'
import {
  isFileSystemAccessSupported,
  pickGameFolder,
  validateGameFolder,
  installMap,
} from '@/lib/install'

const FORMAT_COLORS: Record<string, string> = {
  zip: 'bg-blue-100 text-blue-700',
  '7z': 'bg-purple-100 text-purple-700',
  rar: 'bg-orange-100 text-orange-700',
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapCard({ map }: { map: MapEntry }) {
  const [status, setStatus] = useState<InstallStatus | null>(null)
  const supportsFileApi = isFileSystemAccessSupported()

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
      // Get presigned URL + sha256
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json()

      // Pick game folder
      const handle = await pickGameFolder()

      // Validate folder (warn if no cstrike/ found)
      const valid = await validateGameFolder(handle)
      if (!valid) {
        const confirmed = confirm(
          "This doesn't look like a CS 1.6 root folder (no 'cstrike' subfolder found). Continue anyway?"
        )
        if (!confirmed) return
      }

      // Run install
      await installMap(map, url, sha256, handle, setStatus)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return // user cancelled picker
      setStatus({ phase: 'error', message: (err as Error).message ?? 'Unknown error' })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm hover:shadow-md transition">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${FORMAT_COLORS[map.format] ?? 'bg-gray-100 text-gray-700'}`}>
            {map.format}
          </span>
          <div>
            <p className="font-semibold">{map.originalName}</p>
            <p className="text-xs text-gray-400">{formatBytes(map.size)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {supportsFileApi ? (
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
            >
              Install
            </button>
          ) : (
            <button
              onClick={handleRawDownload}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
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
