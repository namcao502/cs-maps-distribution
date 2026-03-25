'use client'
import { AuthButton } from '@/components/submissions/AuthButton'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { INFO_SITE_TITLE, BTN_SUBMIT_MAP } from '@/lib/constants/messages'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center shrink-0 hover:opacity-80 transition-opacity">
          <span className="font-mono font-bold text-[var(--accent-orange)] tracking-widest text-sm">{INFO_SITE_TITLE}</span>
        </a>

        <div className="flex-1" />

        {/* Submit link */}
        <a
          href="/submissions"
          className="shrink-0 text-xs font-mono px-3 py-1.5 rounded border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-black transition-colors"
        >
          {BTN_SUBMIT_MAP}
        </a>

        {/* Auth utilities */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
        </div>
      </div>
    </header>
  )
}
