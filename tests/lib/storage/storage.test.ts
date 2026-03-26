import { createClient } from '@supabase/supabase-js'
import { putObject, deleteObject, getPresignedUrl, getObjectBuffer } from '@/lib/storage/storage'

jest.mock('@supabase/supabase-js')

const mockBucket = {
  upload: jest.fn(),
  remove: jest.fn(),
  createSignedUrl: jest.fn(),
  download: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
  process.env.SUPABASE_BUCKET_NAME = 'cs-maps'
  ;(createClient as jest.Mock).mockReturnValue({
    storage: { from: jest.fn().mockReturnValue(mockBucket) },
  })
})

describe('putObject', () => {
  it('uploads successfully', async () => {
    mockBucket.upload.mockResolvedValue({ error: null })
    await putObject('archives/test.zip', Buffer.from('data'), 'application/zip')
    expect(mockBucket.upload).toHaveBeenCalledWith(
      'archives/test.zip',
      expect.any(Blob),
      expect.objectContaining({ contentType: 'application/zip', upsert: true })
    )
  })

  it('uses default content type', async () => {
    mockBucket.upload.mockResolvedValue({ error: null })
    await putObject('key', Buffer.from(''))
    expect(mockBucket.upload).toHaveBeenCalledWith(
      'key',
      expect.any(Blob),
      expect.objectContaining({ contentType: 'application/octet-stream' })
    )
  })

  it('throws on upload error', async () => {
    const err = new Error('Upload failed')
    mockBucket.upload.mockResolvedValue({ error: err })
    await expect(putObject('bad', Buffer.from(''))).rejects.toThrow('Upload failed')
  })
})

describe('deleteObject', () => {
  it('deletes successfully', async () => {
    mockBucket.remove.mockResolvedValue({ error: null })
    await deleteObject('archives/test.zip')
    expect(mockBucket.remove).toHaveBeenCalledWith(['archives/test.zip'])
  })

  it('throws on delete error', async () => {
    const err = new Error('Delete failed')
    mockBucket.remove.mockResolvedValue({ error: err })
    await expect(deleteObject('bad')).rejects.toThrow('Delete failed')
  })
})

describe('getPresignedUrl', () => {
  it('returns signed URL', async () => {
    mockBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    })
    const url = await getPresignedUrl('archives/test.zip')
    expect(url).toBe('https://example.com/signed')
    expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('archives/test.zip', 900)
  })

  it('uses custom ttl', async () => {
    mockBucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed' },
      error: null,
    })
    await getPresignedUrl('key', 3600)
    expect(mockBucket.createSignedUrl).toHaveBeenCalledWith('key', 3600)
  })

  it('throws on error', async () => {
    mockBucket.createSignedUrl.mockResolvedValue({ data: null, error: new Error('Signing failed') })
    await expect(getPresignedUrl('bad')).rejects.toThrow()
  })
})

describe('getObjectBuffer', () => {
  it('returns ArrayBuffer on success', async () => {
    const blob = new Blob(['hello world'])
    mockBucket.download.mockResolvedValue({ data: blob, error: null })
    const result = await getObjectBuffer('archives/test.zip')
    expect(result).not.toBeNull()
  })

  it('returns null when error', async () => {
    mockBucket.download.mockResolvedValue({ data: null, error: new Error('Not found') })
    const result = await getObjectBuffer('missing')
    expect(result).toBeNull()
  })

  it('returns null when data is null with no error', async () => {
    mockBucket.download.mockResolvedValue({ data: null, error: null })
    const result = await getObjectBuffer('empty')
    expect(result).toBeNull()
  })
})
