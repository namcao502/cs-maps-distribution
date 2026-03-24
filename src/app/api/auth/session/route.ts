import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminAuth } from '@/lib/auth/firebase-admin'

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST(request: NextRequest) {
  const { idToken } = await request.json()
  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
  }

  try {
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    })

    const response = NextResponse.json({ status: 'ok' })
    response.cookies.set('__session', sessionCookie, {
      maxAge: FIVE_DAYS_MS / 1000,
      httpOnly: true,
      secure: IS_PROD,
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'ok' })
  response.cookies.set('__session', '', {
    maxAge: 0,
    httpOnly: true,
    secure: IS_PROD,
    path: '/',
  })
  return response
}
