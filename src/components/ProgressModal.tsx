'use client'
import type { InstallStatus } from '@/lib/install'

interface Props {
  status: InstallStatus | null
  onClose: () => void
  onFallbackDownload?: () => void
}

export function ProgressModal({ status, onClose, onFallbackDownload }: Props) {
  if (!status) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        {status.phase === 'downloading' && (
          <>
            <h2 className="font-bold text-lg mb-3">Downloading...</h2>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.round(status.progress * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(status.progress * 100)}%</p>
          </>
        )}
        {status.phase === 'verifying' && <p className="font-semibold">Verifying file integrity...</p>}
        {status.phase === 'extracting' && <p className="font-semibold">Extracting archive...</p>}
        {status.phase === 'writing' && (
          <>
            <p className="font-semibold">Installing files...</p>
            <p className="text-sm text-gray-500 mt-1 truncate">{status.current}</p>
            <p className="text-xs text-gray-400">{status.done}/{status.total}</p>
          </>
        )}
        {status.phase === 'done' && (
          <>
            <h2 className="font-bold text-lg text-green-600 mb-2">Installed!</h2>
            <p className="text-sm text-gray-600 mb-1">
              Wrote {status.result.written.length} file(s) to <code>{status.result.gameRoot}</code>
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg w-full"
            >
              Done
            </button>
          </>
        )}
        {status.phase === 'error' && (
          <>
            <h2 className="font-bold text-lg text-red-600 mb-2">Error</h2>
            <p className="text-sm text-gray-600">{status.message}</p>
            {onFallbackDownload && (
              <button
                onClick={() => { onClose(); onFallbackDownload() }}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg w-full"
              >
                Download archive instead
              </button>
            )}
            <button
              onClick={onClose}
              className="mt-2 px-4 py-2 bg-gray-200 rounded-lg w-full"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  )
}
