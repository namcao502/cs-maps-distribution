'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import { MapCard } from '@/components/maps/MapCard'
import { SearchInput } from '@/components/maps/SearchInput'
import { scanInstalledBsps } from '@/lib/maps/install'
import { MAP_TAGS, TAG_LABELS } from '@/lib/maps/tags'
import { Card } from '@/components/ui'

const CHEAT_CODES = [
  { code: 'impulse 101', label: 'Code' },
]

function CheatCodeBanner({ className }: { className?: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  return (
    <div className={`flex gap-2 ${className ?? ''}`}>
      {CHEAT_CODES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => copy(code)}
          title={`Copy: ${code}`}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs font-mono text-[var(--text-primary)] hover:border-blue-400 hover:bg-[var(--bg-secondary)] transition-colors"
        >
          <span className="text-[var(--text-muted)] font-sans not-italic">{label}:</span>
          <span className="font-semibold">{code}</span>
          <span className={`ml-1 transition-colors ${copied === code ? 'text-green-500' : 'text-[var(--text-muted)]'}`}>
            {copied === code ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

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
    const matchesTags = selectedTags.length === 0 || selectedTags.some(t =>
      m.tags.includes(t) || m.originalName.toLowerCase().startsWith(t.toLowerCase())
    )
    return matchesSearch && matchesTags
  })

  if (maps.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[var(--text-muted)] text-sm">No maps available yet.</p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center">
        <div className="grid grid-cols-1 gap-3 w-fit mx-auto">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs text-[var(--text-muted)] font-mono">
            <p className="text-[var(--text-primary)] font-sans font-medium text-sm mb-2">Pick your CS 1.6 root folder:</p>
            <div className="flex flex-col gap-0.5">
              {[
                { label: 'C:\\',            indent: 0, highlight: false },
                { label: 'Games',           indent: 1, highlight: false },
                { label: 'Counter-Strike',  indent: 2, highlight: true  },
                { label: 'cstrike',         indent: 3, highlight: false },
                { label: 'maps',            indent: 4, highlight: false },
                { label: '...',             indent: 4, highlight: false },
              ].map(({ label, indent, highlight }) => (
                <span
                  key={label}
                  className={`flex items-center gap-1.5 ${highlight ? 'text-blue-500 font-semibold' : 'text-[var(--text-muted)]'}`}
                  style={{ paddingLeft: `${indent * 14}px` }}
                >
                  {label === '...' ? null : label === 'C:\\' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>
                  )}
                  {label}{highlight && <span className="text-[var(--text-muted)] font-normal ml-1">← pick this</span>}
                </span>
              ))}
            </div>
            <p className="mt-2 pt-2 border-t border-[var(--border)] text-[var(--text-muted)] font-mono text-[11px]">
              <span className="font-sans">Ex:</span> C:\Games\<span className="text-blue-500 font-semibold">Counter-Strike</span>
            </p>
          </div>
          <button
            onClick={onPickFolder}
            className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all active:scale-95 ${
              gameFolder
                ? 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:border-blue-400 hover:text-blue-500'
                : 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5'
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
          <CheatCodeBanner className="w-full" />
        </div>
      </div>
      <SearchInput value={query} onChange={setQuery} />
      <div className="flex flex-wrap gap-2 justify-center">
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
            {TAG_LABELS[tag] ?? tag}
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
