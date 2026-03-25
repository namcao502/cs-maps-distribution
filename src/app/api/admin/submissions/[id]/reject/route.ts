import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { ERR_UNAUTHORIZED, ERR_NOT_FOUND, ERR_ALREADY_REVIEWED, ERR_REJECTION_REASON_REQUIRED } from '@/lib/constants/messages'
import { getSubmissionById, rejectSubmission } from '@/lib/submissions/submissions-store'
import { deleteObject } from '@/lib/storage/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 401 })

  const body = await req.json()
  const reason = (body?.reason ?? '').trim()
  if (!reason) return NextResponse.json({ error: ERR_REJECTION_REASON_REQUIRED }, { status: 400 })

  const { id } = await params
  const submission = await getSubmissionById(id)
  if (!submission) return NextResponse.json({ error: ERR_NOT_FOUND }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: ERR_ALREADY_REVIEWED }, { status: 409 })

  await rejectSubmission(submission.id, reason)
  await deleteObject(submission.storageKey)

  return NextResponse.json({ ok: true })
}
