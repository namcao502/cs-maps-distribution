'use client'
import { useEffect, useState } from 'react'
import type { Submission } from '@/types/submission'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
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

  if (loading) return <p className="text-[var(--text-muted)] text-sm">Loading...</p>
  if (submissions.length === 0) return <p className="text-[var(--text-muted)] text-sm">No submissions yet.</p>

  return (
    <div className="flex flex-col gap-2">
      {submissions.map(sub => (
        <div key={sub.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-[var(--text-primary)]">{sub.originalName}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)] uppercase">{sub.format}</span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{formatBytes(sub.size)}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[sub.status]}`}>
              {sub.status}
            </span>
          </div>
          {sub.rejectionReason && (
            <p className="text-xs text-red-500 mt-1">Reason: {sub.rejectionReason}</p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Submitted {new Date(sub.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
      ))}
    </div>
  )
}
