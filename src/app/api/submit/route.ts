import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { putObject } from '@/lib/storage/storage'
import { addSubmission, hasPendingSubmissionBySha256 } from '@/lib/submissions/submissions-store'
import { computeSHA256 } from '@/lib/storage/hash'
import { validateMapArchive } from '@/lib/submissions/validate-archive'
import { getMapSha256s } from '@/lib/maps/maps-store'

const MAX_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['zip', '7z', 'rar'])

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  if (isAdmin(user)) return NextResponse.json({ error: 'Admins use the admin upload form' }, { status: 403 })

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'Unsupported format. Use .zip, .7z, or .rar' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 })

  const structureError = await validateMapArchive(buffer, ext as 'zip' | '7z' | 'rar')
  if (structureError) return NextResponse.json({ error: structureError }, { status: 422 })

  const sha256 = await computeSHA256(buffer)

  // Dedup: check approved maps table
  const existingSha256s = await getMapSha256s()
  if (existingSha256s.includes(sha256)) {
    return NextResponse.json({ error: 'This map is already in the library' }, { status: 409 })
  }

  // Dedup: check pending submissions
  if (await hasPendingSubmissionBySha256(sha256)) {
    return NextResponse.json({ error: 'This map is already pending review' }, { status: 409 })
  }

  const id = uuidv4()
  const storageKey = `submissions/${id}.${ext}`
  const originalName = file.name.replace(/\.[^.]+$/, '')

  await putObject(storageKey, Buffer.from(new Uint8Array(buffer)))

  await addSubmission({
    originalName,
    storageKey,
    format: ext as 'zip' | '7z' | 'rar',
    size: buffer.byteLength,
    sha256,
    submitterId: user.id,
    submitterName: user.user_metadata?.full_name ?? user.email ?? 'Unknown',
    submitterAvatar: user.user_metadata?.avatar_url ?? '',
  })

  return NextResponse.json({ ok: true })
}
