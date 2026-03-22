import { getAdminStorage } from '@/lib/firebase-admin'

function getBucket() {
  return getAdminStorage().bucket()
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream'
): Promise<void> {
  await getBucket().file(key).save(body, { contentType })
}

export async function deleteObject(key: string): Promise<void> {
  await getBucket().file(key).delete({ ignoreNotFound: true })
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const [url] = await getBucket().file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + ttlSeconds * 1000,
  })
  return url
}

/** Downloads an object as raw binary. Returns null if not found. */
export async function getObjectBuffer(key: string): Promise<ArrayBuffer | null> {
  try {
    const [contents] = await getBucket().file(key).download()
    return contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength) as ArrayBuffer
  } catch {
    return null
  }
}
