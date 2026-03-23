import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth'
import { getMaps } from '@/lib/maps-store'

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const maps = await getMaps()
  return NextResponse.json(maps, { headers: { 'Cache-Control': 'no-store' } })
}
