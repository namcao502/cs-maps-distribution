'use client'
import { useState, useEffect, useCallback } from 'react'
import { UploadForm } from '@/components/UploadForm'
import { AdminMapList } from '@/components/AdminMapList'
import type { MapEntry } from '@/types/map'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [maps, setMaps] = useState<MapEntry[]>([])

  const loadMaps = useCallback(async () => {
    const res = await fetch('/api/maps')
    if (res.ok) setMaps(await res.json())
  }, [])

  // On mount, probe whether an existing admin_session cookie is still valid
  useEffect(() => {
    async function checkSession() {
      try {
        // A POST to /api/upload with empty body returns 400 if authed, 401 if not
        const res = await fetch('/api/upload', { method: 'POST', body: new FormData() })
        if (res.status !== 401) setAuthed(true)
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [])

  useEffect(() => {
    if (authed) loadMaps()
  }, [authed, loadMaps])

  if (checking) {
    return <main className="max-w-sm mx-auto px-4 py-24 text-center text-gray-400">Loading...</main>
  }

  if (!authed) {
    return (
      <main className="max-w-sm mx-auto px-4 py-24">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        <form
          onSubmit={async e => {
            e.preventDefault()
            setAuthError(null)
            const res = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password }),
            })
            if (res.ok) {
              setAuthed(true)
            } else {
              setAuthError('Incorrect password')
            }
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded-lg px-4 py-2 w-full"
          />
          <button type="submit" className="bg-black text-white rounded-lg py-2 font-medium hover:bg-gray-800">
            Login
          </button>
          {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
        </form>
      </main>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Admin — Upload Maps</h1>
      <UploadForm onUploaded={loadMaps} />
      <AdminMapList maps={maps} onDeleted={id => setMaps(prev => prev.filter(m => m.id !== id))} />
    </main>
  )
}
