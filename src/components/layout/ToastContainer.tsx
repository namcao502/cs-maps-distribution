'use client'
import { useNotifications } from '@/lib/auth/notification-context'

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-14 w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl z-20 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
        <button
          onClick={() => toasts.forEach(t => dismissToast(t.id))}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Clear all
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {toasts.map(t => (
          <li key={t.id} className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0">
            <span className={`mt-0.5 shrink-0 text-sm ${t.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {t.type === 'success' ? '✓' : '✗'}
            </span>
            <span className="text-sm text-[var(--text-primary)] flex-1">{t.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
