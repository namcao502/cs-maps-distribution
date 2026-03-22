import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getSubmissionsByUser } from '@/lib/submissions-store'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const submissions = await getSubmissionsByUser(user.id)
  return NextResponse.json(submissions)
}
