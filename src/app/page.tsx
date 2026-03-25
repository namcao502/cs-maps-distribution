'use client'
import { useEffect, useState } from 'react'
import { MapList } from '@/components/maps/MapList'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, pickGameFolder, validateGameFolder } from '@/lib/maps/install'
import { saveHandle, loadHandle } from '@/lib/maps/folder-store'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ConfirmModal } from '@/components/ConfirmModal'
import type { FilterTab } from '@/lib/maps/tags'

export default function HomePage() {
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFolder, setGameFolder] = useState<FileSystemDirectoryHandle | null>(null)
  const [supportsFileApi, setSupportsFileApi] = useState(false)
  const [pendingHandle, setPendingHandle] = useState<FileSystemDirectoryHandle | null>(null)

  // Lifted state for SiteHeader
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [installedCount, setInstalledCount] = useState(0)

  function fetchMaps() {
    setLoading(true)
    fetch('/api/maps')
      .then(r => r.ok ? r.json() : [])
      .then(setMaps)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMaps()
    function onPageShow(e: PageTransitionEvent) { if (e.persisted) fetchMaps() }
    function onVisibilityChange() { if (document.visibilityState === 'visible') fetchMaps() }
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
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
      <SiteHeader
        installedCount={installedCount}
        totalCount={maps.length}
        query={query}
        onQueryChange={setQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <main className="max-w-7xl mx-auto px-4 py-4">
        {!supportsFileApi && (
          <div className="mb-6 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--accent-orange)] rounded-lg text-sm text-[var(--accent-orange)]">
            Your browser doesn&apos;t support one-click install. Use the <strong>Download</strong> button instead.
          </div>
        )}
        {supportsFileApi && !gameFolder && (
          <div className="mb-4 px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)]">
            Select your CS 1.6 folder first — e.g. <code className="font-mono text-[var(--accent-cyan)]">C:\Games\Counter-Strike</code>
          </div>
        )}
        {loading ? (
          <div className="text-center py-20 text-[var(--text-muted)] text-sm font-mono">Loading maps...</div>
        ) : (
          <MapList maps={maps} gameFolder={gameFolder} onPickFolder={handlePickFolder} query={query} activeTab={activeTab} onInstalledCountChange={setInstalledCount} />
        )}
      </main>
      {pendingHandle && (
        <ConfirmModal
          message="This doesn't look like a CS 1.6 root folder (no 'cstrike' subfolder found). Continue anyway?"
          confirmLabel="Continue"
          onConfirm={confirmFolder}
          onCancel={() => setPendingHandle(null)}
        />
      )}
    </div>
  )
}
