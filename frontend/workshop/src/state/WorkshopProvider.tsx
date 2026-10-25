import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { noticesSeed, notificationsSeed, observationsSeed, type Notice, type Observation } from '../data/activity'
import { handoverSeed } from '../data/handover'
import { conversationsSeed } from '../data/messages'
import { absentTodaySeed, students, supervisorFor } from '../data/teams'
import { useLocalState } from './useLocalState'
import {
  WorkshopContext,
  type AttendanceStatus,
  type Availability,
  type Toast,
  type WorkshopContextValue,
} from './workshopContext'

const attendanceSeed: Record<string, AttendanceStatus> = Object.fromEntries(
  students.map((student) => [student.id, absentTodaySeed.includes(student.id) ? 'absent' : 'present']),
)

const availabilitySeed: Availability = { status: 'onDuty' }
const toastMs = 3200

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [attendance, setAttendanceMap] = useLocalState('attendance', attendanceSeed)
  const [availability, setAvailability] = useLocalState('availability', availabilitySeed)
  const [notices, setNotices] = useLocalState('notices', noticesSeed)
  const [handover, setHandover] = useLocalState('handover', handoverSeed)
  const [observations, setObservations] = useLocalState('observations', observationsSeed)
  const [notifications, setNotifications] = useLocalState('notifications', notificationsSeed)
  const [conversations, setConversations] = useLocalState('conversations', conversationsSeed)
  const [signedOut, setSignedOut] = useLocalState('signedOut', false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const showToast = useCallback((text: string) => {
    const id = ++toastId.current
    setToasts((current) => [...current.slice(-2), { id, text }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), toastMs)
  }, [])

  const addNotice = useCallback(
    (notice: Omit<Notice, 'id' | 'sentAt'>) =>
      setNotices((current) => [{ ...notice, id: newId('nt'), sentAt: new Date().toISOString() }, ...current]),
    [setNotices],
  )

  const value = useMemo<WorkshopContextValue>(
    () => ({
      attendance,
      setAttendance: (studentIds, status) =>
        setAttendanceMap((current) => ({ ...current, ...Object.fromEntries(studentIds.map((id) => [id, status])) })),

      availability,
      notifyTemporaryAbsence: (from, until, reason) => {
        setAvailability({ status: 'away', from, until, reason: reason || undefined })
        addNotice({ audience: 'all', kind: 'unavailable', params: { from, until, ...(reason ? { reason } : {}) } })
      },
      notifyFullDayAbsence: (reason) => {
        setAvailability({ status: 'absent', reason: reason || undefined })
        addNotice({ audience: 'all', kind: 'fullDay', params: reason ? { reason } : {} })
      },
      backOnDuty: () => setAvailability(availabilitySeed),

      notices,
      sendNotice: (audience, kind, message) => addNotice({ audience, kind, message }),

      handover,
      checkReturn: (teamId, condition, note) =>
        setHandover((current) =>
          current.map((record) =>
            record.teamId === teamId
              ? { ...record, checked: true, checkedOn: today(), condition, note: note || undefined }
              : record,
          ),
        ),

      observations,
      sendObservation: (teamId, type, note) => {
        const supervisor = supervisorFor(teamId)
        if (!supervisor) return undefined
        const observation: Observation = {
          id: newId('ob'),
          teamId,
          supervisorId: supervisor.id,
          type,
          note,
          date: today(),
          status: 'sent',
        }
        setObservations((current) => [observation, ...current])
        return observation
      },

      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      markNotificationRead: (id) =>
        setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item))),
      markAllNotificationsRead: () => setNotifications((current) => current.map((item) => ({ ...item, read: true }))),

      conversations,
      sendMessage: (conversationId, text) =>
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [
                    ...conversation.messages,
                    { id: newId('m'), fromMe: true, text, at: new Date().toISOString() },
                  ],
                }
              : conversation,
          ),
        ),
      openConversation: (conversationId) =>
        setConversations((current) =>
          // Keep the same array when already read, so opening a thread never triggers a needless update.
          current.some((conversation) => conversation.id === conversationId && conversation.unread)
            ? current.map((conversation) => (conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation))
            : current,
        ),

      toasts,
      showToast,

      signedOut,
      setSignedOut,
      resetDemo: () => {
        setAttendanceMap(attendanceSeed)
        setAvailability(availabilitySeed)
        setNotices(noticesSeed)
        setHandover(handoverSeed)
        setObservations(observationsSeed)
        setNotifications(notificationsSeed)
        setConversations(conversationsSeed)
      },
    }),
    [
      attendance,
      availability,
      notices,
      handover,
      observations,
      notifications,
      conversations,
      toasts,
      signedOut,
      addNotice,
      showToast,
      setAttendanceMap,
      setAvailability,
      setHandover,
      setObservations,
      setNotifications,
      setConversations,
      setNotices,
      setSignedOut,
    ],
  )

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>
}
