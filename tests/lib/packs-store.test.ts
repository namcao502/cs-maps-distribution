import { getPacks, addPack, removePack } from '@/lib/packs-store'
import type { MapPack } from '@/types/pack'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockDelete = jest.fn()
const mockOrderBy = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({ collection: mockCollection })),
}))

const samplePack: MapPack = {
  id: 'pack-uuid-1',
  name: 'Starter Maps',
  description: 'Good maps for beginners',
  mapIds: ['map-1', 'map-2'],
  createdAt: '2026-03-23T12:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue({ docs: [] })
  mockSet.mockResolvedValue(undefined)
  mockDelete.mockResolvedValue(undefined)
  mockOrderBy.mockReturnValue({ get: mockGet })
  mockDoc.mockReturnValue({ set: mockSet, delete: mockDelete })
  mockCollection.mockReturnValue({ orderBy: mockOrderBy, doc: mockDoc })
})

describe('getPacks', () => {
  it('returns empty array when collection is empty', async () => {
    expect(await getPacks()).toEqual([])
  })

  it('maps Firestore doc to MapPack', async () => {
    mockGet.mockResolvedValue({
      docs: [{
        id: 'pack-uuid-1',
        data: () => ({
          name: 'Starter Maps',
          description: 'Good maps for beginners',
          mapIds: ['map-1', 'map-2'],
          createdAt: '2026-03-23T12:00:00Z',
        }),
      }],
    })
    const packs = await getPacks()
    expect(packs[0]).toEqual(samplePack)
  })
})

describe('addPack', () => {
  it('sets a doc with correct fields', async () => {
    await addPack(samplePack)
    expect(mockDoc).toHaveBeenCalledWith('pack-uuid-1')
    expect(mockSet).toHaveBeenCalledWith({
      name: 'Starter Maps',
      description: 'Good maps for beginners',
      mapIds: ['map-1', 'map-2'],
      createdAt: '2026-03-23T12:00:00Z',
    })
  })
})

describe('removePack', () => {
  it('deletes by id', async () => {
    await removePack('pack-uuid-1')
    expect(mockDoc).toHaveBeenCalledWith('pack-uuid-1')
    expect(mockDelete).toHaveBeenCalled()
  })
})
