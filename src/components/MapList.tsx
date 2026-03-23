'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import { MapCard } from './MapCard'
import { SearchInput } from './SearchInput'

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

  const filtered = maps.filter(m =>
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  if (maps.length === 0) {
    return <p className="text-[var(--text-muted)] text-center py-12">No maps uploaded yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} />
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-12">No maps found.</p>
      ) : (
        filtered.map(map => (
          <MapCard key={map.id} map={map} gameFolder={gameFolder} onPickFolder={onPickFolder} />
        ))
      )}
    </div>
  )
}
