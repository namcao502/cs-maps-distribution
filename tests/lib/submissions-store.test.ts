import {
  addSubmission,
  getSubmissionsByUser,
  approveSubmission,
  rejectSubmission,
  hasPendingSubmissionBySha256,
} from '@/lib/submissions/submissions-store'

const mockGet = jest.fn()
const mockSet = jest.fn()
const mockUpdate = jest.fn()
const mockWhere = jest.fn()
const mockOrderBy = jest.fn()
const mockLimit = jest.fn()
const mockDoc = jest.fn()
const mockCollection = jest.fn()

jest.mock('@/lib/auth/firebase-admin', () => ({
  getAdminDb: jest.fn(() => ({ collection: mockCollection })),
}))

jest.mock('uuid', () => ({ v4: () => 'sub-1' }))

beforeEach(() => {
  jest.clearAllMocks()
  mockGet.mockResolvedValue({ docs: [], empty: true })
  mockSet.mockResolvedValue(undefined)
  mockUpdate.mockResolvedValue(undefined)
  mockLimit.mockReturnValue({ get: mockGet })
  mockWhere.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy, limit: mockLimit, get: mockGet })
  mockOrderBy.mockReturnValue({ where: mockWhere, get: mockGet })
  mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, get: mockGet })
  mockCollection.mockReturnValue({ doc: mockDoc, where: mockWhere, orderBy: mockOrderBy })
})

describe('addSubmission', () => {
  it('inserts and returns the new submission', async () => {
    const result = await addSubmission({
      originalName: 'de_dust3',
      storageKey: 'submissions/sub-1.zip',
      format: 'zip',
      size: 2000,
      sha256: 'def456',
      submitterId: 'user-1',
      submitterName: 'Alice',
      submitterAvatar: 'https://example.com/avatar.jpg',
    })
    expect(result.id).toBe('sub-1')
    expect(result.status).toBe('pending')
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      originalName: 'de_dust3',
      submitterId: 'user-1',
      status: 'pending',
    }))
  })
})

describe('getSubmissionsByUser', () => {
  it('queries by submitterId', async () => {
    mockGet.mockResolvedValue({
      docs: [{
        id: 'sub-1',
        data: () => ({
          originalName: 'de_dust3',
          storageKey: 'submissions/sub-1.zip',
          format: 'zip',
          size: 2000,
          sha256: 'def456',
          submittedAt: '2026-03-22T12:00:00Z',
          submitterId: 'user-1',
          submitterName: 'Alice',
          submitterAvatar: 'https://example.com/avatar.jpg',
          status: 'pending',
          rejectionReason: null,
          reviewedAt: null,
        }),
      }],
    })
    const results = await getSubmissionsByUser('user-1')
    expect(results).toHaveLength(1)
    expect(results[0].submitterId).toBe('user-1')
    expect(mockWhere).toHaveBeenCalledWith('submitterId', '==', 'user-1')
  })
})

describe('approveSubmission', () => {
  it('updates status to approved', async () => {
    await approveSubmission('sub-1')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }))
  })
})

describe('rejectSubmission', () => {
  it('updates status to rejected with reason', async () => {
    await rejectSubmission('sub-1', 'Not a valid map')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      rejectionReason: 'Not a valid map',
    }))
  })
})

describe('hasPendingSubmissionBySha256', () => {
  it('returns false when no matching pending submission', async () => {
    mockGet.mockResolvedValue({ empty: true })
    expect(await hasPendingSubmissionBySha256('def456')).toBe(false)
  })

  it('returns true when matching pending submission exists', async () => {
    mockGet.mockResolvedValue({ empty: false })
    expect(await hasPendingSubmissionBySha256('def456')).toBe(true)
  })
})

const docData = {
  originalName: 'de_dust3',
  storageKey: 'submissions/sub-1.zip',
  format: 'zip',
  size: 2000,
  sha256: 'def456',
  submittedAt: '2026-03-22T12:00:00Z',
  submitterId: 'user-1',
  submitterName: 'Alice',
  submitterAvatar: 'https://example.com/avatar.jpg',
  status: 'pending',
  rejectionReason: 'not good',
  reviewedAt: '2026-03-23T00:00:00Z',
  tags: ['de_'],
  screenshotKeys: ['screenshots/sub-1/0.jpg'],
}

describe('getSubmissions', () => {
  it('returns all submissions when no status filter', async () => {
    mockGet.mockResolvedValue({ docs: [{ id: 'sub-1', data: () => docData }] })
    const { getSubmissions } = await import('@/lib/submissions/submissions-store')
    const results = await getSubmissions()
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('sub-1')
  })

  it('filters by status when provided', async () => {
    mockGet.mockResolvedValue({ docs: [{ id: 'sub-2', data: () => ({ ...docData, status: 'approved' }) }] })
    const { getSubmissions } = await import('@/lib/submissions/submissions-store')
    const results = await getSubmissions('approved')
    expect(mockWhere).toHaveBeenCalledWith('status', '==', 'approved')
    expect(results).toHaveLength(1)
  })
})

describe('getSubmissionById', () => {
  it('returns submission when found', async () => {
    mockGet.mockResolvedValue({ exists: true, id: 'sub-1', data: () => docData })
    const { getSubmissionById } = await import('@/lib/submissions/submissions-store')
    const result = await getSubmissionById('sub-1')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('sub-1')
    expect(result?.tags).toEqual(['de_'])
    expect(result?.screenshotKeys).toEqual(['screenshots/sub-1/0.jpg'])
  })

  it('returns null when not found', async () => {
    mockGet.mockResolvedValue({ exists: false })
    const { getSubmissionById } = await import('@/lib/submissions/submissions-store')
    const result = await getSubmissionById('missing')
    expect(result).toBeNull()
  })
})

describe('deleteSubmission', () => {
  it('calls delete on the document', async () => {
    const mockDelete = jest.fn().mockResolvedValue(undefined)
    mockDoc.mockReturnValue({ set: mockSet, update: mockUpdate, get: mockGet, delete: mockDelete })
    const { deleteSubmission } = await import('@/lib/submissions/submissions-store')
    await deleteSubmission('sub-1')
    expect(mockDelete).toHaveBeenCalled()
  })
})
