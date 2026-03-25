export interface Submission {
  id: string
  originalName: string
  storageKey: string
  format: 'zip' | '7z' | 'rar'
  size: number
  sha256: string
  submittedAt: string
  submitterId: string
  submitterName: string
  submitterAvatar: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason: string | null
  reviewedAt: string | null
  tags?: string[]
  screenshotKeys?: string[]
}
