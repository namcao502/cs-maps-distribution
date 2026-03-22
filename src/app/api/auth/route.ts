import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, signJWT, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  const hash = process.env.ADMIN_PASSWORD_HASH!
  const valid = await verifyPassword(password, hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = await signJWT({ role: 'admin' }, process.env.JWT_SECRET!)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
    path: '/',
  })
  return response
}
