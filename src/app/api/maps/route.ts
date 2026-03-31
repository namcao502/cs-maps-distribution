import { NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps/maps-store'
import { resolveScreenshotUrls } from '@/lib/storage/screenshots'

export async function GET() {
  try {
    const maps = (await getMaps()).filter(m => !m.hidden)
    const resolved = await Promise.all(
      maps.map(async m => ({
        ...m,
        screenshotKeys: m.screenshotKeys?.length
          ? await resolveScreenshotUrls(m.screenshotKeys)
          : [],
      }))
    )
    return NextResponse.json(resolved, { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' } })
  } catch (err) {
    console.error('[GET /api/maps]', err)
    return NextResponse.json({ error: 'Failed to load maps' }, { status: 500 })
  }
}
