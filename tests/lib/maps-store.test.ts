import { getMaps, addMap, removeMap, getMapSha256s, reorderMaps } from '@/lib/maps/maps-store'
import type { MapEntry } from '@/types/map'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockDelete = jest.fn()
const mockSelect = jest.fn()
const mockOrderBy = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()
const mockBatch = jest.fn()
const mockBatchUpdate = jest.fn()
const mockBatchCommit = jest.fn()
const mockUpdate = jest.fn()

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({
    collection: mockCollection,
    batch: mockBatch,
  })),
}))

const sampleEntry: MapEntry = {
  id: 'test-uuid-1',
  originalName: 'de_dust2',
  storageKey: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
  installCount: 0,
  tags: [],
  hidden: false,
  screenshotKeys: [],
}

const sampleDocData = {
  originalName: 'de_dust2',
  storageKey: 'archives/test-uuid-1.zip',
  format: 'zip',
  size: 1000,
  sha256: 'abc123',
  uploadedAt: '2026-03-22T12:00:00Z',
  uploaderId: null,
  uploaderName: null,
  uploaderAvatar: null,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue({ docs: [] })
  mockSet.mockResolvedValue(undefined)
  mockDelete.mockResolvedValue(undefined)
  mockOrderBy.mockReturnValue({ get: mockGet })
  mockSelect.mockReturnValue({ get: mockGet })
  mockUpdate.mockResolvedValue(undefined)
  mockDoc.mockReturnValue({ set: mockSet, delete: mockDelete, update: mockUpdate })
  mockCollection.mockReturnValue({ get: mockGet, orderBy: mockOrderBy, doc: mockDoc, select: mockSelect })
  mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit })
  mockBatchCommit.mockResolvedValue(undefined)
  mockBatchUpdate.mockReturnValue(undefined)
})

describe('getMaps', () => {
  it('returns empty array when collection is empty', async () => {
    expect(await getMaps()).toEqual([])
  })

  it('maps Firestore doc to MapEntry', async () => {
    mockGet.mockResolvedValue({
      docs: [{ id: 'test-uuid-1', data: () => sampleDocData }],
    })
    const maps = await getMaps()
    expect(maps[0]).toEqual(sampleEntry)
  })

  it('populates uploader field when uploaderId is present', async () => {
    mockGet.mockResolvedValue({
      docs: [{
        id: 'test-uuid-1',
        data: () => ({
          ...sampleDocData,
          uploaderId: 'user-1',
          uploaderName: 'Alice',
          uploaderAvatar: 'https://example.com/avatar.jpg',
        }),
      }],
    })
    const maps = await getMaps()
    expect(maps[0].uploader).toEqual({ id: 'user-1', name: 'Alice', avatar: 'https://example.com/avatar.jpg' })
  })
})

describe('addMap', () => {
  it('sets a doc with correct fields', async () => {
    await addMap(sampleEntry)
    expect(mockDoc).toHaveBeenCalledWith('test-uuid-1')
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      originalName: 'de_dust2',
      storageKey: 'archives/test-uuid-1.zip',
      uploaderId: null,
    }))
  })
})

describe('removeMap', () => {
  it('deletes by id', async () => {
    await removeMap('test-uuid-1')
    expect(mockDoc).toHaveBeenCalledWith('test-uuid-1')
    expect(mockDelete).toHaveBeenCalled()
  })
})

describe('getMapSha256s', () => {
  it('returns sha256 values from docs', async () => {
    mockGet.mockResolvedValue({
      docs: [{ data: () => ({ sha256: 'abc123' }) }],
    })
    const result = await getMapSha256s()
    expect(result).toEqual(['abc123'])
  })
})

describe('getMaps sort order', () => {
  it('puts maps with order before maps without order', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'b', data: () => ({ ...sampleDocData, originalName: 'cs_assault', order: 1 }) },
        { id: 'c', data: () => ({ ...sampleDocData, originalName: 'de_nuke' }) },
        { id: 'a', data: () => ({ ...sampleDocData, originalName: 'de_dust2', order: 0 }) },
      ],
    })
    const maps = await getMaps()
    expect(maps[0].originalName).toBe('de_dust2')    // order: 0
    expect(maps[1].originalName).toBe('cs_assault')  // order: 1
    expect(maps[2].originalName).toBe('de_nuke')     // no order
  })
})

describe('reorderMaps', () => {
  it('batch-updates each id with its index as order', async () => {
    const ids = ['id-a', 'id-b', 'id-c']
    await reorderMaps(ids)
    expect(mockBatch).toHaveBeenCalled()
    expect(mockBatchUpdate).toHaveBeenCalledTimes(3)
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 0 })
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 1 })
    expect(mockBatchUpdate).toHaveBeenCalledWith(expect.anything(), { order: 2 })
    expect(mockBatchCommit).toHaveBeenCalled()
  })
})
