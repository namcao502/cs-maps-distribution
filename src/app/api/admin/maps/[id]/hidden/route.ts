import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { ERR_UNAUTHORIZED } from '@/lib/constants/messages'
import { updateMapHidden } from '@/lib/maps/maps-store'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 401 })

  const { id } = await params
  const { hidden } = await req.json()
  try {
    await updateMapHidden(id, !!hidden)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update map' }, { status: 500 })
  }
}
