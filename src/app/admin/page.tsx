'use client'
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/auth/firebase-client'
import { UploadForm } from '@/components/admin/UploadForm'
import { AdminMapList } from '@/components/maps/AdminMapList'
import { PendingQueue } from '@/components/submissions/PendingQueue'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import type { MapEntry } from '@/types/map'
import { BTN_HOME, STATUS_LOADING, STATUS_ACCESS_DENIED, LABEL_UPLOAD_MAP, LABEL_MAP_LIST, LABEL_DASHBOARD } from '@/lib/constants/messages'

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [maps, setMaps] = useState<MapEntry[]>([])
  const [mapsLoading, setMapsLoading] = useState(true)

  const loadMaps = useCallback(async () => {
    setMapsLoading(true)
    const res = await fetch(`/api/admin/maps?t=${Date.now()}`)
    if (res.ok) setMaps(await res.json())
    setMapsLoading(false)
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
    <div className="min-h-screen bg-[var(--bg-base)]">
      <SiteHeader />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <a href="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mb-6 transition-colors">
          {BTN_HOME}
        </a>
        {checking ? (
          <p className="text-center py-20 text-[var(--text-muted)] text-sm">{STATUS_LOADING}</p>
        ) : !authed ? (
          <p className="text-center py-20 text-[var(--text-muted)] text-sm">{STATUS_ACCESS_DENIED}</p>
        ) : (
          <div className="flex flex-col gap-8">
            <PendingQueue onApproved={loadMaps} />
            <div>
              <h2 className="text-lg font-semibold mb-3">{LABEL_UPLOAD_MAP}</h2>
              <UploadForm onUploaded={loadMaps} />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">{LABEL_MAP_LIST}</h2>
              {mapsLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="h-14 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <AdminMapList
                  maps={maps}
                  onDeleted={() => loadMaps()}
                  onTagsUpdated={(id, tags) => setMaps(prev => prev.map(m => m.id === id ? { ...m, tags } : m))}
                  onHiddenUpdated={(id, hidden) => setMaps(prev => prev.map(m => m.id === id ? { ...m, hidden } : m))}
                  onScreenshotsUpdated={(id, keys) => setMaps(prev => prev.map(m => m.id === id ? { ...m, screenshotKeys: keys } : m))}
                  onReorder={newMaps => setMaps(newMaps)}
                />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3">{LABEL_DASHBOARD}</h2>
              <AdminDashboard />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
