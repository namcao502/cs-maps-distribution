jest.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(),
}))

jest.mock('firebase-admin/firestore', () => ({
  AggregateField: {
    count: jest.fn(() => 'count'),
    sum: jest.fn(() => 'sum'),
  },
}))

import { getAdminStats } from '@/lib/admin/stats-store'
import { getAdminDb } from '@/lib/auth/firebase-admin'

function makeChainable(getResult: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = {}
  const self = () => q
  q.aggregate = jest.fn(self)
  q.where = jest.fn(self)
  q.orderBy = jest.fn(self)
  q.limit = jest.fn(self)
  q.count = jest.fn(self)
  q.get = jest.fn().mockResolvedValue(getResult)
  return q
}

describe('getAdminStats / fetchStats', () => {
  it('returns aggregated stats from Firestore', async () => {
    const mockDb = {
      collection: jest.fn()
        // 1. maps aggregate
        .mockReturnValueOnce(makeChainable({
          data: () => ({ totalMaps: 10, totalInstalls: 500 }),
        }))
        // 2. submissions pending count
        .mockReturnValueOnce(makeChainable({
          data: () => ({ count: 3 }),
        }))
        // 3. top maps
        .mockReturnValueOnce(makeChainable({
          docs: [
            { id: 'm1', data: () => ({ originalName: 'de_dust2', installCount: 100 }) },
            { id: 'm2', data: () => ({ originalName: 'de_nuke', installCount: 80 }) },
          ],
        }))
        // 4. reviewed submissions
        .mockReturnValueOnce(makeChainable({
          docs: [
            { id: 's1', data: () => ({ status: 'approved', originalName: 'de_cbble', reviewedAt: '2026-03-20T10:00:00Z' }) },
            { id: 's2', data: () => ({ status: 'rejected', originalName: 'junk', reviewedAt: '2026-03-19T08:00:00Z' }) },
            // doc without reviewedAt should be filtered out
            { id: 's3', data: () => ({ status: 'approved', originalName: 'de_train', reviewedAt: null }) },
          ],
        }))
        // 5. admin-direct uploaded maps
        .mockReturnValueOnce(makeChainable({
          docs: [
            { id: 'm3', data: () => ({ originalName: 'de_aztec', uploadedAt: '2026-03-21T12:00:00Z' }) },
          ],
        })),
    }
    ;(getAdminDb as jest.Mock).mockReturnValue(mockDb)

    const stats = await getAdminStats()

    expect(stats.totalMaps).toBe(10)
    expect(stats.totalInstalls).toBe(500)
    expect(stats.pendingSubmissions).toBe(3)
    expect(stats.topMaps).toHaveLength(2)
    expect(stats.topMaps[0]).toEqual({ id: 'm1', originalName: 'de_dust2', installCount: 100 })
    // recentActivity: approved + rejected (s3 filtered), uploaded → 3 events sorted desc
    expect(stats.recentActivity).toHaveLength(3)
    expect(stats.recentActivity[0].type).toBe('uploaded') // 2026-03-21 is latest
  })

  it('defaults totalInstalls to 0 when null', async () => {
    const mockDb = {
      collection: jest.fn()
        .mockReturnValueOnce(makeChainable({ data: () => ({ totalMaps: 0, totalInstalls: null }) }))
        .mockReturnValueOnce(makeChainable({ data: () => ({ count: 0 }) }))
        .mockReturnValueOnce(makeChainable({ docs: [] }))
        .mockReturnValueOnce(makeChainable({ docs: [] }))
        .mockReturnValueOnce(makeChainable({ docs: [] })),
    }
    ;(getAdminDb as jest.Mock).mockReturnValue(mockDb)

    const stats = await getAdminStats()
    expect(stats.totalInstalls).toBe(0)
    expect(stats.recentActivity).toEqual([])
  })

  it('defaults installCount to 0 when missing from top map doc', async () => {
    const mockDb = {
      collection: jest.fn()
        .mockReturnValueOnce(makeChainable({ data: () => ({ totalMaps: 1, totalInstalls: 0 }) }))
        .mockReturnValueOnce(makeChainable({ data: () => ({ count: 0 }) }))
        .mockReturnValueOnce(makeChainable({
          docs: [{ id: 'm1', data: () => ({ originalName: 'de_dust2', installCount: undefined }) }],
        }))
        .mockReturnValueOnce(makeChainable({ docs: [] }))
        .mockReturnValueOnce(makeChainable({ docs: [] })),
    }
    ;(getAdminDb as jest.Mock).mockReturnValue(mockDb)

    const stats = await getAdminStats()
    expect(stats.topMaps[0].installCount).toBe(0)
  })
})
