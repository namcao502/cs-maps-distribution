'use client'
import { createContext, useContext, useState, useCallback } from 'react'
import type { InstallStatus } from '../install'

export type Notification =
  | { id: string; type: 'success' | 'error'; message: string; read: boolean; at: Date }
  | { id: string; type: 'progress'; mapName: string; status: InstallStatus; read: boolean; at: Date }

type NotificationContextType = {
  notifications: Notification[]
  activeInstallId: string | null
  push: (message: string, type: 'success' | 'error') => void
  startProgress: (id: string, mapName: string) => void
  updateProgress: (id: string, status: InstallStatus) => void
  markAllRead: () => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activeInstallId, setActiveInstallId] = useState<string | null>(null)

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(prev => [{ id, type, message, read: false, at: new Date() }, ...prev].slice(0, 20))
  }, [])

  const startProgress = useCallback((id: string, mapName: string) => {
    const n: Notification = { id, type: 'progress', mapName, status: { phase: 'downloading', progress: 0 }, read: false, at: new Date() }
    setNotifications(prev => [n, ...prev].slice(0, 20))
    setActiveInstallId(id)
  }, [])

  const updateProgress = useCallback((id: string, status: InstallStatus) => {
    setNotifications(prev => prev.map(n =>
      n.id === id && n.type === 'progress' ? { ...n, status } : n
    ))
    if (status.phase === 'done' || status.phase === 'error') {
      setActiveInstallId(prev => prev === id ? null : prev)
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, activeInstallId, push, startProgress, updateProgress, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
