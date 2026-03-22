'use client'
import { useState, useEffect } from 'react'
import type { Submission } from '@/types/submission'

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
    const res = await fetch(`/api/admin/submissions/${id}/approve`, { method: 'POST' })
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
          <div key={sub.id} className="bg-white border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <img src={sub.submitterAvatar} alt="" className="w-6 h-6 rounded-full" />
              <span className="text-sm text-slate-600">{sub.submitterName}</span>
              <span className="text-xs text-slate-400 ml-auto">
                {new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md uppercase bg-slate-100 text-slate-600">{sub.format}</span>
              <span className="font-medium text-slate-900">{sub.originalName}</span>
              <span className="text-xs text-slate-400">{formatBytes(sub.size)}</span>
            </div>

            <button
              onClick={() => loadPreview(sub.id)}
              className="text-xs text-blue-500 hover:text-blue-700 mb-2"
            >
              {previews[sub.id] ? '▼ Archive preview' : '▶ Load archive preview'}
            </button>

            {previews[sub.id] && (
              <div className="text-xs bg-slate-50 rounded p-2 mb-2">
                <p className="text-slate-500">Structure: <span className="font-mono">{previews[sub.id].structure}</span></p>
                <p className="text-slate-500 mt-0.5">Maps: {previews[sub.id].bspFiles.join(', ') || 'none'}</p>
              </div>
            )}

            <div className="flex items-start gap-2 mt-2">
              <button
                onClick={() => handleApprove(sub.id)}
                disabled={busy[sub.id]}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                Approve
              </button>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Rejection reason…"
                  value={rejecting[sub.id] ?? ''}
                  onChange={e => setRejecting(r => ({ ...r, [sub.id]: e.target.value }))}
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => handleReject(sub.id)}
                  disabled={busy[sub.id] || !(rejecting[sub.id] ?? '').trim()}
                  className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
