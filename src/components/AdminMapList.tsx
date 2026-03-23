'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import { ConfirmModal } from './ConfirmModal'
import { SearchInput } from './SearchInput'
import { MAP_TAGS } from '@/lib/tags'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMapList({
  maps,
  onDeleted,
  onTagsUpdated,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
  onTagsUpdated: (id: string, tags: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MapEntry | null>(null)
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function saveTags(id: string) {
    setSavingTags(true)
    const res = await fetch(`/api/admin/maps/${id}/tags`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: draftTags }),
    })
    if (res.ok) {
      onTagsUpdated(id, draftTags)
      setEditingTags(null)
    } else {
      alert('Failed to save tags')
    }
    setSavingTags(false)
  }

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
        <div key={map.id} className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{map.originalName}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)] uppercase">{map.format}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{formatBytes(map.size)}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">↓ {map.downloadCount}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">⚙ {map.installCount}</span>
              <button
                onClick={() => { setEditingTags(editingTags === map.id ? null : map.id); setDraftTags(map.tags ?? []) }}
                className="ml-2 text-xs text-blue-500 hover:text-blue-700"
              >
                {editingTags === map.id ? 'Cancel' : 'Edit tags'}
              </button>
            </div>
            <button
              onClick={() => setPendingDelete(map)}
              className="text-sm text-red-500 hover:text-red-700 font-medium"
            >
            Delete
            </button>
          </div>
          {editingTags === map.id && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              {MAP_TAGS.map(tag => (
                <label key={tag} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftTags.includes(tag)}
                    onChange={() =>
                      setDraftTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )
                    }
                  />
                  <span className="text-xs text-[var(--text-primary)]">{tag}</span>
                </label>
              ))}
              <button
                onClick={() => saveTags(map.id)}
                disabled={savingTags}
                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          )}
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
