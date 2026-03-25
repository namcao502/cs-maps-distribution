'use client'
import { createContext, useContext, useState, useCallback } from 'react'

export type Notification = {
  id: string
  type: 'success' | 'error'
  message: string
  read: boolean
  at: Date
}

export type Toast = {
  id: string
  type: 'success' | 'error'
  message: string
}

type NotificationContextType = {
  notifications: Notification[]
  toasts: Toast[]
  push: (message: string, type: 'success' | 'error') => void
  dismissToast: (id: string) => void
  markAllRead: () => void
  clear: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)
const TOAST_MS = 3000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(prev => [{ id, type, message, read: false, at: new Date() }, ...prev].slice(0, 20))
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => dismissToast(id), TOAST_MS)
  }, [dismissToast])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clear = useCallback(() => setNotifications([]), [])

  return (
    <NotificationContext.Provider value={{ notifications, toasts, push, dismissToast, markAllRead, clear }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
