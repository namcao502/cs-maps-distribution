import { type ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-sm)] ${className}`}>
      {children}
    </div>
  )
}
