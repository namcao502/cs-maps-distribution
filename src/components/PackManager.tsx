'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import type { MapPack } from '@/types/pack'

type PackWithMaps = MapPack & { maps: MapEntry[] }

export function PackManager({ maps }: { maps: MapEntry[] }) {
  const [packs, setPacks] = useState<PackWithMaps[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMapIds, setSelectedMapIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  async function loadPacks() {
    const res = await fetch('/api/packs')
    if (res.ok) setPacks(await res.json())
  }

  useEffect(() => { loadPacks() }, [])

  function toggleMap(id: string) {
    setSelectedMapIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || selectedMapIds.size === 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/admin/packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), mapIds: Array.from(selectedMapIds) }),
      })
      if (res.ok) {
        setName('')
        setDescription('')
        setSelectedMapIds(new Set())
        await loadPacks()
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/packs/${id}`, { method: 'DELETE' })
    if (res.ok) setPacks(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Map Packs</h2>

      {/* Create form */}
      <form onSubmit={handleCreate} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 mb-4 flex flex-col gap-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Create Pack</h3>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Pack name (required)"
          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-400"
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-400"
        />
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {maps.map(map => (
            <label key={map.id} className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer">
              <input
                type="checkbox"
                checked={selectedMapIds.has(map.id)}
                onChange={() => toggleMap(map.id)}
                className="accent-blue-500"
              />
              {map.originalName}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={!name.trim() || selectedMapIds.size === 0 || creating}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {creating ? 'Creating…' : 'Create Pack'}
        </button>
      </form>

      {/* Pack list */}
      <div className="flex flex-col gap-2">
        {packs.map(pack => (
          <div key={pack.id} className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <div>
              <p className="font-medium text-sm text-[var(--text-primary)]">{pack.name}</p>
              {pack.description && (
                <p className="text-xs text-[var(--text-muted)]">{pack.description}</p>
              )}
              <p className="text-xs text-[var(--text-muted)]">{pack.maps.length} map{pack.maps.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={() => handleDelete(pack.id)}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
        {packs.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No packs yet.</p>
        )}
      </div>
    </div>
  )
}
