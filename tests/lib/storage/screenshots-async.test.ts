import { uploadScreenshot, deleteScreenshot, getScreenshotUrl, resolveScreenshotUrls } from '@/lib/storage/screenshots'

jest.mock('@/lib/storage/storage', () => ({
  putObject: jest.fn(),
  deleteObject: jest.fn(),
  getPresignedUrl: jest.fn(),
}))

import { putObject, deleteObject, getPresignedUrl } from '@/lib/storage/storage'

beforeEach(() => jest.clearAllMocks())

describe('uploadScreenshot', () => {
  it('puts object with correct content type and returns key', async () => {
    ;(putObject as jest.Mock).mockResolvedValue(undefined)
    const key = await uploadScreenshot('map-1', 0, 'jpg', Buffer.from('data'))
    expect(key).toBe('screenshots/map-1/0.jpg')
    expect(putObject).toHaveBeenCalledWith('screenshots/map-1/0.jpg', expect.any(Buffer), 'image/jpeg')
  })

  it('handles .webp content type', async () => {
    ;(putObject as jest.Mock).mockResolvedValue(undefined)
    const key = await uploadScreenshot('map-1', 1, 'webp', Buffer.from('data'))
    expect(key).toBe('screenshots/map-1/1.webp')
    expect(putObject).toHaveBeenCalledWith('screenshots/map-1/1.webp', expect.any(Buffer), 'image/webp')
  })

  it('handles .png content type', async () => {
    ;(putObject as jest.Mock).mockResolvedValue(undefined)
    const key = await uploadScreenshot('map-2', 2, 'png', Buffer.from('data'))
    expect(key).toBe('screenshots/map-2/2.png')
    expect(putObject).toHaveBeenCalledWith('screenshots/map-2/2.png', expect.any(Buffer), 'image/png')
  })
})

describe('deleteScreenshot', () => {
  it('calls deleteObject with the key', async () => {
    ;(deleteObject as jest.Mock).mockResolvedValue(undefined)
    await deleteScreenshot('screenshots/map-1/0.jpg')
    expect(deleteObject).toHaveBeenCalledWith('screenshots/map-1/0.jpg')
  })
})

describe('getScreenshotUrl', () => {
  it('returns presigned URL with 1-hour TTL', async () => {
    ;(getPresignedUrl as jest.Mock).mockResolvedValue('https://example.com/screenshot.jpg')
    const url = await getScreenshotUrl('screenshots/map-1/0.jpg')
    expect(url).toBe('https://example.com/screenshot.jpg')
    expect(getPresignedUrl).toHaveBeenCalledWith('screenshots/map-1/0.jpg', 3600)
  })
})

describe('resolveScreenshotUrls', () => {
  it('resolves all URLs', async () => {
    ;(getPresignedUrl as jest.Mock).mockResolvedValue('https://example.com/screenshot')
    const urls = await resolveScreenshotUrls(['key1', 'key2'])
    expect(urls).toHaveLength(2)
    expect(urls[0]).toBe('https://example.com/screenshot')
  })

  it('filters out failed resolutions', async () => {
    ;(getPresignedUrl as jest.Mock)
      .mockResolvedValueOnce('https://example.com/ok')
      .mockRejectedValueOnce(new Error('Not found'))
    const urls = await resolveScreenshotUrls(['good', 'bad'])
    expect(urls).toHaveLength(1)
    expect(urls[0]).toBe('https://example.com/ok')
  })

  it('returns empty array for empty input', async () => {
    const urls = await resolveScreenshotUrls([])
    expect(urls).toHaveLength(0)
  })
})
