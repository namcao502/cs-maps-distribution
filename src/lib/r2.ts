import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getClient(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME!

export async function getObject(key: string): Promise<string | null> {
  try {
    const client = getClient()
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET(), Key: key })
    )
    return response.Body ? await response.Body.transformToString() : null
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'NoSuchKey') return null
    throw err
  }
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream'
): Promise<void> {
  const client = getClient()
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body, ContentType: contentType })
  )
}

export async function deleteObject(key: string): Promise<void> {
  const client = getClient()
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

export async function getPresignedUrl(key: string, ttlSeconds = 900): Promise<string> {
  const client = getClient()
  const command = new GetObjectCommand({ Bucket: BUCKET(), Key: key })
  return getSignedUrl(client, command, { expiresIn: ttlSeconds })
}
