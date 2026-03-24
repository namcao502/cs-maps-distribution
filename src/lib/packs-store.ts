import { getAdminDb } from '@/lib/auth/firebase-admin'
import type { MapPack } from '@/types/pack'

function docToPack(id: string, data: FirebaseFirestore.DocumentData): MapPack {
  return {
    id,
    name: data.name as string,
    description: data.description as string,
    mapIds: data.mapIds as string[],
    createdAt: data.createdAt as string,
  }
}

export async function getPacks(): Promise<MapPack[]> {
  const snap = await getAdminDb()
    .collection('packs')
    .orderBy('createdAt', 'desc')
    .get()
  return snap.docs.map(doc => docToPack(doc.id, doc.data()))
}

export async function addPack(pack: MapPack): Promise<void> {
  await getAdminDb().collection('packs').doc(pack.id).set({
    name: pack.name,
    description: pack.description,
    mapIds: pack.mapIds,
    createdAt: pack.createdAt,
  })
}

export async function removePack(id: string): Promise<void> {
  await getAdminDb().collection('packs').doc(id).delete()
}
