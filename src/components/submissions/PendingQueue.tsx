'use client'
import { useState, useEffect } from 'react'
import type { Submission } from '@/types/submission'
import { MAP_TAGS, TAG_LABELS } from '@/lib/maps/tags'
import { Button, Card, StatusBadge } from '@/components/ui'
import { useNotifications } from '@/lib/auth/notification-context'
import { MSG_SUBMISSION_APPROVED, MSG_SUBMISSION_REJECTED } from '@/lib/constants/messages'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PendingQueue({ onApproved }: { onApproved: () => void }) {
  const [queue, setQueue] = useState<Submission[]>([])
  const [rejecting, setRejecting] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [pendingTags, setPendingTags] = useState<Record<string, string[]>>({})
  const { push } = useNotifications()

  useEffect(() => {
    fetch('/api/admin/submissions?status=pending')
      .then(r => r.ok ? r.json() : [])
      .then((subs: Submission[]) => {
        setQueue(subs)
        const initial: Record<string, string[]> = {}
        subs.forEach(s => { initial[s.id] = s.tags ?? [] })
        setPendingTags(initial)
      })
  }, [])

  function toggleTag(id: string, tag: string) {
    setPendingTags(pt => {
      const current = pt[id] ?? []
      const withoutType = current.filter(t => !(MAP_TAGS as readonly string[]).includes(t))
      return {
        ...pt,
        [id]: current.includes(tag) ? withoutType : [...withoutType, tag],
      }
    })
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
      push(MSG_SUBMISSION_APPROVED, 'success')
      onApproved()
    } else {
      push((await res.json()).error ?? 'Approval failed', 'error')
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
      push(MSG_SUBMISSION_REJECTED, 'success')
    } else {
      push((await res.json()).error ?? 'Rejection failed', 'error')
      setBusy(b => ({ ...b, [id]: false }))
    }
  }

  if (queue.length === 0) return null

  return (
    <div>
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

            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md uppercase bg-[var(--bg-inset)] text-[var(--text-primary)]">{sub.format}</span>
              <span className="font-medium text-[var(--text-primary)]">{sub.originalName}</span>
              <span className="text-xs text-[var(--text-muted)]">{formatBytes(sub.size)}</span>
            </div>

            {/* Tag pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {MAP_TAGS.map(tag => {
                const active = (pendingTags[sub.id] ?? []).includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(sub.id, tag)}
                    className={`px-3 py-1 rounded text-xs font-mono border transition-colors ${
                      active
                        ? 'bg-[var(--accent-cyan)] text-black border-[var(--accent-cyan)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--accent-cyan)]'
                    }`}
                  >
                    {TAG_LABELS[tag]}
                  </button>
                )
              })}
            </div>

            {/* Reject reason + action buttons */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Rejection reason…"
                value={rejecting[sub.id] ?? ''}
                onChange={e => setRejecting(r => ({ ...r, [sub.id]: e.target.value }))}
                className="flex-1 border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-[var(--bg-surface)] text-[var(--text-primary)]"
              />
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApprove(sub.id)}
                disabled={busy[sub.id]}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReject(sub.id)}
                disabled={busy[sub.id] || !(rejecting[sub.id] ?? '').trim()}
              >
                Reject
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
