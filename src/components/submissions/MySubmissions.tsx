'use client'
import { useEffect, useState } from 'react'
import type { Submission } from '@/types/submission'
import { Button, StatusBadge } from '@/components/ui'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MySubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/submissions/mine')
      .then(r => r.ok ? r.json() : [])
      .then(setSubmissions)
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id: string) {
    const res = await fetch(`/api/submissions/${id}`, { method: 'DELETE' })
    if (res.ok) setSubmissions(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return <p className="text-[var(--text-muted)] text-sm">Loading...</p>
  if (submissions.length === 0) return <p className="text-[var(--text-muted)] text-sm">No submissions yet.</p>

  return (
    <div className="flex flex-col gap-2">
      {submissions.map(sub => (
        <div key={sub.id} className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl">
          <div className="min-w-0">
            <div>
              <span className="font-medium text-[var(--text-primary)]">{sub.originalName}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)] uppercase">{sub.format}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{formatBytes(sub.size)}</span>
            </div>
            {sub.rejectionReason && (
              <p className="text-xs text-red-500 mt-0.5">Reason: {sub.rejectionReason}</p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Submitted {new Date(sub.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <StatusBadge status={sub.status} />
            {sub.status === 'pending' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(sub.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
