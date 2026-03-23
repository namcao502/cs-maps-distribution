'use client'
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase-client'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import { PendingQueue } from '@/components/PendingQueue'
import { PackManager } from '@/components/PackManager'
import { SiteHeader } from '@/components/SiteHeader'
import type { MapEntry } from '@/types/map'

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [maps, setMaps] = useState<MapEntry[]>([])

  const loadMaps = useCallback(async () => {
    const res = await fetch(`/api/admin/maps?t=${Date.now()}`)
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
      <SiteHeader />

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
            <AdminMapList
              maps={maps}
              onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))}
              onTagsUpdated={(id, tags) => setMaps(prev => prev.map(m => m.id === id ? { ...m, tags } : m))}
              onHiddenUpdated={(id, hidden) => setMaps(prev => prev.map(m => m.id === id ? { ...m, hidden } : m))}
            />
            <PackManager maps={maps} />
          </>
        )}
      </main>
    </div>
  )
}
