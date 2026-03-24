import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { MAP_TAGS, type MapTag } from '@/lib/maps/tags'
import { getSubmissionById, approveSubmission } from '@/lib/submissions/submissions-store'
import { addMap } from '@/lib/maps/maps-store'
import { getObjectBuffer, putObject, deleteObject } from '@/lib/storage/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const submission = await getSubmissionById(id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  const body = await req.json().catch(() => ({}))
  const rawTags = Array.isArray(body.tags) ? body.tags : []
  const tags = rawTags.filter((t: string): t is MapTag => (MAP_TAGS as readonly string[]).includes(t))

  const buffer = await getObjectBuffer(submission.storageKey)
  if (!buffer) return NextResponse.json({ error: 'File missing from storage' }, { status: 404 })

  const newId = uuidv4()
  const newKey = `archives/${newId}.${submission.format}`
  await putObject(newKey, Buffer.from(new Uint8Array(buffer)))

  await addMap({
    id: newId,
    originalName: submission.originalName,
    storageKey: newKey,
    format: submission.format,
    size: submission.size,
    sha256: submission.sha256,
    uploadedAt: new Date().toISOString(),
    installCount: 0,
    tags,
    uploader: {
      id: submission.submitterId,
      name: submission.submitterName,
      avatar: submission.submitterAvatar,
    },
  })

  await approveSubmission(submission.id)
  await deleteObject(submission.storageKey)

  return NextResponse.json({ ok: true })
}
