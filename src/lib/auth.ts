import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export const COOKIE_NAME = 'admin_session'
const DEFAULT_TTL = '24h'

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
  expirationTime: string = DEFAULT_TTL
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key)
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key)
  return payload
}

export async function verifyAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  try {
    const secret = process.env.JWT_SECRET!
    await verifyJWT(cookieValue, secret)
    return true
  } catch {
    return false
  }
}
