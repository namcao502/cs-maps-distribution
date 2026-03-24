import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/auth'
import { getSubmissionById, deleteSubmission } from '@/lib/submissions/submissions-store'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const submission = await getSubmissionById(id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (submission.submitterId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (submission.status !== 'pending') return NextResponse.json({ error: 'Only pending submissions can be deleted' }, { status: 400 })

  await deleteSubmission(id)
  return NextResponse.json({ ok: true })
}
