import { getAdminDb } from '@/lib/firebase-admin'
import { v4 as uuidv4 } from 'uuid'
import type { Submission } from '@/types/submission'

function docToSubmission(id: string, data: FirebaseFirestore.DocumentData): Submission {
  return {
    id,
    originalName: data.originalName as string,
    storageKey: data.storageKey as string,
    format: data.format as 'zip' | '7z' | 'rar',
    size: data.size as number,
    sha256: data.sha256 as string,
    submittedAt: data.submittedAt as string,
    submitterId: data.submitterId as string,
    submitterName: data.submitterName as string,
    submitterAvatar: data.submitterAvatar as string,
    status: data.status as 'pending' | 'approved' | 'rejected',
    rejectionReason: (data.rejectionReason as string) ?? null,
    reviewedAt: (data.reviewedAt as string) ?? null,
  }
}

type NewSubmission = Pick<Submission,
  'originalName' | 'storageKey' | 'format' | 'size' | 'sha256' |
  'submitterId' | 'submitterName' | 'submitterAvatar'>

export async function addSubmission(sub: NewSubmission): Promise<Submission> {
  const id = uuidv4()
  const now = new Date().toISOString()
  const data = {
    originalName: sub.originalName,
    storageKey: sub.storageKey,
    format: sub.format,
    size: sub.size,
    sha256: sub.sha256,
    submittedAt: now,
    submitterId: sub.submitterId,
    submitterName: sub.submitterName,
    submitterAvatar: sub.submitterAvatar,
    status: 'pending',
    rejectionReason: null,
    reviewedAt: null,
  }
  await getAdminDb().collection('submissions').doc(id).set(data)
  return docToSubmission(id, data)
}

export async function getSubmissionsByUser(userId: string): Promise<Submission[]> {
  const snap = await getAdminDb()
    .collection('submissions')
    .where('submitterId', '==', userId)
    .orderBy('submittedAt', 'desc')
    .get()
  return snap.docs.map(doc => docToSubmission(doc.id, doc.data()))
}

export async function getSubmissions(status?: string): Promise<Submission[]> {
  let query = getAdminDb()
    .collection('submissions')
    .orderBy('submittedAt', 'asc') as FirebaseFirestore.Query
  if (status) query = query.where('status', '==', status)
  const snap = await query.get()
  return snap.docs.map(doc => docToSubmission(doc.id, doc.data()))
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const doc = await getAdminDb().collection('submissions').doc(id).get()
  if (!doc.exists) return null
  return docToSubmission(doc.id, doc.data()!)
}

export async function approveSubmission(id: string): Promise<void> {
  await getAdminDb().collection('submissions').doc(id).update({
    status: 'approved',
    reviewedAt: new Date().toISOString(),
  })
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  await getAdminDb().collection('submissions').doc(id).update({
    status: 'rejected',
    rejectionReason: reason,
    reviewedAt: new Date().toISOString(),
  })
}

export async function hasPendingSubmissionBySha256(sha256: string): Promise<boolean> {
  const snap = await getAdminDb()
    .collection('submissions')
    .where('sha256', '==', sha256)
    .where('status', '==', 'pending')
    .limit(1)
    .get()
  return !snap.empty
}
