'use client'
import { useEffect, useState } from 'react'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, pickGameFolder, validateGameFolder } from '@/lib/maps/install'
import { saveHandle, loadHandle } from '@/lib/maps/folder-store'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ConfirmModal } from '@/components/ConfirmModal'
import { INFO_NO_BROWSER_INSTALL, INFO_SELECT_CS_FOLDER, STATUS_LOADING_MAPS, INFO_WRONG_CS_FOLDER } from '@/lib/constants/messages'
export default function HomePage() {
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFolder, setGameFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [supportsFileApi, setSupportsFileApi] = useState(false)
  const [pendingHandle, setPendingHandle] = useState<FileSystemDirectoryHandle | null>(null)

  function fetchMaps() {
    setLoading(true)
    fetch('/api/maps')
      .then(r => r.ok ? r.json() : [])
      .then(setMaps)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMaps()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supported = isFileSystemAccessSupported()
    setSupportsFileApi(supported)
    if (supported) loadHandle().then(h => { if (h) setGameFolder(h) }).catch(() => {})
  }, [])

  async function handlePickFolder() {
    try {
      const handle = await pickGameFolder()
      const valid = await validateGameFolder(handle)
      if (!valid) { setPendingHandle(handle); return }
      await saveHandle(handle)
      setGameFolder(handle)
    } catch (err: unknown) {
      if ((err as { name?: string }).name !== 'AbortError') throw err
    }
  }

  async function confirmFolder() {
    if (!pendingHandle) return
    setPendingHandle(null)
    await saveHandle(pendingHandle)
    setGameFolder(pendingHandle)
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader />
      <main className="max-w-7xl mx-auto px-4 py-4">
        {!supportsFileApi && (
          <div className="mb-6 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--accent-orange)] rounded-lg text-sm text-[var(--accent-orange)]">
            {INFO_NO_BROWSER_INSTALL}
          </div>
        )}
        {supportsFileApi && !gameFolder && (
          <div className="mb-4 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)]">
            {INFO_SELECT_CS_FOLDER}
          </div>
        )}
        {loading ? (
          <div className="text-center py-20 text-[var(--text-muted)] text-sm font-mono">{STATUS_LOADING_MAPS}</div>
        ) : (
          <MapList maps={maps} gameFolder={gameFolder} onPickFolder={handlePickFolder} />
        )}
      </main>
      {pendingHandle && (
        <ConfirmModal
          message={INFO_WRONG_CS_FOLDER}
          confirmLabel="Continue"
          onConfirm={confirmFolder}
          onCancel={() => setPendingHandle(null)}
        />
      )}
    </div>
  )
}
