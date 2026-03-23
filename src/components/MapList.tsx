'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'
import { SearchInput } from './SearchInput'
import { scanInstalledBsps } from '@/lib/install'
import { MAP_TAGS } from '@/lib/tags'

export function MapList({
  maps,
  gameFolder,
  onPickFolder,
}: {
  maps: MapEntry[]
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
}) {
  const [query, setQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchTrigger, setBatchTrigger] = useState<Set<string>>(new Set())
  const [installedBsps, setInstalledBsps] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!gameFolder) {
      setInstalledBsps(new Set())
      return
    }
    let cancelled = false
    scanInstalledBsps(gameFolder).then(result => {
      if (!cancelled) setInstalledBsps(result)
    })
    return () => { cancelled = true }
  }, [gameFolder])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function triggerBatchInstall() {
    setBatchTrigger(new Set(selectedIds))
    setSelectedIds(new Set())
  }

  function clearBatchTrigger(id: string) {
    setBatchTrigger(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function handleInstalled() {
    if (!gameFolder) return
    scanInstalledBsps(gameFolder).then(setInstalledBsps)
  }

  const filtered = maps.filter(m => {
    const matchesSearch = m.originalName.toLowerCase().includes(query.toLowerCase())
    const matchesTags = selectedTags.length === 0 || selectedTags.some(t => m.tags.includes(t))
    return matchesSearch && matchesTags
  })

  if (maps.length === 0) {
    return <p className="text-[var(--text-muted)] text-center py-12">No maps uploaded yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs text-[var(--text-muted)] font-mono inline-block">
          <p className="text-[var(--text-primary)] font-sans font-medium text-sm mb-2">Pick your CS 1.6 root folder:</p>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-blue-500 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
              Counter-Strike  ← pick this
            </span>
            <span className="flex items-center gap-1.5 pl-4 text-[var(--text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
              cstrike
            </span>
            <span className="flex items-center gap-1.5 pl-8 text-[var(--text-muted)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
              maps
            </span>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        <button
          onClick={onPickFolder}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            gameFolder
              ? 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
              : 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          {gameFolder ? (
            <>
              <span className="text-[var(--text-muted)] font-normal">Folder:</span>
              <span className="font-semibold truncate max-w-[200px]">{gameFolder.name}</span>
              <span className="text-xs text-blue-500 ml-1">Change</span>
            </>
          ) : 'Choose CS 1.6 Folder'}
        </button>
      </div>
      <SearchInput value={query} onChange={setQuery} />
      <div className="flex flex-wrap gap-2">
        {MAP_TAGS.map(tag => (
          <button
            key={tag}
            onClick={() =>
              setSelectedTags(prev =>
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
              )
            }
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              selectedTags.includes(tag)
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      {selectedIds.size > 0 && (
        <button
          onClick={triggerBatchInstall}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 active:scale-95 transition-all"
        >
          ⚙ Install Selected ({selectedIds.size})
        </button>
      )}
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-12">No maps found.</p>
      ) : (
        filtered.map(map => (
          <MapCard
            key={map.id}
            map={map}
            gameFolder={gameFolder}
            onPickFolder={onPickFolder}
            installedBsps={installedBsps}
            onInstalled={handleInstalled}
            selected={selectedIds.has(map.id)}
            onToggleSelect={() => toggleSelect(map.id)}
            autoInstall={batchTrigger.has(map.id)}
            onBatchTriggered={() => clearBatchTrigger(map.id)}
          />
        ))
      )}
    </div>
  )
}
