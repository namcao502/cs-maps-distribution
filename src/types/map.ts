export interface MapEntry {
  id: string           // UUID v4
  originalName: string // filename without extension
  r2Key: string        // e.g. "archives/uuid.zip"
  format: 'zip' | '7z' | 'rar'
  size: number         // bytes
  sha256: string       // hex-encoded SHA-256 of the archive
  uploadedAt: string   // ISO 8601
}
