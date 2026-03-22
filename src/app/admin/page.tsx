'use client'
import { useState, useEffect, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase-client'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import { PendingQueue } from '@/components/PendingQueue'
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

  if (checking) return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Loading...</main>
  if (!authed) return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Access denied.</main>

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <PendingQueue onApproved={loadMaps} />
      <h2 className="text-lg font-semibold mb-3">Upload Map</h2>
      <UploadForm onUploaded={loadMaps} />
      <AdminMapList maps={maps} onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))} />
    </main>
  )
}
