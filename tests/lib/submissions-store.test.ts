import {
  addSubmission,
  getSubmissionsByUser,
  getSubmissionById,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
  hasPendingSubmissionBySha256,
} from '@/lib/submissions-store'

// Declared with var so they are hoisted and accessible within jest.mock factory
/* eslint-disable no-var */
var mockSingle: jest.Mock
var mockSelect: jest.Mock
var mockInsert: jest.Mock
var mockUpdate: jest.Mock
var mockEq: jest.Mock
var mockOrder: jest.Mock
var mockFrom: jest.Mock
/* eslint-enable no-var */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

const sampleRow = {
  id: 'sub-1',
  original_name: 'de_dust3',
  storage_key: 'submissions/sub-1.zip',
  format: 'zip',
  size: 2000,
  sha256: 'def456',
  submitted_at: '2026-03-22T12:00:00Z',
  submitter_id: 'user-1',
  submitter_name: 'Alice',
  submitter_avatar: 'https://example.com/avatar.jpg',
  status: 'pending',
  rejection_reason: null,
  reviewed_at: null,
}

beforeEach(() => {
  mockSingle = jest.fn()
  mockSelect = jest.fn()
  mockInsert = jest.fn()
  mockUpdate = jest.fn()
  mockEq = jest.fn()
  mockOrder = jest.fn()
  mockFrom = jest.fn()

  mockOrder.mockResolvedValue({ data: [], error: null })
  mockSingle.mockResolvedValue({ data: sampleRow, error: null })
  // mockEq returns a chainable object (for .eq().order()) and also resolves for terminal calls
  mockEq.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle })
  mockSelect.mockReturnValue({ order: mockOrder, eq: mockEq, single: mockSingle })
  mockInsert.mockReturnValue({ select: () => ({ single: mockSingle }) })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  })
})

describe('addSubmission', () => {
  it('inserts and returns the new submission', async () => {
    mockSingle.mockResolvedValue({ data: sampleRow, error: null })
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
  })
})

describe('getSubmissionsByUser', () => {
  it('returns submissions filtered by user', async () => {
    mockOrder.mockResolvedValue({ data: [sampleRow], error: null })
    const results = await getSubmissionsByUser('user-1')
    expect(results).toHaveLength(1)
    expect(results[0].submitterId).toBe('user-1')
  })
})

describe('approveSubmission', () => {
  it('calls update with status approved', async () => {
    await approveSubmission('sub-1')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }))
  })
})

describe('rejectSubmission', () => {
  it('calls update with status rejected and reason', async () => {
    await rejectSubmission('sub-1', 'Not a valid map')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'rejected',
      rejection_reason: 'Not a valid map',
    }))
  })
})
