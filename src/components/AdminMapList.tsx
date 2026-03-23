'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import { ConfirmModal } from './ConfirmModal'
import { SearchInput } from './SearchInput'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMapList({
  maps,
  onDeleted,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MapEntry | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function confirmDelete(map: MapEntry) {
    setPendingDelete(null)
    const res = await fetch(`/api/delete/${map.id}`, { method: 'DELETE' })
    if (!res.ok) {
      setDeleteError('Failed to delete map. Please try again.')
      return
    }
    onDeleted(map.id)
  }

  if (maps.length === 0) {
    return <p className="text-[var(--text-muted)] text-center py-6">No maps yet.</p>
  }

  const filtered = maps.filter(m =>
    m.originalName.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-2 mt-6">
      <SearchInput value={query} onChange={setQuery} />
      {filtered.length === 0 ? (
        <p className="text-[var(--text-muted)] text-center py-6">No maps found.</p>
      ) : null}
      {filtered.map(map => (
        <div key={map.id} className="flex items-center justify-between p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
          <div>
            <span className="font-medium">{map.originalName}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)] uppercase">{map.format}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">{formatBytes(map.size)}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">↓ {map.downloadCount}</span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">⚙ {map.installCount}</span>
          </div>
          <button
            onClick={() => setPendingDelete(map)}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Delete
          </button>
        </div>
      ))}
      {pendingDelete && (
        <ConfirmModal
          message={`Delete "${pendingDelete.originalName}"?`}
          confirmLabel="Delete"
          destructive
          onConfirm={() => confirmDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {deleteError && (
        <ConfirmModal
          message={deleteError}
          confirmLabel="OK"
          cancelLabel=""
          onConfirm={() => setDeleteError(null)}
          onCancel={() => setDeleteError(null)}
        />
      )}
    </div>
  )
}
