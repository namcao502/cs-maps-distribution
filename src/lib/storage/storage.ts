import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const BUCKET = () => process.env.SUPABASE_BUCKET_NAME ?? 'cs-maps'

export async function putObject(
  key: string,
  body: Buffer,
  contentType = 'application/octet-stream',
): Promise<void> {
  const blob = new Blob([new Uint8Array(body)], { type: contentType })
  const { error } = await getClient().storage.from(BUCKET()).upload(key, blob, {
    contentType,
    upsert: true,
  })
  if (error) throw error
}

export async function deleteObject(key: string): Promise<void> {
  const { error } = await getClient().storage.from(BUCKET()).remove([key])
  if (error) throw error
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const { data, error } = await getClient()
    .storage.from(BUCKET())
    .createSignedUrl(key, ttlSeconds)
  if (error) throw error
  return data.signedUrl
}

/** Downloads an object as raw binary. Returns null if not found. */
export async function getObjectBuffer(key: string): Promise<ArrayBuffer | null> {
  const { data, error } = await getClient().storage.from(BUCKET()).download(key)
  if (error || !data) return null
  return data.arrayBuffer()
}
