import { createClient } from '@supabase/supabase-js'
import type { Submission } from '@/types/submission'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function rowToSubmission(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    storageKey: row.storage_key as string,
    format: row.format as 'zip' | '7z' | 'rar',
    size: row.size as number,
    sha256: row.sha256 as string,
    submittedAt: row.submitted_at as string,
    submitterId: row.submitter_id as string,
    submitterName: row.submitter_name as string,
    submitterAvatar: row.submitter_avatar as string,
    status: row.status as 'pending' | 'approved' | 'rejected',
    rejectionReason: row.rejection_reason as string | null,
    reviewedAt: row.reviewed_at as string | null,
  }
}

type NewSubmission = Pick<Submission,
  'originalName' | 'storageKey' | 'format' | 'size' | 'sha256' |
  'submitterId' | 'submitterName' | 'submitterAvatar'>

export async function addSubmission(sub: NewSubmission): Promise<Submission> {
  const { data, error } = await supabase.from('submissions').insert({
    original_name: sub.originalName,
    storage_key: sub.storageKey,
    format: sub.format,
    size: sub.size,
    sha256: sub.sha256,
    submitter_id: sub.submitterId,
    submitter_name: sub.submitterName,
    submitter_avatar: sub.submitterAvatar,
  }).select().single()
  if (error) throw error
  return rowToSubmission(data)
}

export async function getSubmissionsByUser(userId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('submitter_id', userId)
    .order('submitted_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToSubmission)
}

export async function getSubmissions(status?: string): Promise<Submission[]> {
  let query = supabase.from('submissions').select('*').order('submitted_at', { ascending: true })
  if (status) query = (query as any).eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(rowToSubmission)
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const { data, error } = await supabase
    .from('submissions').select('*').eq('id', id).single()
  if (error) return null
  return rowToSubmission(data)
}

export async function approveSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('submissions').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function rejectSubmission(id: string, reason: string): Promise<void> {
  const { error } = await supabase.from('submissions').update({
    status: 'rejected',
    rejection_reason: reason,
    reviewed_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw error
}

export async function hasPendingSubmissionBySha256(sha256: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('sha256', sha256)
    .eq('status', 'pending')
  if (error) throw error
  return (count ?? 0) > 0
}
