'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import { ConfirmModal } from './ConfirmModal'
import { SearchInput } from './SearchInput'
import { MAP_TAGS, TAG_LABELS } from '@/lib/tags'
import { Button, Card } from '@/components/ui'

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

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminMapList({
  maps,
  onDeleted,
  onTagsUpdated,
  onHiddenUpdated,
}: {
  maps: MapEntry[]
  onDeleted: (id: string) => void
  onTagsUpdated: (id: string, tags: string[]) => void
  onHiddenUpdated: (id: string, hidden: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<MapEntry | null>(null)
  const [editingTags, setEditingTags] = useState<string | null>(null)
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [savingTags, setSavingTags] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [togglingHidden, setTogglingHidden] = useState<string | null>(null)

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

  async function toggleHidden(map: MapEntry) {
    setTogglingHidden(map.id)
    const res = await fetch(`/api/admin/maps/${map.id}/hidden`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: !map.hidden }),
    })
    if (res.ok) onHiddenUpdated(map.id, !map.hidden)
    setTogglingHidden(null)
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
        <Card
          key={map.id}
          className={`mb-2 transition-shadow hover:shadow-md ${map.hidden ? 'border-amber-400 opacity-60' : ''}`}
        >
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${FORMAT_COLORS[map.format] ?? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>
                {map.format}
              </span>
              {map.tags.filter(t => t in TAG_COLORS).map(tag => (
                <span key={tag} className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${TAG_COLORS[tag]}`}>
                  {TAG_SHORT[tag]}
                </span>
              ))}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text-primary)] truncate">{map.originalName}</span>
                  {map.hidden && <span className="shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600">Hidden</span>}
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatBytes(map.size)} · {new Date(map.uploadedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · ⚙ {map.installCount}
                </span>
                {map.uploader && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <img src={map.uploader.avatar} alt="" className="w-4 h-4 rounded-full" />
                    <span className="text-xs text-[var(--text-muted)]">by {map.uploader.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setEditingTags(editingTags === map.id ? null : map.id); setDraftTags(map.tags ?? []) }}
              >
                {editingTags === map.id ? 'Cancel' : 'Tags'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleHidden(map)}
                disabled={togglingHidden === map.id}
                className="flex items-center gap-1.5"
              >
                {map.hidden ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                )}
                {togglingHidden === map.id ? '…' : map.hidden ? 'Show' : 'Hide'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setPendingDelete(map)}
                className="flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                Delete
              </Button>
            </div>
          </div>

          {editingTags === map.id && (
            <div className="px-4 pb-3 pt-0 border-t border-[var(--border)] mt-0 flex flex-wrap items-center gap-2 pt-3">
              {MAP_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setDraftTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    draftTags.includes(tag)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border)] hover:border-blue-400'
                  }`}
                >
                  {TAG_LABELS[tag] ?? tag}
                </button>
              ))}
              <Button
                variant="primary"
                size="sm"
                onClick={() => saveTags(map.id)}
                disabled={savingTags}
                loading={savingTags}
              >
                {savingTags ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}
        </Card>
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
