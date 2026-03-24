'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import type { PackWithMaps } from '@/types/pack'
import { installMap } from '@/lib/install'
import { ensurePermission, markInstalled } from '@/lib/folder-store'
import { Button } from '@/components/ui'

type MapStatus = 'idle' | 'installing' | 'done' | 'error'
type InstallStates = Record<string, Record<string, MapStatus>>

export function PackSection({
  gameFolder,
  onPickFolder,
}: {
  gameFolder: FileSystemDirectoryHandle | null
  onPickFolder: () => Promise<void>
}) {
  const [packs, setPacks] = useState<PackWithMaps[]>([])
  const [installStates, setInstallStates] = useState<InstallStates>({})
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set())
  const [selectedMaps, setSelectedMaps] = useState<Record<string, Set<string>>>({})

  useEffect(() => {
    fetch('/api/packs')
      .then(r => r.ok ? r.json() : [])
      .then(setPacks)
      .catch(() => {})
  }, [])

  if (packs.length === 0) return null

  function setMapStatus(packId: string, mapId: string, status: MapStatus) {
    setInstallStates(prev => ({
      ...prev,
      [packId]: { ...(prev[packId] ?? {}), [mapId]: status },
    }))
  }

  async function installSingleMap(packId: string, map: MapEntry, folder: FileSystemDirectoryHandle) {
    try {
      const res = await fetch(`/api/download/${map.id}`)
      if (!res.ok) throw new Error('Failed to get download URL')
      const { url, sha256 } = await res.json() as { url: string; sha256: string }
      await installMap(map, url, sha256, folder, () => {})
      markInstalled(map.id)
      fetch(`/api/maps/${map.id}/install`, { method: 'POST' }).catch(() => {})
      setMapStatus(packId, map.id, 'done')
    } catch {
      setMapStatus(packId, map.id, 'error')
    }
  }

  async function installPack(packId: string, maps: MapEntry[]) {
    if (!gameFolder) {
      await onPickFolder()
      return
    }
    const permitted = await ensurePermission(gameFolder)
    if (!permitted) return

    maps.forEach(map => setMapStatus(packId, map.id, 'installing'))
    await Promise.all(maps.map(map => installSingleMap(packId, map, gameFolder)))
  }

  function toggleExpand(packId: string) {
    setExpandedPacks(prev => {
      const next = new Set(prev)
      next.has(packId) ? next.delete(packId) : next.add(packId)
      return next
    })
  }

  function toggleMapSelect(packId: string, mapId: string) {
    setSelectedMaps(prev => {
      const packSet = new Set(prev[packId] ?? [])
      packSet.has(mapId) ? packSet.delete(mapId) : packSet.add(mapId)
      return { ...prev, [packId]: packSet }
    })
  }

  function statusIcon(status: MapStatus | undefined) {
    if (status === 'installing') return <span className="text-blue-500 text-xs">⟳</span>
    if (status === 'done') return <span className="text-green-500 text-xs">✓</span>
    if (status === 'error') return <span className="text-red-500 text-xs">✗</span>
    return null
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Map Packs</h2>
      {packs.map(pack => {
        const expanded = expandedPacks.has(pack.id)
        const packSelected = selectedMaps[pack.id] ?? new Set<string>()
        const packStates = installStates[pack.id] ?? {}
        const selectedPackMaps = pack.maps.filter(m => packSelected.has(m.id))

        return (
          <div key={pack.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{pack.name}</p>
                {pack.description && (
                  <p className="text-xs text-[var(--text-muted)]">{pack.description}</p>
                )}
                <p className="text-xs text-[var(--text-muted)]">{pack.maps.length} map{pack.maps.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <Button
                  variant="success"
                  size="md"
                  onClick={() => installPack(pack.id, pack.maps)}
                >
                  Install All
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => toggleExpand(pack.id)}
                >
                  {expanded ? 'Close' : 'Pick & Install'}
                </Button>
              </div>
            </div>

            {expanded && (
              <div className="border-t border-[var(--border)] px-4 py-3 flex flex-col gap-2">
                {pack.maps.map(map => (
                  <div key={map.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={packSelected.has(map.id)}
                      onChange={() => toggleMapSelect(pack.id, map.id)}
                      className="accent-blue-500 shrink-0"
                    />
                    <span className="text-sm text-[var(--text-primary)] flex-1">{map.originalName}</span>
                    {statusIcon(packStates[map.id])}
                  </div>
                ))}
                {selectedPackMaps.length > 0 && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => installPack(pack.id, selectedPackMaps)}
                    className="mt-1"
                  >
                    Install ({selectedPackMaps.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
