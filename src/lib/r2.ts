import { createClient } from '@supabase/supabase-js'

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const BUCKET = () => process.env.SUPABASE_BUCKET_NAME ?? 'cs-maps'

export async function getObject(key: string): Promise<string | null> {
  const { data, error } = await getClient().storage.from(BUCKET()).download(key)
  if (error) {
    if (error.message.includes('not found') || error.message.includes('Object not found')) return null
    throw error
  }
  return data ? await data.text() : null
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream'
): Promise<void> {
  const part: BlobPart = typeof body === 'string' ? body : new Uint8Array(body)
  const blob = new Blob([part], { type: contentType })
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
