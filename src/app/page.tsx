'use client'
import { useEffect, useState } from 'react'
import { MapList } from '@/components/MapList'
import type { MapEntry } from '@/types/map'
import { isFileSystemAccessSupported, pickGameFolder, validateGameFolder } from '@/lib/install'
import { saveHandle, loadHandle } from '@/lib/folder-store'
import { AuthButton } from '@/components/AuthButton'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ThemeToggle } from '@/components/ThemeToggle'

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

    // Re-fetch when restored from bfcache (browser back button)
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) fetchMaps()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supported = isFileSystemAccessSupported()
    setSupportsFileApi(supported)
    if (supported) {
      loadHandle().then(h => { if (h) setGameFolder(h) }).catch(() => {})
    }
  }, [])

  async function handlePickFolder() {
    try {
      const handle = await pickGameFolder()
      const valid = await validateGameFolder(handle)
      if (!valid) {
        setPendingHandle(handle)
        return
      }
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
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">CS 1.6 Maps</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">One-click map installer</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {!supportsFileApi && (
          <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Your browser doesn&apos;t support one-click install. Use the <strong>Download</strong> button and install manually.
          </div>
        )}

        {supportsFileApi && !gameFolder && (
          <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
            Select your CS 1.6 folder first — e.g. <code className="font-mono bg-blue-100 px-1 rounded">C:\Games\Counter-Strike</code>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[var(--text-muted)] text-sm">Loading maps...</div>
        ) : (
          <MapList maps={maps} gameFolder={gameFolder} onPickFolder={handlePickFolder} />
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
