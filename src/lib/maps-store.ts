import { createClient } from '@supabase/supabase-js'
import type { MapEntry } from '@/types/map'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function rowToMapEntry(row: Record<string, unknown>): MapEntry {
  return {
    id: row.id as string,
    originalName: row.original_name as string,
    storageKey: row.storage_key as string,
    format: row.format as 'zip' | '7z' | 'rar',
    size: row.size as number,
    sha256: row.sha256 as string,
    uploadedAt: row.uploaded_at as string,
    uploader: row.uploader_id
      ? {
          id: row.uploader_id as string,
          name: row.uploader_name as string,
          avatar: row.uploader_avatar as string,
        }
      : undefined,
  }
}

export async function getMaps(): Promise<MapEntry[]> {
  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .order('uploaded_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(rowToMapEntry)
}

export async function addMap(entry: MapEntry): Promise<void> {
  const { error } = await supabase.from('maps').insert({
    id: entry.id,
    original_name: entry.originalName,
    storage_key: entry.storageKey,
    format: entry.format,
    size: entry.size,
    sha256: entry.sha256,
    uploaded_at: entry.uploadedAt,
    uploader_id: entry.uploader?.id ?? null,
    uploader_name: entry.uploader?.name ?? null,
    uploader_avatar: entry.uploader?.avatar ?? null,
  })
  if (error) throw error
}

export async function removeMap(id: string): Promise<void> {
  const { error } = await supabase.from('maps').delete().eq('id', id)
  if (error) throw error
}

export async function getMapSha256s(): Promise<string[]> {
  const { data, error } = await supabase.from('maps').select('sha256')
  if (error) throw error
  return (data ?? []).map(r => r.sha256 as string)
}
