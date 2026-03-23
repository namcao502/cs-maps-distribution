'use client'
import type { ReactNode } from 'react'
import { useTheme } from '@/lib/theme-context'

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
)

const MonitorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <path d="M8 21h8M12 17v4"/>
  </svg>
)

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const CYCLE: Array<{ value: 'light' | 'system' | 'dark'; icon: ReactNode; label: string }> = [
  { value: 'light', icon: <SunIcon />, label: 'Light' },
  { value: 'system', icon: <MonitorIcon />, label: 'System' },
  { value: 'dark', icon: <MoonIcon />, label: 'Dark' },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const current = CYCLE.find(o => o.value === theme) ?? CYCLE[1]
  const next = CYCLE[(CYCLE.findIndex(o => o.value === theme) + 1) % CYCLE.length]

  return (
    <button
      onClick={() => setTheme(next.value)}
      title={`Theme: ${current.label} (click for ${next.label})`}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
    >
      {current.icon}
    </button>
  )
}
