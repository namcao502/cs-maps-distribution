import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getSubmissionById, rejectSubmission } from '@/lib/submissions-store'
import { deleteObject } from '@/lib/storage/storage'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const reason = (body?.reason ?? '').trim()
  if (!reason) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })

  const { id } = await params
  const submission = await getSubmissionById(id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Already reviewed' }, { status: 409 })

  await rejectSubmission(submission.id, reason)
  await deleteObject(submission.storageKey)

  return NextResponse.json({ ok: true })
}
