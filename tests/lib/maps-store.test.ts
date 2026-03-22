import { getMaps, addMap, removeMap } from '@/lib/maps-store'
import type { MapEntry } from '@/types/map'

// Declared with var so they are hoisted and accessible within jest.mock factory
/* eslint-disable no-var */
var mockOrder: jest.Mock
var mockSelect: jest.Mock
var mockInsert: jest.Mock
var mockDelete: jest.Mock
var mockEq: jest.Mock
var mockFrom: jest.Mock
/* eslint-enable no-var */

// The supabase client is created at module load time. We give it an object whose
// `from` method delegates to mockFrom at call time, so reassigning mockFrom in
// beforeEach is reflected correctly.
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

const sampleRow = {
  id: 'test-uuid-1',
  original_name: 'de_dust2',
  storage_key: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploaded_at: '2026-03-22T12:00:00Z',
  uploader_id: null,
  uploader_name: null,
  uploader_avatar: null,
}

const sampleMap: MapEntry = {
  id: 'test-uuid-1',
  originalName: 'de_dust2',
  storageKey: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
}

beforeEach(() => {
  mockOrder = jest.fn()
  mockSelect = jest.fn()
  mockInsert = jest.fn()
  mockDelete = jest.fn()
  mockEq = jest.fn()
  mockFrom = jest.fn()

  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockEq.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ error: null })
  mockDelete.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
  })
})

describe('getMaps', () => {
  it('returns empty array when table is empty', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    expect(await getMaps()).toEqual([])
  })

  it('maps snake_case row to camelCase MapEntry', async () => {
    mockOrder.mockResolvedValue({ data: [sampleRow], error: null })
    const maps = await getMaps()
    expect(maps[0]).toEqual(sampleMap)
  })

  it('populates uploader field when uploader_id is present', async () => {
    const rowWithUploader = {
      ...sampleRow,
      uploader_id: 'user-1',
      uploader_name: 'Alice',
      uploader_avatar: 'https://example.com/avatar.jpg',
    }
    mockOrder.mockResolvedValue({ data: [rowWithUploader], error: null })
    const maps = await getMaps()
    expect(maps[0].uploader).toEqual({ id: 'user-1', name: 'Alice', avatar: 'https://example.com/avatar.jpg' })
  })
})

describe('addMap', () => {
  it('inserts a row with correct snake_case fields', async () => {
    await addMap(sampleMap)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-uuid-1',
      original_name: 'de_dust2',
      storage_key: 'archives/test-uuid-1.zip',
      uploader_id: null,
    }))
  })
})

describe('removeMap', () => {
  it('deletes by id', async () => {
    await removeMap('test-uuid-1')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', 'test-uuid-1')
  })
})
