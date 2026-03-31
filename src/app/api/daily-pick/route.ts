import { NextResponse } from 'next/server'
import { getDailyPick } from '@/lib/maps/daily-pick-store'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { resolveScreenshotUrls } from '@/lib/storage/screenshots'
import type { MapEntry } from '@/types/map'

export async function GET() {
  const pick = await getDailyPick()
  if (!pick) return NextResponse.json(null)

  const doc = await getAdminDb().collection('maps').doc(pick.mapId).get()
  if (!doc.exists) return NextResponse.json(null)

  const data = doc.data()!
  if (data.hidden) return NextResponse.json(null)

  const map: MapEntry = {
    id: doc.id,
    originalName: data.originalName as string,
    storageKey: data.storageKey as string,
    format: data.format as 'zip' | '7z' | 'rar',
    size: data.size as number,
    sha256: data.sha256 as string,
    uploadedAt: data.uploadedAt as string,
    installCount: (data.installCount as number) ?? 0,
    tags: (data.tags as string[]) ?? [],
    hidden: false,
    ...(data.order !== undefined && { order: data.order as number }),
    ...(data.uploaderId && {
      uploader: {
        id: data.uploaderId as string,
        name: data.uploaderName as string,
        avatar: data.uploaderAvatar as string,
      },
    }),
    screenshotKeys: data.screenshotKeys?.length
      ? await resolveScreenshotUrls(data.screenshotKeys as string[])
      : [],
  }

  return NextResponse.json({ map, caption: pick.caption })
}
