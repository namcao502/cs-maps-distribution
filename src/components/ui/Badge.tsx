import { type ReactNode } from 'react'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  default: 'bg-[var(--bg-inset)] text-[var(--text-primary)]',
  success: 'bg-[var(--bg-inset)] text-[var(--accent-green)]',
  warning: 'bg-[var(--bg-inset)] text-[var(--accent-orange)]',
  danger:  'bg-[var(--bg-inset)] text-[var(--color-danger)]',
  info:    'bg-[var(--bg-inset)] text-[var(--accent-cyan)]',
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
