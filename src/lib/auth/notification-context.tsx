'use client'
import { createContext, useContext, useState, useCallback } from 'react'

export type Notification = {
  id: string
  type: 'success' | 'error'
  message: string
  read: boolean
  at: Date
}

type NotificationContextType = {
  notifications: Notification[]
  push: (message: string, type: 'success' | 'error') => void
  markAllRead: () => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)
const AUTO_DISMISS_MS = 3000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(prev => [{ id, type, message, read: false, at: new Date() }, ...prev].slice(0, 20))
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, push, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
