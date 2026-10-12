// Mock notifications for the Supervisor portal, shaped like a notifications endpoint could return them.
// Text is not stored: each item names a template (translated under `notifications.templates.`)
// plus the values to fill in, so the list follows the selected language.
export type NotificationType = 'meeting' | 'report' | 'attendance' | 'issue' | 'workshop'

export const notificationTypes: NotificationType[] = ['meeting', 'report', 'attendance', 'issue', 'workshop']

export type NotificationTemplate =
  | 'meetingTomorrow'
  | 'meetingScheduled'
  | 'reportSubmitted'
  | 'reportLate'
  | 'repeatedAbsence'
  | 'absenceLogged'
  | 'projectDelayed'
  | 'workshopMaintenance'
  | 'workshopBackDoor'
  | 'managerAbsentToday'
  | 'managerAbsentTomorrow'
  | 'managerAbsentOnDate'

export type SupervisorNotification = {
  id: string
  type: NotificationType
  template: NotificationTemplate
  /** Template values. `date` (ISO), `time` and `closesAt` (HH:mm) are formatted for the current language. */
  params: Record<string, string | number>
  /** Age when the mock is loaded; turned into a timestamp by the notifications provider. */
  minutesAgo: number
  read: boolean
  /** Route of the related section: query parameters preselect it, a hash scrolls to it. */
  target: string
}

const hours = 60
const days = 24 * hours

export const supervisorNotifications: SupervisorNotification[] = [
  {
    id: 'notif-1',
    type: 'meeting',
    template: 'meetingTomorrow',
    params: { team: 'Team Alpha', project: 'LA-101', time: '10:00' },
    minutesAgo: 45,
    read: false,
    target: '/supervisor/dashboard#meetings-title',
  },
  {
    id: 'notif-2',
    type: 'report',
    template: 'reportSubmitted',
    params: { week: 8, code: 'HW17', project: 'Autonomous Delivery Robot' },
    minutesAgo: 2 * hours,
    read: false,
    target: '/supervisor/tasks?open=reports',
  },
  {
    id: 'notif-3',
    type: 'attendance',
    template: 'repeatedAbsence',
    params: { student: 'Yazan Khalil' },
    minutesAgo: 5 * hours,
    read: false,
    target: '/supervisor/students?attendance=absence',
  },
  {
    id: 'notif-6',
    type: 'report',
    template: 'reportLate',
    params: { code: 'HW28', week: 7 },
    minutesAgo: 2 * days,
    read: true,
    target: '/supervisor/tasks?open=reports',
  },
  {
    id: 'notif-7',
    type: 'meeting',
    template: 'meetingScheduled',
    params: { team: 'Team Delta', project: 'LA-205', date: '2026-10-12', time: '14:00' },
    minutesAgo: 2 * days + 3 * hours,
    read: true,
    target: '/supervisor/dashboard#meetings-title',
  },
  {
    id: 'notif-8',
    type: 'issue',
    template: 'projectDelayed',
    params: { code: 'HW28', project: 'Air Quality Monitoring' },
    minutesAgo: 3 * days,
    read: true,
    target: '/supervisor/progress?project=HW28',
  },
  {
    id: 'notif-9',
    type: 'attendance',
    template: 'absenceLogged',
    params: { student: 'Omar Samer' },
    minutesAgo: 3 * days + 4 * hours,
    read: true,
    target: '/supervisor/students?attendance=absence',
  },
  {
    id: 'notif-10',
    type: 'workshop',
    template: 'workshopMaintenance',
    params: { date: '2026-10-15' },
    minutesAgo: 4 * days,
    read: true,
    target: '/supervisor/projects#mp-reviews-title',
  },
]

// Inputs for the context-aware Workshop notifications (see `workshopNotifications.ts`).

/** The front door (Workshop Manager side) closes daily at this time; later visits use the back door. */
export const workshopFrontDoorClosesAt = '15:30'

/** A day the Workshop Manager reported they will be absent. */
export type WorkshopManagerAbsence = {
  id: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** Age of the report when the mock is loaded. */
  minutesAgo: number
}

export const workshopManagerAbsences: WorkshopManagerAbsence[] = [
  { id: 'absence-1', date: '2026-10-20', minutesAgo: 6 * hours },
  // No Workshop meeting on this date, so it produces no notification.
  { id: 'absence-2', date: '2026-10-21', minutesAgo: 1 * days + 2 * hours },
]
