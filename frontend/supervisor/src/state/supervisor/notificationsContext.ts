import { createContext, useContext } from 'react'
import type { NotificationType, SupervisorNotification } from '../../data/supervisor/notificationsMockData'

export type NotificationItem = Omit<SupervisorNotification, 'minutesAgo'> & {
  /** ISO timestamp. */
  createdAt: string
}

export type NotificationPreferences = {
  /** In-app notification types; a disabled type is hidden from the list and the unread badge. */
  types: Record<NotificationType, boolean>
  emailSummary: boolean
}

export type NotificationsContextValue = {
  /** Notifications of the enabled types, newest first. */
  notifications: NotificationItem[]
  unreadCount: number
  mutedTypes: NotificationType[]
  preferences: NotificationPreferences
  setRead: (id: string, read: boolean) => void
  markAllRead: () => void
  setTypeEnabled: (type: NotificationType, enabled: boolean) => void
  setEmailSummary: (enabled: boolean) => void
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error('useNotifications must be used inside <NotificationsProvider>.')
  return context
}
