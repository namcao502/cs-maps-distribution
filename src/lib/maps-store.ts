import { getAdminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { MapEntry } from '@/types/map'

function docToMapEntry(id: string, data: FirebaseFirestore.DocumentData): MapEntry {
  return {
    id,
    originalName: data.originalName as string,
    storageKey: data.storageKey as string,
    format: data.format as 'zip' | '7z' | 'rar',
    size: data.size as number,
    sha256: data.sha256 as string,
    uploadedAt: data.uploadedAt as string,
    downloadCount: (data.downloadCount as number) ?? 0,
    installCount: (data.installCount as number) ?? 0,
    tags: (data.tags as string[]) ?? [],
    uploader: data.uploaderId
      ? {
          id: data.uploaderId as string,
          name: data.uploaderName as string,
          avatar: data.uploaderAvatar as string,
        }
      : undefined,
  }
}

export async function getMaps(): Promise<MapEntry[]> {
  const snap = await getAdminDb()
    .collection('maps')
    .orderBy('uploadedAt', 'desc')
    .get()
  return snap.docs.map(doc => docToMapEntry(doc.id, doc.data()))
}

export async function addMap(entry: MapEntry): Promise<void> {
  await getAdminDb().collection('maps').doc(entry.id).set({
    originalName: entry.originalName,
    storageKey: entry.storageKey,
    format: entry.format,
    size: entry.size,
    sha256: entry.sha256,
    uploadedAt: entry.uploadedAt,
    downloadCount: 0,
    installCount: 0,
    tags: entry.tags,
    uploaderId: entry.uploader?.id ?? null,
    uploaderName: entry.uploader?.name ?? null,
    uploaderAvatar: entry.uploader?.avatar ?? null,
  })
}

export async function removeMap(id: string): Promise<void> {
  await getAdminDb().collection('maps').doc(id).delete()
}

export async function incrementDownload(id: string): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({
    downloadCount: FieldValue.increment(1),
  })
}

export async function incrementInstall(id: string): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({
    installCount: FieldValue.increment(1),
  })
}

export async function updateMapTags(id: string, tags: string[]): Promise<void> {
  await getAdminDb().collection('maps').doc(id).update({ tags })
}

export async function getMapSha256s(): Promise<string[]> {
  const snap = await getAdminDb().collection('maps').select('sha256').get()
  return snap.docs.map(doc => doc.data().sha256 as string)
}
