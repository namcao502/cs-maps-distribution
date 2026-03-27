'use client'
import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

const BASE = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-[var(--accent-cyan)] hover:brightness-90 text-white focus-visible:ring-[var(--accent-cyan)]',
  secondary: 'bg-[var(--bg-inset)] hover:bg-[var(--border)] text-[var(--text-primary)] focus-visible:ring-[var(--border)]',
  ghost:     'hover:bg-[var(--bg-inset)] text-[var(--text-primary)] focus-visible:ring-[var(--border)]',
  danger:    'bg-[var(--color-danger)] hover:brightness-90 text-white focus-visible:ring-[var(--color-danger)]',
  success:   'bg-[var(--accent-green)] hover:brightness-90 text-white focus-visible:ring-[var(--accent-green)]',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
