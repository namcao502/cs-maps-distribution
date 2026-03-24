'use client'
import type { InstallStatus } from '@/lib/install'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'

interface Props {
  status: InstallStatus | null
  onClose: () => void
  onFallbackDownload?: () => void
}

export function ProgressModal({ status, onClose, onFallbackDownload }: Props) {
  if (!status) return null

  const isActive = status.phase === 'downloading' || status.phase === 'verifying' || status.phase === 'extracting' || status.phase === 'writing'

  return (
    <Modal>
      {/* Active phases */}
      {isActive && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--color-info-muted)] flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-[var(--color-info)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">
                {status.phase === 'downloading' && 'Downloading...'}
                {status.phase === 'verifying' && 'Verifying integrity...'}
                {status.phase === 'extracting' && 'Extracting archive...'}
                {status.phase === 'writing' && 'Installing files...'}
              </p>
              {status.phase === 'writing' && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate max-w-[240px]">{status.current}</p>
              )}
            </div>
          </div>
          {(status.phase === 'downloading' || status.phase === 'writing') && (
            <div>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2">
                <div
                  className="bg-[var(--accent)] h-2 rounded-full transition-all duration-150"
                  style={{ width: `${Math.round(status.phase === 'downloading' ? status.progress * 100 : (status.done / status.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 text-right">
                {status.phase === 'downloading' ? `${Math.round(status.progress * 100)}%` : `${status.done}/${status.total} files`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Done */}
      {status.phase === 'done' && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-success-muted)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Map installed!</p>
              <p className="text-xs text-[var(--text-muted)]">{status.result.written.length} file(s) written to <span className="font-mono">{status.result.gameRoot}</span></p>
            </div>
          </div>
          <Button variant="success" size="md" className="mt-2 w-full py-2.5 rounded-xl" onClick={onClose}>Done</Button>
        </div>
      )}

      {/* Error */}
      {status.phase === 'error' && (
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-danger-muted)] flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Installation failed</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{status.message}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            {onFallbackDownload && (
              <Button variant="primary" size="md" className="w-full py-2.5 rounded-xl" onClick={() => { onClose(); onFallbackDownload() }}>
                Download archive instead
              </Button>
            )}
            <Button variant="secondary" size="md" className="w-full py-2.5 rounded-xl" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
