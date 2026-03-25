import { NextResponse } from 'next/server'
import { getSessionUser, isAdmin } from '@/lib/auth/auth'
import { ERR_UNAUTHORIZED, ERR_NO_FILE, ERR_MAP_NOT_FOUND, ERR_SCREENSHOT_FORMAT, ERR_SCREENSHOT_TOO_LARGE, ERR_MAX_SCREENSHOTS } from '@/lib/constants/messages'
import { getMaps, updateScreenshotKeys } from '@/lib/maps/maps-store'
import { uploadScreenshot } from '@/lib/storage/screenshots'
import path from 'path'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: ERR_UNAUTHORIZED }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: ERR_NO_FILE }, { status: 400 })

  const ext = path.extname(file.name).replace('.', '').toLowerCase()
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return NextResponse.json({ error: ERR_SCREENSHOT_FORMAT }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: ERR_SCREENSHOT_TOO_LARGE }, { status: 400 })
  }

  const maps = await getMaps()
  const map = maps.find(m => m.id === id)
  if (!map) return NextResponse.json({ error: ERR_MAP_NOT_FOUND }, { status: 404 })

  const currentKeys = map.screenshotKeys ?? []
  if (currentKeys.length >= 3) {
    return NextResponse.json({ error: ERR_MAX_SCREENSHOTS }, { status: 400 })
  }

  const index = currentKeys.length
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = await uploadScreenshot(id, index, ext, buffer)
  const newKeys = [...currentKeys, key]
  await updateScreenshotKeys(id, newKeys)

  return NextResponse.json({ key }, { status: 201 })
}
