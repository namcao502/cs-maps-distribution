'use client'
import {
  BTN_CANCEL,
  BTN_DONE_RAN_IT,
  LABEL_SETUP_LAUNCH,
  LABEL_RECONFIGURE_LAUNCH,
} from '@/lib/constants/messages'

interface LaunchSetupModalProps {
  mode: 'setup' | 'reconfigure'
  onSetupComplete: () => void
  onClose: () => void
}

export function LaunchSetupModal({ mode, onSetupComplete, onClose }: LaunchSetupModalProps) {
  const title = mode === 'setup' ? LABEL_SETUP_LAUNCH : LABEL_RECONFIGURE_LAUNCH

  return (
    <div
      data-testid="launch-setup-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="launch-setup-title"
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl w-full max-w-md mx-4 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2
          id="launch-setup-title"
          className="font-mono font-bold text-[var(--text-primary)] text-base mb-4"
        >
          {title}
        </h2>

        <ol className="space-y-3 mb-6">
          <li className="flex gap-3 text-sm font-mono text-[var(--text-subtle)]">
            <span className="text-[var(--accent-cyan)] font-bold shrink-0">1.</span>
            <span>
              <a
                href="/setup-cs-launch.ps1"
                download
                className="text-[var(--accent-cyan)] underline hover:opacity-80 transition-opacity"
              >
                Download setup-cs-launch.ps1
              </a>
            </span>
          </li>
          <li className="flex gap-3 text-sm font-mono text-[var(--text-subtle)]">
            <span className="text-[var(--accent-cyan)] font-bold shrink-0">2.</span>
            <span>
              Right-click the downloaded file and select{' '}
              <strong className="text-[var(--text-primary)]">Run with PowerShell</strong>
            </span>
          </li>
          <li className="flex gap-3 text-sm font-mono text-[var(--text-subtle)]">
            <span className="text-[var(--accent-cyan)] font-bold shrink-0">3.</span>
            <span>
              In the file picker that opens, select your{' '}
              <strong className="text-[var(--text-primary)]">cstrike.exe</strong>
            </span>
          </li>
        </ol>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-md text-sm font-mono font-bold bg-[var(--accent-cyan)] text-black hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
            onClick={onSetupComplete}
          >
            {BTN_DONE_RAN_IT}
          </button>
          <button
            className="px-4 py-2 rounded-md text-sm font-mono text-[var(--text-subtle)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
            onClick={onClose}
          >
            {BTN_CANCEL}
          </button>
        </div>
      </div>
    </div>
  )
}
