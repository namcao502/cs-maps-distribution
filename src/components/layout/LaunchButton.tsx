'use client'
import { useState, useEffect } from 'react'
import { isLaunchSetup, markLaunchSetup } from '@/lib/maps/launch-store'
import { LaunchSetupModal } from '@/components/maps/LaunchSetupModal'
import { BTN_LAUNCH_CS } from '@/lib/constants/messages'

function isWindowsUserAgent(): boolean {
  return typeof navigator !== 'undefined' && /Windows/i.test(navigator.userAgent)
}

export function LaunchButton() {
  const [isWindows, setIsWindows] = useState(false)
  const [setup, setSetup] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'setup' | 'reconfigure'>('setup')

  useEffect(() => {
    setIsWindows(isWindowsUserAgent())
    setSetup(isLaunchSetup())
  }, [])

  if (!isWindows) return null

  function handleLaunchClick() {
    if (!setup) {
      setModalMode('setup')
      setModalOpen(true)
    } else {
      window.location.href = 'cs://'
    }
  }

  function handleGearClick() {
    setModalMode('reconfigure')
    setModalOpen(true)
  }

  function handleSetupComplete() {
    markLaunchSetup()
    setSetup(true)
    setModalOpen(false)
  }

  return (
    <>
      <div className="flex items-center shrink-0">
        <button
          className="text-xs font-mono px-3 py-1.5 border border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)] hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
          style={{ borderRadius: setup ? '4px 0 0 4px' : '4px' }}
          onClick={handleLaunchClick}
        >
          {BTN_LAUNCH_CS}
        </button>
        {setup && (
          <button
            className="text-xs font-mono px-2 py-1.5 border border-l-0 border-[var(--accent-cyan)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-cyan)]"
            onClick={handleGearClick}
            aria-label="Reconfigure game launch"
          >
            &#9881;
          </button>
        )}
      </div>
      {modalOpen && (
        <LaunchSetupModal
          mode={modalMode}
          onSetupComplete={handleSetupComplete}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
