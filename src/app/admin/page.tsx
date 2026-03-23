'use client'
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase-client'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import { PendingQueue } from '@/components/PendingQueue'
import { AuthButton } from '@/components/AuthButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import Link from 'next/link'
import type { MapEntry } from '@/types/map'

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [maps, setMaps] = useState<MapEntry[]>([])

  const loadMaps = useCallback(async () => {
    const res = await fetch(`/api/maps?t=${Date.now()}`)
    if (res.ok) setMaps(await res.json())
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, user => {
      const email = user?.email ?? ''
      const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
      setAuthed(isAdmin)
      setChecking(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (authed) loadMaps()
  }, [authed, loadMaps])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">CS 1.6 Maps</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Admin panel</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--border)] active:scale-95 transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              User page
            </Link>
            <ThemeToggle />
            <AuthButton adminEmail={process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? ''} />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {checking ? (
          <p className="text-center py-20 text-[var(--text-muted)] text-sm">Loading...</p>
        ) : !authed ? (
          <p className="text-center py-20 text-[var(--text-muted)] text-sm">Access denied.</p>
        ) : (
          <>
            <PendingQueue onApproved={loadMaps} />
            <h2 className="text-lg font-semibold mb-3">Upload Map</h2>
            <UploadForm onUploaded={loadMaps} />
            <AdminMapList maps={maps} onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))} />
          </>
        )}
      </main>
    </div>
  )
}
