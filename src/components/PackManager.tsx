'use client'
import { useState, useEffect } from 'react'
import type { MapEntry } from '@/types/map'
import type { PackWithMaps } from '@/types/pack'
import { Button, Badge } from '@/components/ui'

const FORMAT_COLORS: Record<string, string> = {
  zip: 'bg-blue-100 text-blue-600',
  '7z': 'bg-violet-100 text-violet-600',
  rar: 'bg-orange-100 text-orange-600',
}

const TAG_COLORS: Record<string, string> = {
  'de_': 'bg-red-100 text-red-600',
  'cs_': 'bg-yellow-100 text-yellow-600',
}

const TAG_SHORT: Record<string, string> = {
  'de_': 'DE',
  'cs_': 'CS',
}

export function PackManager({ maps }: { maps: MapEntry[] }) {
  const [packs, setPacks] = useState<PackWithMaps[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedMapIds, setSelectedMapIds] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
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
      } else {
        setError('Failed to create pack. Please try again.')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/packs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setPacks(prev => prev.filter(p => p.id !== id))
    } else {
      setError('Failed to delete pack. Please try again.')
    }
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3 text-[var(--text-primary)]">Map Packs</h2>

      {error && (
        <p className="text-sm text-red-500 mb-2">{error}</p>
      )}

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
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {maps.map(map => (
            <div
              key={map.id}
              onClick={() => toggleMap(map.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                selectedMapIds.has(map.id)
                  ? 'border-blue-500 bg-[var(--bg-secondary)]'
                  : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-blue-400'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedMapIds.has(map.id)}
                onChange={() => toggleMap(map.id)}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 shrink-0 accent-blue-500"
              />
              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${FORMAT_COLORS[map.format] ?? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                {map.format}
              </span>
              {map.tags.filter(t => t in TAG_COLORS).map(tag => (
                <span key={tag} className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${TAG_COLORS[tag]}`}>
                  {TAG_SHORT[tag]}
                </span>
              ))}
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">{map.originalName}</span>
            </div>
          ))}
        </div>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!name.trim() || selectedMapIds.size === 0 || creating}
          loading={creating}
        >
          {creating ? 'Creating…' : 'Create Pack'}
        </Button>
      </form>

      {/* Pack list */}
      <div className="flex flex-col gap-2">
        {packs.map(pack => (
          <div key={pack.id} className="flex items-center justify-between px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default">{pack.name}</Badge>
              </div>
              {pack.description && (
                <p className="text-xs text-[var(--text-muted)]">{pack.description}</p>
              )}
              <p className="text-xs text-[var(--text-muted)]">{pack.maps.length} map{pack.maps.length !== 1 ? 's' : ''}</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(pack.id)}
            >
              Delete
            </Button>
          </div>
        ))}
        {packs.length === 0 && (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No packs yet.</p>
        )}
      </div>
    </div>
  )
}
