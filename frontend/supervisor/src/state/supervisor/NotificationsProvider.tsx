import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  notificationTypes,
  supervisorNotifications,
  type NotificationType,
} from '../../data/supervisor/notificationsMockData'
import { readStored, writeStored } from '../storage'
import {
  NotificationsContext,
  type NotificationItem,
  type NotificationPreferences,
  type NotificationsContextValue,
} from './notificationsContext'
import { buildWorkshopNotifications } from './workshopNotifications'

const defaultPreferences: NotificationPreferences = {
  types: { meeting: true, report: true, attendance: true, issue: true, workshop: true },
  emailSummary: false,
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Mock ages are anchored to page load; read flags the supervisor changed are kept per id.
  const [items, setItems] = useState<NotificationItem[]>(() => {
    const loadedAt = Date.now()
    const storedReads = readStored<Record<string, boolean>>('notificationReads', {})
    const workshopNotifications = buildWorkshopNotifications(new Date(loadedAt))
    return [...supervisorNotifications, ...workshopNotifications].map(({ minutesAgo, ...item }) => ({
      ...item,
      read: storedReads[item.id] ?? item.read,
      createdAt: new Date(loadedAt - minutesAgo * 60_000).toISOString(),
    }))
  })

  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const stored = readStored<Partial<NotificationPreferences>>('notificationPreferences', {})
    return {
      types: { ...defaultPreferences.types, ...stored.types },
      emailSummary: stored.emailSummary ?? defaultPreferences.emailSummary,
    }
  })

  const updateItems = useCallback((change: (current: NotificationItem[]) => NotificationItem[]) => {
    setItems((current) => {
      const next = change(current)
      writeStored('notificationReads', Object.fromEntries(next.map((item) => [item.id, item.read])))
      return next
    })
  }, [])

  const updatePreferences = useCallback((change: (current: NotificationPreferences) => NotificationPreferences) => {
    setPreferences((current) => {
      const next = change(current)
      writeStored('notificationPreferences', next)
      return next
    })
  }, [])

  const value = useMemo<NotificationsContextValue>(() => {
    const notifications = items
      .filter((item) => preferences.types[item.type])
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return {
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      mutedTypes: notificationTypes.filter((type) => !preferences.types[type]),
      preferences,
      setRead: (id, read) => updateItems((current) => current.map((item) => (item.id === id ? { ...item, read } : item))),
      markAllRead: () =>
        updateItems((current) => current.map((item) => (preferences.types[item.type] ? { ...item, read: true } : item))),
      setTypeEnabled: (type: NotificationType, enabled: boolean) =>
        updatePreferences((current) => ({ ...current, types: { ...current.types, [type]: enabled } })),
      setEmailSummary: (enabled) => updatePreferences((current) => ({ ...current, emailSummary: enabled })),
    }
  }, [items, preferences, updateItems, updatePreferences])

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
