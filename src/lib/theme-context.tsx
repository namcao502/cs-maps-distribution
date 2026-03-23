'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const STORAGE_KEY = 'cs-theme'

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {}
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    setThemeState(readTheme())
  }, [])

  function setTheme(t: Theme) {
    try { localStorage.setItem(STORAGE_KEY, t) } catch {}
    setThemeState(t)
  }

  useEffect(() => {
    function applyTheme() {
      const effective = resolveEffective(theme)
      document.documentElement.classList.toggle('dark', effective === 'dark')
    }

    applyTheme()

    // Only listen to OS changes when in 'system' mode.
    // In 'light' or 'dark' mode, the class is set above and no listener is needed.
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', applyTheme)
      return () => mq.removeEventListener('change', applyTheme)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
