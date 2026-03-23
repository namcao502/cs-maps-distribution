'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase-client'

export function AuthButton({ adminEmail }: { adminEmail: string }) {
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = onAuthStateChanged(auth, u => setUser(u))
    return () => unsubscribe()
  }, [])

  async function signIn() {
    const auth = getFirebaseAuth()
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const idToken = await result.user.getIdToken()
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      window.location.reload()
    } catch (err) {
      console.error('Sign-in failed:', err)
    }
  }

  async function signOut() {
    const auth = getFirebaseAuth()
    await firebaseSignOut(auth)
    await fetch('/api/auth/session', { method: 'DELETE' })
    setUser(null)
    window.location.reload()
  }

  if (!user) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors shadow-sm"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    )
  }

  const isAdmin = user.email === adminEmail

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-sm hover:bg-[var(--border)] active:scale-95 transition-all"
      >
        <img src={user.photoURL ?? undefined} alt="" className="w-7 h-7 rounded-full" />
        <span className="text-sm text-[var(--text-primary)] hidden sm:block">{user.displayName ?? user.email}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-lg z-20 py-1 overflow-hidden">
            {isAdmin ? (
              <>
                <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-[var(--bg-secondary)]">
                  Admin panel
                </Link>
                <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                  User page
                </Link>
              </>
            ) : (
              <>
                <Link href="/submissions" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
                  My Submissions
                </Link>
                <Link href="/submissions?new=1" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-[var(--bg-secondary)]">
                  Submit a Map
                </Link>
              </>
            )}
            <div className="border-t border-[var(--border)] my-1" />
            <button onClick={signOut} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
