import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { updateMapHidden } from '@/lib/maps-store'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { hidden } = await req.json()
  await updateMapHidden(id, !!hidden)
  return NextResponse.json({ ok: true })
}
