'use client'
import { useState, useEffect } from 'react'
import type { Submission } from '@/types/submission'
import { MAP_TAGS } from '@/lib/tags'
import { Button, Card, StatusBadge } from '@/components/ui'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Preview { structure: string; bspFiles: string[] }

export function PendingQueue({ onApproved }: { onApproved: () => void }) {
  const [queue, setQueue] = useState<Submission[]>([])
  const [previews, setPreviews] = useState<Record<string, Preview>>({})
  const [rejecting, setRejecting] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [pendingTags, setPendingTags] = useState<Record<string, string[]>>({})

  useEffect(() => {
    fetch('/api/admin/submissions?status=pending')
      .then(r => r.ok ? r.json() : [])
      .then(setQueue)
  }, [])

  async function loadPreview(id: string) {
    if (previews[id]) return
    const res = await fetch(`/api/admin/submissions/${id}/preview`)
    if (res.ok) {
      const data = await res.json()
      setPreviews(p => ({ ...p, [id]: data }))
    }
  }

  async function handleApprove(id: string) {
    if (busy[id]) return
    setBusy(b => ({ ...b, [id]: true }))
    const res = await fetch(`/api/admin/submissions/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: pendingTags[id] ?? [] }),
    })
    if (res.ok) {
      setQueue(q => q.filter(s => s.id !== id))
      onApproved()
    } else {
      alert((await res.json()).error ?? 'Approval failed')
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  async function handleReject(id: string) {
    const reason = (rejecting[id] ?? '').trim()
    if (!reason) return
    setBusy(b => ({ ...b, [id]: true }))
    const res = await fetch(`/api/admin/submissions/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      setQueue(q => q.filter(s => s.id !== id))
    } else {
      alert((await res.json()).error ?? 'Rejection failed')
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  if (queue.length === 0) return null

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-3 text-orange-600">Pending Review ({queue.length})</h2>
      <div className="flex flex-col gap-3">
        {queue.map(sub => (
          <Card key={sub.id} className="mb-3 p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={sub.submitterAvatar} alt="" className="w-6 h-6 rounded-full" />
              <span className="text-sm text-[var(--text-primary)]">{sub.submitterName}</span>
              <StatusBadge status="pending" />
              <span className="text-xs text-[var(--text-muted)] ml-auto">
                {new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md uppercase bg-[var(--bg-secondary)] text-[var(--text-primary)]">{sub.format}</span>
              <span className="font-medium text-[var(--text-primary)]">{sub.originalName}</span>
              <span className="text-xs text-[var(--text-muted)]">{formatBytes(sub.size)}</span>
            </div>

            <button
              onClick={() => loadPreview(sub.id)}
              className="text-xs text-blue-500 hover:text-blue-700 mb-2"
            >
              {previews[sub.id] ? '▼ Archive preview' : '▶ Load archive preview'}
            </button>

            {previews[sub.id] && (
              <div className="text-xs bg-[var(--bg-secondary)] rounded p-2 mb-2">
                <p className="text-[var(--text-muted)]">Structure: <span className="font-mono">{previews[sub.id].structure}</span></p>
                <p className="text-[var(--text-muted)] mt-0.5">Maps: {previews[sub.id].bspFiles.join(', ') || 'none'}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {MAP_TAGS.map(tag => (
                <label key={tag} className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(pendingTags[sub.id] ?? []).includes(tag)}
                    onChange={() =>
                      setPendingTags(pt => {
                        const current = pt[sub.id] ?? []
                        return {
                          ...pt,
                          [sub.id]: current.includes(tag)
                            ? current.filter(t => t !== tag)
                            : [...current, tag],
                        }
                      })
                    }
                  />
                  <span className="text-xs text-[var(--text-primary)]">{tag}</span>
                </label>
              ))}
            </div>
            <div className="flex items-start gap-2 mt-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(sub.id)}
                disabled={busy[sub.id]}
              >
                Approve
              </Button>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Rejection reason…"
                  value={rejecting[sub.id] ?? ''}
                  onChange={e => setRejecting(r => ({ ...r, [sub.id]: e.target.value }))}
                  className="flex-1 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-card)] text-[var(--text-primary)]"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleReject(sub.id)}
                  disabled={busy[sub.id] || !(rejecting[sub.id] ?? '').trim()}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
