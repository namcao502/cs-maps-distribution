import { cookies } from 'next/headers'
import { getAdminAuth } from './firebase-admin'

export interface SessionUser {
  /** Firebase UID — exposed as `id` for API route compatibility */
  id: string
  uid: string
  email: string
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
}

/** Returns the signed-in user, or null if no valid session cookie. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value
  if (!sessionCookie) return null

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true)
    return {
      id: decoded.uid,
      uid: decoded.uid,
      email: decoded.email ?? '',
      user_metadata: {
        full_name: (decoded.name as string) ?? undefined,
        avatar_url: (decoded.picture as string) ?? undefined,
      },
    }
  } catch {
    return null
  }
}

/** Returns true if the user is the designated admin account. */
export function isAdmin(user: SessionUser): boolean {
  return !!user.email && user.email === process.env.ADMIN_GOOGLE_EMAIL
}
