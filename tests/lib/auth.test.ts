import { verifyPassword, signJWT, verifyJWT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('returns false for wrong password', async () => {
    const hash = await bcrypt.hash('secret123', 10)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})

describe('JWT', () => {
  const secret = 'test-secret-that-is-at-least-32-chars-long'

  it('signs and verifies a token', async () => {
    const token = await signJWT({ role: 'admin' }, secret)
    const payload = await verifyJWT(token, secret)
    expect(payload.role).toBe('admin')
  })

  it('throws for tampered token', async () => {
    const token = await signJWT({ role: 'admin' }, secret)
    await expect(verifyJWT(token + 'x', secret)).rejects.toThrow()
  })

  it('throws for expired token', async () => {
    const token = await signJWT({ role: 'admin' }, secret, '-1s')
    await expect(verifyJWT(token, secret)).rejects.toThrow()
  })
})
