import { getAdminDb } from '@/lib/auth/firebase-admin'

export interface DailyPick {
  mapId: string
  caption: string
  setAt: string
}

function isPickActive(isoTimestamp: string): boolean {
  const setDate = new Date(isoTimestamp)
  const setDayStart = Date.UTC(setDate.getUTCFullYear(), setDate.getUTCMonth(), setDate.getUTCDate())
  const expiresAt = setDayStart + 2 * 24 * 60 * 60 * 1000
  return Date.now() < expiresAt
}

export async function getDailyPick(): Promise<DailyPick | null> {
  const doc = await getAdminDb().collection('config').doc('daily-pick').get()
  if (!doc.exists) return null
  const data = doc.data()!
  if (!isPickActive(data.setAt as string)) return null
  return {
    mapId: data.mapId as string,
    caption: (data.caption as string) ?? '',
    setAt: data.setAt as string,
  }
}

export async function setDailyPick(mapId: string, caption: string): Promise<void> {
  await getAdminDb().collection('config').doc('daily-pick').set({
    mapId,
    caption,
    setAt: new Date().toISOString(),
  })
}

export async function clearDailyPick(): Promise<void> {
  await getAdminDb().collection('config').doc('daily-pick').delete()
}
