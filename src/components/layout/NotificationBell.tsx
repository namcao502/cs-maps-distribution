'use client'
import { useState } from 'react'
import { useNotifications, type Notification } from '@/lib/auth/notification-context'

function TimeStamp({ at }: { at: Date }) {
  return (
    <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
      {at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {at.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

function NotificationItem({ n }: { n: Notification }) {
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
  const { notifications, markAllRead, clear } = useNotifications()
  const [open, setOpen] = useState(false)
  const unread = notifications.filter(n => !n.read).length

  function toggle() {
    setOpen(o => !o)
    if (!open) markAllRead()
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-inset)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors"
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
          <div className="fixed right-4 top-14 w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl z-20 overflow-hidden">
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
