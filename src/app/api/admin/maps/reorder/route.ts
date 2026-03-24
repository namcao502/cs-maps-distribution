import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { reorderMaps } from '@/lib/maps/maps-store'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.ids) || !body.ids.every((id: unknown) => typeof id === 'string')) {
    return NextResponse.json({ error: 'Invalid body: expected { ids: string[] }' }, { status: 400 })
  }

  try {
    await reorderMaps(body.ids as string[])
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to reorder maps' }, { status: 500 })
  }
}
