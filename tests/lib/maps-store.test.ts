import { getMaps, addMap, removeMap } from '@/lib/maps-store'
import type { MapEntry } from '@/types/map'

jest.mock('@/lib/r2', () => ({
  getObject: jest.fn(),
  putObject: jest.fn(),
}))

import { getObject, putObject } from '@/lib/r2'
const mockGet = getObject as jest.Mock
const mockPut = putObject as jest.Mock

const sampleMap: MapEntry = {
  id: 'test-uuid-1',
  originalName: 'de_dust2',
  r2Key: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
}

beforeEach(() => jest.clearAllMocks())

describe('getMaps', () => {
  it('returns empty array when maps.json does not exist', async () => {
    mockGet.mockResolvedValue(null)
    expect(await getMaps()).toEqual([])
  })

  it('returns parsed maps from maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    const maps = await getMaps()
    expect(maps).toHaveLength(1)
    expect(maps[0].id).toBe('test-uuid-1')
  })
})

describe('addMap', () => {
  it('appends entry and writes maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([]))
    await addMap(sampleMap)
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([sampleMap]),
      'application/json'
    )
  })
})

describe('removeMap', () => {
  it('removes entry by id and writes maps.json', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    await removeMap('test-uuid-1')
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([]),
      'application/json'
    )
  })

  it('is a no-op when id not found', async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMap]))
    await removeMap('nonexistent-id')
    expect(mockPut).toHaveBeenCalledWith(
      'maps.json',
      JSON.stringify([sampleMap]),
      'application/json'
    )
  })
})
