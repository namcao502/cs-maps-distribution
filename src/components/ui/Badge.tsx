import { type ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  default: 'bg-[var(--bg-secondary)] text-[var(--text-primary)]',
  success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger-muted)] text-[var(--color-danger)]',
  info:    'bg-[var(--color-info-muted)] text-[var(--color-info)]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-0.5 text-sm',
}

export function Badge({
  variant = 'default',
  size = 'sm',
  children,
  className = '',
}: {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-md uppercase tracking-wide ${VARIANTS[variant]} ${SIZES[size]} ${className}`}>
      {children}
    </span>
  )
}
