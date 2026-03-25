'use client'
import { useEffect, useState } from 'react'
import { StatsRow } from './StatsRow'
import { TopMaps } from './TopMaps'
import { ActivityFeed } from './ActivityFeed'
import type { ActivityEvent } from '@/lib/admin/stats-store'

interface Stats {
  totalMaps: number
  totalInstalls: number
  pendingSubmissions: number
  topMaps: Array<{ id: string; originalName: string; installCount: number }>
  recentActivity: ActivityEvent[]
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <p className="text-xs text-[var(--text-muted)]">Could not load dashboard stats.</p>
    )
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <StatsRow
        totalMaps={stats.totalMaps}
        totalInstalls={stats.totalInstalls}
        pendingSubmissions={stats.pendingSubmissions}
      />
      <TopMaps maps={stats.topMaps} />
      <ActivityFeed events={stats.recentActivity} />
    </div>
  )
}
