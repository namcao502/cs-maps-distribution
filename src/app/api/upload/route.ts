import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { putObject } from '@/lib/storage/storage'
import { addMap, getMaps } from '@/lib/maps/maps-store'
import { computeSHA256 } from '@/lib/storage/hash'
import { validateMapArchive } from '@/lib/submissions/validate-archive'
import { MAP_TAGS, type MapTag } from '@/lib/maps/tags'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_EXTENSIONS = new Set(['zip', '7z', 'rar'])

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Server-side size check via Content-Length
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use .zip, .7z, or .rar' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()

  // Streaming byte count — authoritative size check
  if (buffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })
  }

  const sha256 = await computeSHA256(buffer)

  const structureError = await validateMapArchive(buffer, ext as 'zip' | '7z' | 'rar')
  if (structureError) {
    return NextResponse.json({ error: structureError }, { status: 422 })
  }

  const existing = await getMaps()
  const duplicate = existing.find(m => m.sha256 === sha256)
  if (duplicate) {
    return NextResponse.json(
      { error: `"${duplicate.originalName}" is already uploaded (duplicate file)` },
      { status: 409 }
    )
  }

  const id = uuidv4()
  const storageKey = `archives/${id}.${ext}`
  const originalName = file.name.replace(/\.[^.]+$/, '')

  await putObject(storageKey, Buffer.from(buffer))

  const rawTags = JSON.parse((formData.get('tags') as string | null) ?? '[]') as string[]
  const tags = rawTags.filter((t): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))

  await addMap({
    id,
    originalName,
    storageKey,
    format: ext as 'zip' | '7z' | 'rar',
    size: buffer.byteLength,
    sha256,
    uploadedAt: new Date().toISOString(),
    downloadCount: 0,
    installCount: 0,
    tags,
  })

  return NextResponse.json({ ok: true, id })
}
