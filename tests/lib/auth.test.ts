// Mock firebase-admin so the module import doesn't fail in Jest
jest.mock('@/lib/auth/firebase-admin', () => ({ adminAuth: {} }))

import { isAdmin } from '@/lib/auth/auth'

describe('isAdmin', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, ADMIN_GOOGLE_EMAIL: 'admin@example.com' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns true when user email matches ADMIN_GOOGLE_EMAIL', () => {
    expect(isAdmin({ email: 'admin@example.com' } as any)).toBe(true)
  })

  it('returns false when user email does not match', () => {
    expect(isAdmin({ email: 'other@example.com' } as any)).toBe(false)
  })

  it('returns false when user has no email', () => {
    expect(isAdmin({ email: undefined } as any)).toBe(false)
  })
})
