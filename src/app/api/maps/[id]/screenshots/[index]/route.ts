import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { getMaps, updateScreenshotKeys } from '@/lib/maps/maps-store'
import { deleteScreenshot } from '@/lib/storage/screenshots'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index: indexStr } = await params
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const index = parseInt(indexStr, 10)
  if (isNaN(index) || index < 0 || index > 2) {
    return NextResponse.json({ error: 'Invalid index' }, { status: 400 })
  }

  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 })

  const currentKeys = map.screenshotKeys ?? []
  if (index >= currentKeys.length) {
    return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 })
  }

  await deleteScreenshot(currentKeys[index])
  const newKeys = currentKeys.filter((_, i) => i !== index)
  await updateScreenshotKeys(id, newKeys)

  return NextResponse.json({ ok: true })
}
