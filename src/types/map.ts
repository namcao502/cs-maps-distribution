export interface MapEntry {
  id: string
  originalName: string
  storageKey: string        // renamed from r2Key; full storage path e.g. "archives/uuid.zip"
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  uploadedAt: string
  installCount: number
  tags: string[]
  hidden?: boolean
  uploader?: {
    id: string
    name: string
    avatar: string
  }
}
