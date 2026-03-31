import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { setDailyPick } from '@/lib/maps/daily-pick-store'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { ERR_UNAUTHORIZED, ERR_MAP_NOT_FOUND } from '@/lib/constants/messages'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 401 })
  }

  const { mapId, caption } = await request.json() as { mapId: string; caption: string }

  const doc = await getAdminDb().collection('maps').doc(mapId).get()
  if (!doc.exists) {
    return NextResponse.json({ error: ERR_MAP_NOT_FOUND }, { status: 404 })
  }

  await setDailyPick(mapId, caption ?? '')
  return NextResponse.json({ success: true })
}
