import { putObject, deleteObject, getPresignedUrl } from './storage'

const ALLOWED_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function screenshotKey(mapId: string, index: number, ext: string): string {
  if (index < 0 || index > 2) throw new Error(`Screenshot index must be 0-2, got ${index}`)
  const normalExt = ext.toLowerCase().replace(/^\./, '')
  if (!ALLOWED_TYPES[normalExt]) throw new Error(`Unsupported format: ${ext}`)
  return `screenshots/${mapId}/${index}.${normalExt}`
}

export async function uploadScreenshot(
  mapId: string,
  index: number,
  ext: string,
  data: Buffer,
): Promise<string> {
  const key = screenshotKey(mapId, index, ext)
  const contentType = ALLOWED_TYPES[ext.toLowerCase().replace(/^\./, '')]
  await putObject(key, data, contentType)
  return key
}

export async function deleteScreenshot(key: string): Promise<void> {
  await deleteObject(key)
}

export async function getScreenshotUrl(key: string): Promise<string> {
  return getPresignedUrl(key, 3600)
}

export async function resolveScreenshotUrls(keys: string[]): Promise<string[]> {
  const results = await Promise.allSettled(keys.map(getScreenshotUrl))
  return results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
    .map(r => r.value)
}
