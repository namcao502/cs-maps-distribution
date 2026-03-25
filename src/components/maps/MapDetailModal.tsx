'use client'
import { useState } from 'react'
import type { MapEntry } from '@/types/map'
import type { InstallStatus } from '@/lib/maps/install'
import { InstallStepper } from './InstallStepper'
import { isFileSystemAccessSupported } from '@/lib/maps/install'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MapDetailModal({
  map,
  onClose,
  onInstall,
  onDownload,
  status,
  installed = false,
}: {
  map: MapEntry
  onClose: () => void
  onInstall: () => void
  onDownload: () => void
  status: InstallStatus | null
  installed?: boolean
}) {
  const [activeScreenshot, setActiveScreenshot] = useState(0)
  const [imgLoading, setImgLoading] = useState(false)
  const [confirmReinstall, setConfirmReinstall] = useState(false)
  const screenshots = map.screenshotKeys ?? []
  const supportsFileApi = isFileSystemAccessSupported()
  const isInstalling = status != null && status.phase !== 'done' && status.phase !== 'error'

  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl overflow-hidden w-full max-w-lg mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Screenshot gallery */}
        <div className="relative h-72 bg-[var(--bg-inset)]" style={{
          background: screenshots[activeScreenshot] ? undefined : 'linear-gradient(135deg, #1a2744, #0f1e3a)'
        }}>
          {screenshots[activeScreenshot] && (
            <img
              key={screenshots[activeScreenshot]}
              src={screenshots[activeScreenshot]}
              alt={map.originalName}
              className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoadStart={() => setImgLoading(true)}
              onLoad={() => setImgLoading(false)}
            />
          )}
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-7 h-7 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {/* Close */}
          <button
            className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-mono text-sm"
            onClick={onClose}
            aria-label="Close"
          >✕</button>
          {/* Thumbnail strip */}
          {screenshots.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveScreenshot(i); setImgLoading(true) }}
                  className="w-8 h-5 rounded-sm border transition-colors"
                  style={{
                    borderColor: i === activeScreenshot ? 'var(--accent-cyan)' : 'var(--border)',
                    background: i === activeScreenshot ? 'rgba(56,189,248,0.3)' : 'rgba(0,0,0,0.5)',
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="font-mono font-bold text-[var(--text-primary)] text-base">{map.originalName}</h2>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                {map.uploader ? <>by <span className="text-[var(--accent-cyan)]">{map.uploader.name}</span></> : 'Uploaded'}{' '}
                · {new Date(map.uploadedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-[var(--accent-orange)] text-sm">↓ {map.installCount.toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)] font-mono">installs</div>
            </div>
          </div>

          {/* Meta badges */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <span className="bg-[var(--bg-inset)] border border-[var(--accent-cyan)] text-[var(--accent-cyan)] text-xs font-mono px-2 py-0.5 rounded-sm">
              {map.format.toUpperCase()}
            </span>
            <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-subtle)] text-xs font-mono px-2 py-0.5 rounded-sm">
              {formatBytes(map.size)}
            </span>
            <span className="bg-[var(--bg-inset)] border border-[var(--border)] text-[var(--text-subtle)] text-xs font-mono px-2 py-0.5 rounded-sm">
              SHA256 ✓
            </span>
          </div>

          {/* Install stepper */}
          <div className="mb-3">
            <InstallStepper status={status} installed={installed} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {supportsFileApi && (
              confirmReinstall ? (
                <>
                  <button
                    className="flex-1 py-2 rounded-md text-sm font-mono font-bold bg-[var(--accent-orange)] text-black hover:opacity-90 transition-opacity"
                    onClick={() => { setConfirmReinstall(false); onInstall() }}
                  >
                    Reinstall
                  </button>
                  <button
                    className="px-4 py-2 rounded-md text-sm font-mono text-[var(--text-subtle)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => setConfirmReinstall(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className={`flex-1 py-2 rounded-md text-sm font-mono font-bold tracking-wide transition-colors ${
                    isInstalling
                      ? 'bg-[var(--bg-inset)] text-[var(--accent-orange)] border border-[var(--accent-orange)]'
                      : installed
                        ? 'bg-transparent text-[var(--accent-green)] border border-[var(--accent-green)] hover:opacity-80'
                        : 'bg-[var(--accent-orange)] text-black hover:opacity-90'
                  }`}
                  onClick={() => { if (isInstalling) return; if (installed) { setConfirmReinstall(true) } else { onInstall() } }}
                  disabled={isInstalling}
                >
                  {isInstalling ? 'INSTALLING...' : installed ? '✓ INSTALLED' : 'INSTALL'}
                </button>
              )
            )}
            {!confirmReinstall && (
              <button
                className="px-4 py-2 rounded-md text-sm font-mono text-[var(--text-subtle)] border border-[var(--border)] hover:text-[var(--text-primary)] transition-colors"
                onClick={onDownload}
              >
                ↓ Download
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
