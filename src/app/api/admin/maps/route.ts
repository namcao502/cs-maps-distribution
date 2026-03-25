import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getMaps } from '@/lib/maps/maps-store'
import { resolveScreenshotUrls } from '@/lib/storage/screenshots'

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const maps = await getMaps()
  const resolved = await Promise.all(maps.map(async m => ({
    ...m,
    screenshotKeys: m.screenshotKeys?.length ? await resolveScreenshotUrls(m.screenshotKeys) : [],
  })))
  return NextResponse.json(resolved, { headers: { 'Cache-Control': 'no-store' } })
}
