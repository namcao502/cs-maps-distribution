import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getSubmissions } from '@/lib/submissions-store'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = new URL(req.url).searchParams.get('status') ?? 'pending'
  return NextResponse.json(await getSubmissions(status))
}
