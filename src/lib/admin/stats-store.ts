import { unstable_cache } from 'next/cache'
import { getAdminDb } from '@/lib/auth/firebase-admin'
import { AggregateField } from 'firebase-admin/firestore'

export type ActivityEvent = {
  type: 'approved' | 'rejected' | 'uploaded'
  mapName: string
  at: string
}

export function mergeRecentActivity(
  reviewed: ActivityEvent[],
  uploaded: ActivityEvent[],
  limit: number
): ActivityEvent[] {
  return [...reviewed, ...uploaded]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}

async function fetchStats() {
  const db = getAdminDb()

  // Aggregate totals
  const mapsAgg = await db.collection('maps').aggregate({
    totalMaps: AggregateField.count(),
    totalInstalls: AggregateField.sum('installCount'),
  }).get()

  const pendingAgg = await db.collection('submissions')
    .where('status', '==', 'pending')
    .count()
    .get()

  // Top maps
  const topSnap = await db.collection('maps')
    .orderBy('installCount', 'desc')
    .limit(5)
    .get()
  const topMaps = topSnap.docs.map(doc => ({
    id: doc.id,
    originalName: doc.data().originalName as string,
    installCount: (doc.data().installCount as number) ?? 0,
  }))

  // Recent reviewed submissions
  const reviewedSnap = await db.collection('submissions')
    .orderBy('reviewedAt', 'desc')
    .limit(10)
    .get()
  const reviewed: ActivityEvent[] = reviewedSnap.docs
    .filter(doc => doc.data().reviewedAt)
    .map(doc => ({
      type: doc.data().status as 'approved' | 'rejected',
      mapName: doc.data().originalName as string,
      at: doc.data().reviewedAt as string,
    }))

  // Recent admin direct uploads
  const uploadedSnap = await db.collection('maps')
    .where('uploaderId', '==', null)
    .orderBy('uploadedAt', 'desc')
    .limit(10)
    .get()
  const uploaded: ActivityEvent[] = uploadedSnap.docs.map(doc => ({
    type: 'uploaded' as const,
    mapName: doc.data().originalName as string,
    at: doc.data().uploadedAt as string,
  }))

  const aggData = mapsAgg.data()
  return {
    totalMaps: aggData.totalMaps as number,
    totalInstalls: (aggData.totalInstalls as number) ?? 0,
    pendingSubmissions: pendingAgg.data().count as number,
    topMaps,
    recentActivity: mergeRecentActivity(reviewed, uploaded, 10),
  }
}

export const getAdminStats = unstable_cache(fetchStats, ['admin-stats'], { revalidate: 60 })
