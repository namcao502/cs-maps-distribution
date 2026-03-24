'use client'
import { useState, useEffect } from 'react'
import { useNotifications, type Notification } from '@/lib/auth/notification-context'
import type { InstallStatus } from '@/lib/install'
import { Spinner } from '@/components/ui'

function PhaseLabel({ status }: { status: InstallStatus }) {
  if (status.phase === 'downloading') return <span>Downloading… {Math.round(status.progress * 100)}%</span>
  if (status.phase === 'verifying') return <span>Verifying…</span>
  if (status.phase === 'extracting') return <span>Extracting…</span>
  if (status.phase === 'writing') return <span>Installing… {status.done}/{status.total} files</span>
  if (status.phase === 'done') return <span className="text-green-500">Installed ✓</span>
  if (status.phase === 'error') return <span className="text-red-500">Failed: {status.message}</span>
  return null
}

function ProgressBar({ status }: { status: InstallStatus }) {
  let pct = 0
  if (status.phase === 'downloading') pct = status.progress * 100
  else if (status.phase === 'verifying' || status.phase === 'extracting') pct = 100
  else if (status.phase === 'writing') pct = (status.done / status.total) * 100
  else if (status.phase === 'done') pct = 100

  const active = status.phase !== 'done' && status.phase !== 'error'
  if (!active && status.phase !== 'done') return null

  return (
    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1 mt-1.5">
      <div
        className={`h-1 rounded-full transition-all duration-200 ${status.phase === 'done' ? 'bg-green-500' : 'bg-blue-500'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function TimeStamp({ at }: { at: Date }) {
  return (
    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
      {at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

function NotificationItem({ n }: { n: Notification }) {
  if (n.type === 'progress') {
    const active = n.status.phase !== 'done' && n.status.phase !== 'error'
    return (
      <li className="px-4 py-3 border-b border-[var(--border)] last:border-0">
        <div className="flex items-center gap-2">
          {active && <Spinner size="sm" />}
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{n.mapName}</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5"><PhaseLabel status={n.status} /></p>
        <ProgressBar status={n.status} />
        <TimeStamp at={n.at} />
      </li>
    )
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0">
      <span className={`mt-0.5 shrink-0 text-sm ${n.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
        {n.type === 'success' ? '✓' : '✗'}
      </span>
      <div>
        <span className="text-sm text-[var(--text-primary)]">{n.message}</span>
        <TimeStamp at={n.at} />
      </div>
    </li>
  )
}

export function NotificationBell() {
  const { notifications, activeInstallId, markAllRead, clear } = useNotifications()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (activeInstallId) setOpen(true)
  }, [activeInstallId])

  function toggle() {
    setOpen(o => !o)
    if (!open) markAllRead()
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
        title="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-72 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
              <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
              {notifications.length > 0 && (
                <button onClick={clear} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  Clear all
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[var(--text-muted)] text-center">No notifications yet</p>
            ) : (
              <ul className="max-h-72 overflow-y-auto">
                {notifications.map(n => <NotificationItem key={n.id} n={n} />)}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
