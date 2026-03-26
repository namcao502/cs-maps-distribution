jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminAuth: jest.fn(),
  getAdminDb: jest.fn(),
}))

import { cookies } from 'next/headers'
import { getAdminAuth } from '@/lib/auth/firebase-admin'
import { getSessionUser } from '@/lib/auth/auth'

const mockVerify = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(getAdminAuth as jest.Mock).mockReturnValue({ verifySessionCookie: mockVerify })
})

describe('getSessionUser', () => {
  it('returns null when no session cookie present', async () => {
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => undefined })
    expect(await getSessionUser()).toBeNull()
  })

  it('returns user when cookie is valid', async () => {
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'valid-token' }) })
    mockVerify.mockResolvedValue({
      uid: 'user-1',
      email: 'user@example.com',
      name: 'Alice Smith',
      picture: 'https://example.com/pic.jpg',
    })
    const user = await getSessionUser()
    expect(user).toEqual({
      id: 'user-1',
      uid: 'user-1',
      email: 'user@example.com',
      user_metadata: {
        full_name: 'Alice Smith',
        avatar_url: 'https://example.com/pic.jpg',
      },
    })
  })

  it('returns user with empty email when email is missing', async () => {
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'valid-token' }) })
    mockVerify.mockResolvedValue({ uid: 'user-2', email: undefined, name: undefined, picture: undefined })
    const user = await getSessionUser()
    expect(user?.email).toBe('')
    expect(user?.user_metadata.full_name).toBeUndefined()
  })

  it('returns null when cookie verification throws', async () => {
    ;(cookies as jest.Mock).mockResolvedValue({ get: () => ({ value: 'bad-token' }) })
    mockVerify.mockRejectedValue(new Error('Invalid cookie'))
    expect(await getSessionUser()).toBeNull()
  })
})
