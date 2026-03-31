import { getDailyPick, setDailyPick, clearDailyPick } from '@/lib/maps/daily-pick-store'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockDelete = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({ collection: mockCollection })),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockDoc.mockReturnValue({ get: mockGet, set: mockSet, delete: mockDelete })
  mockCollection.mockReturnValue({ doc: mockDoc })
})

describe('getDailyPick', () => {
  it('returns null when doc does not exist', async () => {
    mockGet.mockResolvedValue({ exists: false })
    expect(await getDailyPick()).toBeNull()
  })

  it('returns null when setAt is 2 days ago (expired)', async () => {
    const twoDaysAgo = new Date()
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2)
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ mapId: 'map-1', caption: '', setAt: twoDaysAgo.toISOString() }),
    })
    expect(await getDailyPick()).toBeNull()
  })

  it('returns pick when setAt is today (UTC)', async () => {
    const now = new Date().toISOString()
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ mapId: 'map-1', caption: 'Good map', setAt: now }),
    })
    const result = await getDailyPick()
    expect(result).toEqual({ mapId: 'map-1', caption: 'Good map', setAt: now })
  })

  it('returns pick when setAt is yesterday (within 2-day window)', async () => {
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const iso = yesterday.toISOString()
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ mapId: 'map-2', caption: 'Still active', setAt: iso }),
    })
    const result = await getDailyPick()
    expect(result).toEqual({ mapId: 'map-2', caption: 'Still active', setAt: iso })
  })
})

describe('setDailyPick', () => {
  it('writes mapId, caption, and a current ISO timestamp to config/daily-pick', async () => {
    mockSet.mockResolvedValue(undefined)
    const before = Date.now()
    await setDailyPick('map-1', 'Great map')
    const after = Date.now()
    expect(mockCollection).toHaveBeenCalledWith('config')
    expect(mockDoc).toHaveBeenCalledWith('daily-pick')
    const written = mockSet.mock.calls[0][0]
    expect(written.mapId).toBe('map-1')
    expect(written.caption).toBe('Great map')
    expect(new Date(written.setAt).getTime()).toBeGreaterThanOrEqual(before)
    expect(new Date(written.setAt).getTime()).toBeLessThanOrEqual(after)
  })
})

describe('clearDailyPick', () => {
  it('deletes config/daily-pick', async () => {
    mockDelete.mockResolvedValue(undefined)
    await clearDailyPick()
    expect(mockCollection).toHaveBeenCalledWith('config')
    expect(mockDoc).toHaveBeenCalledWith('daily-pick')
    expect(mockDelete).toHaveBeenCalled()
  })
})
