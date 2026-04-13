import { getAdminStorage } from '@/lib/auth/firebase-admin'

function getBucket() {
  return getAdminStorage().bucket()
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  await getBucket().file(key).save(body, { metadata: { contentType } })
}

export async function deleteObject(key: string): Promise<void> {
  await getBucket().file(key).delete()
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const [url] = await getBucket().file(key).getSignedUrl({
    action: 'read',
    expires: Date.now() + ttlSeconds * 1000,
  })
  return url
}

export async function getObjectBuffer(key: string): Promise<ArrayBuffer | null> {
  try {
    const [buffer] = await getBucket().file(key).download()
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  } catch {
    return null
  }
}
