'use client'
import { useNotifications, type Toast } from '@/lib/auth/notification-context'

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm min-w-64 max-w-80 bg-[var(--bg-surface)] ${
        toast.type === 'success'
          ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
          : 'border-[var(--accent-red)] text-[var(--accent-red)]'
      }`}
    >
      <span className="shrink-0 mt-0.5 font-bold">{toast.type === 'success' ? '✓' : '✗'}</span>
      <span className="flex-1 text-[var(--text-primary)]">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors leading-none mt-0.5"
      >
        ✕
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useNotifications()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  )
}
