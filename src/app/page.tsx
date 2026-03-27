'use client'
import { useEffect, useState } from 'react'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, pickGameFolder, validateGameFolder } from '@/lib/maps/install'
import { saveHandle, loadHandle } from '@/lib/maps/folder-store'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ConfirmModal } from '@/components/ConfirmModal'
import { INFO_NO_BROWSER_INSTALL, INFO_SELECT_CS_FOLDER, INFO_WRONG_CS_FOLDER } from '@/lib/constants/messages'

function MapCardSkeleton() {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg overflow-hidden animate-pulse">
      <div className="h-28 bg-[var(--bg-inset)]" />
      <div className="px-2.5 py-2 flex flex-col gap-2">
        <div className="h-3 bg-[var(--border)] rounded w-3/4" />
        <div className="h-3 bg-[var(--border)] rounded w-1/2" />
        <div className="h-6 bg-[var(--border)] rounded mt-1" />
      </div>
    </div>
  )
}

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-[10px]">
            {Array.from({ length: 10 }).map((_, i) => <MapCardSkeleton key={i} />)}
          </div>
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
