export type ObservationType = 'repeatedAbsence' | 'notWorking' | 'readyMade' | 'misuse' | 'unsafe' | 'general' | 'positive'
export type ObservationStatus = 'sent' | 'seen' | 'followUp'

/** An observation the Workshop Manager reports; the supervisor makes any academic decision. */
export type Observation = {
  id: string
  teamId: string
  supervisorId: string
  type: ObservationType
  note: string
  date: string
  status: ObservationStatus
}

export const observationTypes: ObservationType[] = [
  'repeatedAbsence',
  'notWorking',
  'readyMade',
  'misuse',
  'unsafe',
  'general',
  'positive',
]

export const observationsSeed: Observation[] = [
  {
    id: 'ob1',
    teamId: 'G12',
    supervisorId: 'sv2',
    type: 'repeatedAbsence',
    note: 'Both members missed most workshop sessions in the last two weeks.',
    date: '2026-10-22',
    status: 'followUp',
  },
  {
    id: 'ob2',
    teamId: 'G24',
    supervisorId: 'sv4',
    type: 'readyMade',
    note: 'The plotter frame arrived fully assembled; little build work seen at the table.',
    date: '2026-10-20',
    status: 'seen',
  },
  {
    id: 'ob3',
    teamId: 'G09',
    supervisorId: 'sv4',
    type: 'positive',
    note: 'Team works steadily and keeps the table and tools tidy.',
    date: '2026-10-16',
    status: 'seen',
  },
  {
    id: 'ob4',
    teamId: 'G05',
    supervisorId: 'sv1',
    type: 'unsafe',
    note: 'Soldering iron left switched on after the session ended.',
    date: '2026-10-23',
    status: 'sent',
  },
]

export type NoticeKind = 'unavailable' | 'fullDay' | 'closed' | 'schedule' | 'returnItems' | 'general'

/** `all` reaches every workshop student; otherwise the audience is a team id. */
export type Notice = {
  id: string
  audience: 'all' | string
  kind: NoticeKind
  /** Text as sent. Seeded notices omit it and render from the kind's template instead. */
  message?: string
  params?: Record<string, string>
  sentAt: string
}

export const composableNoticeKinds: NoticeKind[] = ['unavailable', 'closed', 'schedule', 'returnItems', 'general']

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

export const noticesSeed: Notice[] = [
  { id: 'nt1', audience: 'all', kind: 'returnItems', sentAt: hoursAgo(26) },
  { id: 'nt2', audience: 'G12', kind: 'general', params: { team: 'G12' }, sentAt: hoursAgo(49) },
  { id: 'nt3', audience: 'all', kind: 'schedule', sentAt: hoursAgo(75) },
]

export type NotificationKind = 'attendance' | 'managerAway' | 'returnReminder' | 'supervisorReply' | 'notice'

export type WorkshopNotification = {
  id: string
  kind: NotificationKind
  params: Record<string, string>
  at: string
  read: boolean
  /** Route the notification opens. */
  to: string
}

export const notificationsSeed: WorkshopNotification[] = [
  { id: 'nf1', kind: 'attendance', params: { time: '08:30' }, at: hoursAgo(0.4), read: false, to: '/attendance' },
  { id: 'nf2', kind: 'supervisorReply', params: { supervisor: 'Dr. Rana Yousef', team: 'G12' }, at: hoursAgo(1.5), read: false, to: '/supervisor-notes' },
  { id: 'nf3', kind: 'returnReminder', params: { count: '3' }, at: hoursAgo(5), read: false, to: '/handover' },
  { id: 'nf4', kind: 'managerAway', params: { from: '11:00', until: '12:00' }, at: hoursAgo(27), read: true, to: '/notices' },
  { id: 'nf5', kind: 'notice', params: { date: '2026-10-29' }, at: hoursAgo(50), read: true, to: '/notices' },
]

/** The Workshop Manager's normal working hours ("HH:mm"). */
export const workingHours = { start: '08:00', end: '15:30' }
