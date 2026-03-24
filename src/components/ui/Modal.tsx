'use client'
import { type ReactNode } from 'react'

export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-sm shadow-[var(--shadow-md)] overflow-hidden">
        {children}
      </div>
    </div>
  )
}
