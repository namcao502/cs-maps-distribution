'use client'
import { type ReactNode } from 'react'

interface ModalProps {
  children: ReactNode
  title?: string
  onClose?: () => void
}

export function Modal({ children, title, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-sm overflow-hidden">
        {(title || onClose) && (
          <div className="flex items-center justify-between px-6 pt-5 pb-0">
            {title && <h2 className="font-semibold text-[var(--text-primary)] text-base">{title}</h2>}
            {onClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-inset)] transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
