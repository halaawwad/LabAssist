import { recordHandover as saveHandover } from "../../../../shared/web/handover";
import { assignWorkshopTeam, removeWorkshopTeam } from "../../../../shared/web/workshopAllocation";
import { workshopTables } from "../data/workshopTables";
import { teams } from "../data/teams";
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
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Hebron', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useLocalState('table-allocations.v1', workshopTables)
  const [legacyAttendance, setAttendanceMap] = useLocalState('attendance', attendanceSeed)
  const [attendanceLedger, setAttendanceLedger] = useLocalState<{ version: number; days: Record<string, Record<string, AttendanceStatus>>; history: { day: string; studentId: string; status: AttendanceStatus; at: string }[] }>('attendance-ledger.v1', { version: 1, days: {}, history: [] })
  const attendance = useMemo(() => ({ ...legacyAttendance, ...attendanceLedger.days[today()] }), [legacyAttendance, attendanceLedger])
  const [availability, setAvailability] = useLocalState('availability', availabilitySeed)
  const [notices, setNotices] = useLocalState('notices', noticesSeed)
  const [handover, setHandover] = useLocalState('handover', handoverSeed)
  const [observations, setObservations] = useLocalState('observations', observationsSeed)
  const [notifications, setNotifications] = useLocalState('notifications', notificationsSeed)
  const [conversations, setConversations] = useLocalState('conversations', conversationsSeed)
  const [signedOut, setSignedOut] = useLocalState('signedOut', true)
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
      tables,
      assignTable: (teamId, code) => {
        if (!teams.some(t => t.id === teamId)) throw new Error("Choose an existing project group.")
        setTables(current => assignWorkshopTeam(current, teamId, code))
      },
      releaseTable: (teamId, code) => setTables(current => removeWorkshopTeam(current, teamId, code)),
      recordHandover: (teamId, items) => {
        if (!teams.some(t => t.id === teamId) || !items.length || items.some(i => !i.trim()) || new Set(items).size !== items.length) throw new Error("Choose a project and distinct nonempty item names.")
        setHandover(current => saveHandover(current, teamId, items, today()))
      },
      attendance,
      attendanceForDay: (day) => day === today() ? attendance : attendanceLedger.days[day] ?? {},
      setAttendance: (studentIds, status, day = today()) => {
        const age = (Date.parse(today()) - Date.parse(day)) / 86400000
        if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(age) || new Date(day).toISOString().slice(0, 10) !== day || age < 0 || age > 7) throw new Error('Attendance edits are limited to today and the previous seven days.')
        if (!studentIds.length || studentIds.some(id => !students.some(s => s.id === id)) || !['present', 'absent'].includes(status)) throw new Error('Choose existing students and a valid status.')
        const ids = [...new Set(studentIds)]
        setAttendanceLedger(current => ({ ...current, days: { ...current.days, [day]: { ...current.days[day], ...Object.fromEntries(ids.map(id => [id, status])) } }, history: [...current.history, ...ids.filter(id => current.days[day]?.[id] !== status).map(studentId => ({ day, studentId, status, at: new Date().toISOString() }))] }))
      },

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
      checkReturn: (teamId, condition, note) => {
        if (!['good', 'damaged', 'missing'].includes(condition) || (condition !== 'good' && !note?.trim())) throw new Error("Describe damaged or missing items.")
        if (!handover.some(record => record.teamId === teamId)) throw new Error("No handover exists for this project.")
        setHandover((current) =>
          current.map((record) =>
            record.teamId === teamId
              ? { ...record, checked: true, checkedOn: today(), condition, note: note || undefined, history: [...(record.history ?? []), { ...record, history: undefined }] }
              : record,
          ),
        )
      },

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
      tables,
      attendance,
      attendanceLedger,
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
      setAttendanceLedger,
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
