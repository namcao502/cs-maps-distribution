import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getSubmissionById } from '@/lib/submissions-store'
import { getObjectBuffer } from '@/lib/storage/storage'
import { listArchivePaths } from '@/lib/validate-archive'
import { detectStructure } from '@/lib/extractors/detect'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const submission = await getSubmissionById(id)
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await getObjectBuffer(submission.storageKey)
  if (!buffer) return NextResponse.json({ error: 'File not found in storage' }, { status: 404 })

  const paths = await listArchivePaths(buffer, submission.format)
  const structure = detectStructure(paths)
  const bspFiles = paths.filter(p => p.toLowerCase().endsWith('.bsp'))

  return NextResponse.json({ structure, bspFiles })
}
