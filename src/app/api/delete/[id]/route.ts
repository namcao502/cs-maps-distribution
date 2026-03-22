import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminCookie, COOKIE_NAME } from '@/lib/auth'
import { getMaps, removeMap } from '@/lib/maps-store'
import { deleteObject } from '@/lib/storage'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!(await verifyAdminCookie(cookie))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) {
    return NextResponse.json({ error: 'Map not found' }, { status: 404 })
  }

  await deleteObject(map.storageKey)
  await removeMap(id)

  return NextResponse.json({ ok: true })
}
