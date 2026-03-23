import { NextResponse } from 'next/server'
import { getPacks } from '@/lib/packs-store'
import { getMaps } from '@/lib/maps-store'

export async function GET() {
  const [packs, allMaps] = await Promise.all([getPacks(), getMaps()])
  const result = packs.map(pack => ({
    ...pack,
    maps: allMaps.filter(m => pack.mapIds.includes(m.id)),
  }))
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
