'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/auth/firebase-client'
import { AuthButton } from '@/components/submissions/AuthButton'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { SearchInput } from '@/components/maps/SearchInput'
import { FILTER_TABS, type FilterTab } from '@/lib/maps/tags'

interface SiteHeaderProps {
  installedCount: number
  totalCount: number
  query: string
  onQueryChange: (q: string) => void
  activeTab: FilterTab
  onTabChange: (tab: FilterTab) => void
}

export function SiteHeader({
  installedCount,
  totalCount,
  query,
  onQueryChange,
  activeTab,
  onTabChange,
}: SiteHeaderProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, setUser)
  }, [])

  // Suppress unused variable warning — user state drives future auth-gated UI
  void user

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono font-bold text-[var(--accent-orange)] tracking-widest text-sm">CS MAPS</span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--accent-cyan)] border border-[var(--border)]">
            {totalCount}
          </span>
        </div>

        {/* Search */}
        <div className="flex-1">
          <SearchInput value={query} onChange={onQueryChange} />
        </div>

        {/* Filter tabs */}
        <nav className="flex items-center shrink-0">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold transition-colors border-b-2 ${
                activeTab === tab.value
                  ? 'text-[var(--accent-cyan)] border-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Installed counter */}
        <span className="text-xs font-mono text-[var(--text-muted)] shrink-0 border border-[var(--border)] px-2 py-1 rounded">
          <span className="text-[var(--accent-green)]">{installedCount}</span>
          {' / '}{totalCount}{' '}
          <span className="text-[var(--accent-green)]">installed</span>
        </span>

        {/* Auth utilities */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
        </div>
      </div>
    </header>
  )
}
