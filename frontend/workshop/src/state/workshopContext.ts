import { createContext, useContext } from 'react'
import type { Notice, NoticeKind, Observation, ObservationType, WorkshopNotification } from '../data/activity'
import type { HandoverRecord, ItemCondition } from '../data/handover'
import type { Conversation } from '../data/messages'

export type AttendanceStatus = 'present' | 'absent'
export type AvailabilityStatus = 'onDuty' | 'away' | 'absent'

export type Availability = {
  status: AvailabilityStatus
  /** "HH:mm" window for a temporary absence. */
  from?: string
  until?: string
  reason?: string
}

export type Toast = { id: number; text: string }

export type WorkshopContextValue = {
  attendance: Record<string, AttendanceStatus>
  setAttendance: (studentIds: string[], status: AttendanceStatus) => void

  availability: Availability
  notifyTemporaryAbsence: (from: string, until: string, reason: string) => void
  notifyFullDayAbsence: (reason: string) => void
  backOnDuty: () => void

  notices: Notice[]
  sendNotice: (audience: string, kind: NoticeKind, message: string) => void

  handover: HandoverRecord[]
  checkReturn: (teamId: string, condition: ItemCondition, note: string) => void

  observations: Observation[]
  sendObservation: (teamId: string, type: ObservationType, note: string) => Observation | undefined

  notifications: WorkshopNotification[]
  unreadCount: number
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void

  conversations: Conversation[]
  sendMessage: (conversationId: string, text: string) => void
  openConversation: (conversationId: string) => void

  toasts: Toast[]
  showToast: (text: string) => void

  signedOut: boolean
  setSignedOut: (signedOut: boolean) => void
  resetDemo: () => void
}

export const WorkshopContext = createContext<WorkshopContextValue | null>(null)

export function useWorkshop() {
  const context = useContext(WorkshopContext)
  if (!context) throw new Error('useWorkshop must be used inside <WorkshopProvider>.')
  return context
}
