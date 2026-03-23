import { NextResponse } from 'next/server'
import { getMaps } from '@/lib/maps-store'

export async function GET() {
  try {
    const maps = (await getMaps()).filter(m => !m.hidden)
    return NextResponse.json(maps, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to load maps' }, { status: 500 })
  }
}
