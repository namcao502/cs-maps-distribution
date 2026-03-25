import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { putObject } from '@/lib/storage/storage'
import { addSubmission, hasPendingSubmissionBySha256 } from '@/lib/submissions/submissions-store'
import { computeSHA256 } from '@/lib/storage/hash'
import { validateMapArchive } from '@/lib/submissions/validate-archive'
import { getMapSha256s } from '@/lib/maps/maps-store'
import { MAP_TAGS, type MapTag } from '@/lib/maps/tags'
import {
  ERR_SIGN_IN_REQUIRED, ERR_NO_FILE, ERR_FILE_TOO_LARGE, ERR_UNSUPPORTED_ARCHIVE,
  ERR_MAP_ALREADY_IN_LIBRARY, ERR_MAP_ALREADY_PENDING,
} from '@/lib/constants/messages'
import path from 'path'

const ALLOWED_IMG = new Set(['jpg', 'jpeg', 'png', 'webp'])

const MAX_SIZE = 20 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['zip', '7z', 'rar'])

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: ERR_SIGN_IN_REQUIRED }, { status: 401 })
  if (isAdmin(user)) return NextResponse.json({ error: 'Admins use the admin upload form' }, { status: 403 })

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE) return NextResponse.json({ error: ERR_FILE_TOO_LARGE }, { status: 413 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: ERR_NO_FILE }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: ERR_UNSUPPORTED_ARCHIVE }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  if (buffer.byteLength > MAX_SIZE) return NextResponse.json({ error: ERR_FILE_TOO_LARGE }, { status: 413 })

  const structureError = await validateMapArchive(buffer, ext as 'zip' | '7z' | 'rar')
  if (structureError) return NextResponse.json({ error: structureError }, { status: 422 })

  const sha256 = await computeSHA256(buffer)

  // Dedup: check approved maps table
  const existingSha256s = await getMapSha256s()
  if (existingSha256s.includes(sha256)) {
    return NextResponse.json({ error: ERR_MAP_ALREADY_IN_LIBRARY }, { status: 409 })
  }

  // Dedup: check pending submissions
  if (await hasPendingSubmissionBySha256(sha256)) {
    return NextResponse.json({ error: ERR_MAP_ALREADY_PENDING }, { status: 409 })
  }

  const id = uuidv4()
  const storageKey = `submissions/${id}.${ext}`
  const originalName = file.name.replace(/\.[^.]+$/, '')

  await putObject(storageKey, Buffer.from(new Uint8Array(buffer)))

  const rawTags = JSON.parse((formData.get('tags') as string | null) ?? '[]') as string[]
  const tags = rawTags.filter((t): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))

  const screenshotKeys: string[] = []
  const screenshotWarnings: string[] = []
  for (let i = 0; i < 3; i++) {
    const img = formData.get(`screenshot_${i}`) as File | null
    if (!img) continue
    const imgExt = path.extname(img.name).replace('.', '').toLowerCase()
    if (!ALLOWED_IMG.has(imgExt)) { screenshotWarnings.push(`${img.name}: unsupported format`); continue }
    if (img.size > 2 * 1024 * 1024) { screenshotWarnings.push(`${img.name}: exceeds 2 MB`); continue }
    const imgKey = `submission-screenshots/${id}/${i}.${imgExt}`
    await putObject(imgKey, Buffer.from(await img.arrayBuffer()))
    screenshotKeys.push(imgKey)
  }

  await addSubmission({
    originalName,
    storageKey,
    format: ext as 'zip' | '7z' | 'rar',
    size: buffer.byteLength,
    sha256,
    submitterId: user.id,
    submitterName: user.user_metadata?.full_name ?? user.email ?? 'Unknown',
    submitterAvatar: user.user_metadata?.avatar_url ?? '',
    tags,
    screenshotKeys,
  })

  return NextResponse.json({ ok: true, ...(screenshotWarnings.length > 0 && { screenshotWarnings }) })
}
