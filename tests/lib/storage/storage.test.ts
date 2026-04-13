import { getAdminStorage } from '@/lib/auth/firebase-admin'
import { putObject, deleteObject, getPresignedUrl, getObjectBuffer } from '@/lib/storage/storage'

jest.mock('@/lib/auth/firebase-admin')

const mockFile = {
  save: jest.fn(),
  delete: jest.fn(),
  getSignedUrl: jest.fn(),
  download: jest.fn(),
}

const mockBucket = {
  file: jest.fn().mockReturnValue(mockFile),
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getAdminStorage as jest.Mock).mockReturnValue({
    bucket: jest.fn().mockReturnValue(mockBucket),
  })
})

describe('putObject', () => {
  it('saves buffer with content type', async () => {
    mockFile.save.mockResolvedValue(undefined)
    await putObject('archives/test.zip', Buffer.from('data'), 'application/zip')
    expect(mockBucket.file).toHaveBeenCalledWith('archives/test.zip')
    expect(mockFile.save).toHaveBeenCalledWith(
      Buffer.from('data'),
      { metadata: { contentType: 'application/zip' } }
    )
  })

  it('uses default content type', async () => {
    mockFile.save.mockResolvedValue(undefined)
    await putObject('key', Buffer.from(''))
    expect(mockFile.save).toHaveBeenCalledWith(
      expect.any(Buffer),
      { metadata: { contentType: 'application/octet-stream' } }
    )
  })

  it('throws if save throws', async () => {
    mockFile.save.mockRejectedValue(new Error('Upload failed'))
    await expect(putObject('bad', Buffer.from(''))).rejects.toThrow('Upload failed')
  })
})

describe('deleteObject', () => {
  it('deletes the file', async () => {
    mockFile.delete.mockResolvedValue(undefined)
    await deleteObject('archives/test.zip')
    expect(mockBucket.file).toHaveBeenCalledWith('archives/test.zip')
    expect(mockFile.delete).toHaveBeenCalled()
  })

  it('throws if delete throws', async () => {
    mockFile.delete.mockRejectedValue(new Error('Delete failed'))
    await expect(deleteObject('bad')).rejects.toThrow('Delete failed')
  })
})

describe('getPresignedUrl', () => {
  it('returns signed URL', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const url = await getPresignedUrl('archives/test.zip')
    expect(url).toBe('https://example.com/signed')
    expect(mockFile.getSignedUrl).toHaveBeenCalledWith({
      action: 'read',
      expires: expect.any(Number),
    })
  })

  it('default ttl is ~900 seconds from now', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const before = Date.now()
    await getPresignedUrl('key')
    const after = Date.now()
    const { expires } = mockFile.getSignedUrl.mock.calls[0][0]
    expect(expires).toBeGreaterThanOrEqual(before + 900 * 1000)
    expect(expires).toBeLessThanOrEqual(after + 900 * 1000)
  })

  it('uses custom ttl', async () => {
    mockFile.getSignedUrl.mockResolvedValue(['https://example.com/signed'])
    const before = Date.now()
    await getPresignedUrl('key', 3600)
    const after = Date.now()
    const { expires } = mockFile.getSignedUrl.mock.calls[0][0]
    expect(expires).toBeGreaterThanOrEqual(before + 3600 * 1000)
    expect(expires).toBeLessThanOrEqual(after + 3600 * 1000)
  })

  it('throws if getSignedUrl throws', async () => {
    mockFile.getSignedUrl.mockRejectedValue(new Error('Signing failed'))
    await expect(getPresignedUrl('bad')).rejects.toThrow('Signing failed')
  })
})

describe('getObjectBuffer', () => {
  it('returns ArrayBuffer on success', async () => {
    const buf = Buffer.from('hello world')
    mockFile.download.mockResolvedValue([buf])
    const result = await getObjectBuffer('archives/test.zip')
    expect(result).not.toBeNull()
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('returns null if download throws', async () => {
    mockFile.download.mockRejectedValue(new Error('Not found'))
    const result = await getObjectBuffer('missing')
    expect(result).toBeNull()
  })
})
