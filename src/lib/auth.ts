import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export function createAuthClient(cookieStore: ReadonlyRequestCookies): SupabaseClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch { /* ignore in read-only contexts */ }
          })
        },
      },
    },
  )
}

/** Returns the signed-in Supabase user, or null if no session. */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createAuthClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Returns true if the user is the designated admin account. */
export function isAdmin(user: User): boolean {
  return !!user.email && user.email === process.env.ADMIN_GOOGLE_EMAIL
}
