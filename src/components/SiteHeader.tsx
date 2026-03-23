'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase-client'
import { ThemeToggle } from './ThemeToggle'
import { AuthButton } from './AuthButton'
import { NotificationBell } from './NotificationBell'

export function SiteHeader() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, setUser)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-card)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="shrink-0">
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight leading-none">CS 1.6 Maps</h1>
          </Link>
          <nav className="flex items-center gap-1">
            {[
              { href: '/', label: 'Maps' },
              ...(user ? [{ href: '/submissions', label: 'Submit' }] : []),
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <NotificationBell />
          <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
        </div>
      </div>
    </header>
  )
}
