'use client'
import type { InstallStatus } from '@/lib/maps/install'

type Phase = 'downloading' | 'verifying' | 'extracting' | 'writing'

const PHASES: { key: Phase; label: string }[] = [
  { key: 'downloading', label: 'DOWNLOAD' },
  { key: 'verifying', label: 'VERIFY' },
  { key: 'extracting', label: 'EXTRACT' },
  { key: 'writing', label: 'WRITE' },
]

function phaseIndex(phase: string): number {
  return PHASES.findIndex(p => p.key === phase)
}

export function InstallStepper({ status }: { status: InstallStatus | null }) {
  const activeIdx = status ? phaseIndex(status.phase) : -1
  const isDone = status?.phase === 'done'
  const isError = status?.phase === 'error'

  let progress = 0
  if (isDone) progress = 100
  else if (status?.phase === 'downloading') progress = status.progress / 4
  else if (status?.phase === 'verifying') progress = 25
  else if (status?.phase === 'extracting') progress = 50
  else if (status?.phase === 'writing') progress = 75 + (status.done / status.total) * 25

  return (
    <div className="bg-[var(--bg-inset)] border border-[var(--border)] rounded-md p-3">
      {/* Phase steps */}
      <div className="flex items-center justify-between mb-3">
        {PHASES.map((phase, i) => {
          const isComplete = isDone || (activeIdx >= 0 && i < activeIdx)
          const isActive = !isDone && activeIdx === i
          const isFuture = activeIdx < 0 || i > activeIdx

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold mb-1 transition-all"
                style={{
                  background: isDone || isComplete ? 'var(--accent-green)' :
                              isError && isActive ? 'var(--color-danger)' :
                              isActive ? 'var(--accent-orange)' : 'var(--bg-surface)',
                  border: `1px solid ${isFuture && !isDone ? 'var(--border)' : 'transparent'}`,
                  color: (isComplete || isDone) ? '#000' : isActive ? '#000' : 'var(--text-muted)',
                }}
              >
                {isComplete || isDone ? '✓' : isActive && isError ? '✕' : i + 1}
              </div>
              <span
                className="text-xs font-mono"
                style={{ color: isComplete || isDone || isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {phase.label}
              </span>
              {isActive && (
                <span className="text-xs font-mono text-[var(--accent-orange)] mt-0.5">
                  {status?.phase === 'downloading' ? `${Math.round(status.progress)}%` :
                   status?.phase === 'writing' ? `${status.done}/${status.total}` : ''}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: isError ? 'var(--color-danger)' :
                        isDone ? 'var(--accent-green)' :
                        `linear-gradient(90deg, var(--accent-green), var(--accent-orange))`,
          }}
        />
      </div>

      {/* Error message */}
      {isError && (
        <p className="mt-2 text-xs font-mono text-[var(--color-danger)]">{status.message}</p>
      )}
    </div>
  )
}
