import { NextRequest, NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps-store'
import { getPresignedUrl } from '@/lib/r2'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  try {
    const url = await getPresignedUrl(map.r2Key, 900)
    return NextResponse.json({ url, sha256: map.sha256 })
  } catch {
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }
}
