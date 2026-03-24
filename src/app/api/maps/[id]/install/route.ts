import { NextRequest, NextResponse } from 'next/server'
import { incrementInstall } from '@/lib/maps/maps-store'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await incrementInstall(id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to record install' }, { status: 500 })
  }
}
