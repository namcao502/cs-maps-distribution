import { mergeRecentActivity } from '@/lib/admin/stats-store'

describe('mergeRecentActivity', () => {
  it('merges and sorts events by timestamp desc', () => {
    const reviewed = [
      { type: 'approved' as const, mapName: 'de_dust2', at: '2026-03-22T10:00:00Z' },
      { type: 'rejected' as const, mapName: 'junk', at: '2026-03-21T08:00:00Z' },
    ]
    const uploaded = [
      { type: 'uploaded' as const, mapName: 'de_nuke', at: '2026-03-22T11:00:00Z' },
    ]
    const result = mergeRecentActivity(reviewed, uploaded, 10)
    expect(result).toEqual([
      { type: 'uploaded', mapName: 'de_nuke', at: '2026-03-22T11:00:00Z' },
      { type: 'approved', mapName: 'de_dust2', at: '2026-03-22T10:00:00Z' },
      { type: 'rejected', mapName: 'junk', at: '2026-03-21T08:00:00Z' },
    ])
  })

  it('slices to the given limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      type: 'approved' as const,
      mapName: `map${i}`,
      at: `2026-03-${String(20 - i).padStart(2, '0')}T00:00:00Z`,
    }))
    expect(mergeRecentActivity(many, [], 5)).toHaveLength(5)
  })

  it('returns empty array when both inputs are empty', () => {
    expect(mergeRecentActivity([], [], 10)).toEqual([])
  })
})
