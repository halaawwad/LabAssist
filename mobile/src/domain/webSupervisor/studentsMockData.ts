export type Attendance = 'present' | 'absence'
export type StudentStatus = 'On Track' | 'At Risk' | 'Delayed'
/** Translation key under `students.issues.`. */
type StudentIssue = 'testingDelay' | 'none' | 'missingComponents' | 'reportPending' | 'slowProgress'

export type SupervisedStudent = {
  name: string
  initials: string
  universityId: string
  project: string
  progress: number
  issue: StudentIssue
  issueTone: 'neutral' | 'orange' | 'red'
  attendance: Attendance
  repeatedAbsence?: boolean
  status: StudentStatus
  updateRequests?: string[]
  avatarTone: 'green' | 'blue' | 'gold' | 'violet' | 'coral'
}

export const supervisedStudents: SupervisedStudent[] = [
  {
    name: 'Ahmad Ali',
    initials: 'AA',
    universityId: '12217669',
    project: 'Smart Greenhouse Monitor',
    progress: 62,
    issue: 'testingDelay',
    issueTone: 'red',
    attendance: 'absence',
    repeatedAbsence: true,
    status: 'At Risk',
    avatarTone: 'green',
  },
  {
    name: 'Lina Hasan',
    initials: 'LH',
    universityId: '12199821',
    project: 'Autonomous Delivery Robot',
    progress: 80,
    issue: 'none',
    issueTone: 'neutral',
    attendance: 'present',
    status: 'On Track',
    avatarTone: 'blue',
  },
  {
    name: 'Omar Samer',
    initials: 'OS',
    universityId: '12214500',
    project: 'Solar Weather Station',
    progress: 45,
    issue: 'missingComponents',
    issueTone: 'red',
    attendance: 'absence',
    status: 'Delayed',
    avatarTone: 'gold',
  },
  {
    name: 'Sara Nasser',
    initials: 'SN',
    universityId: '12218840',
    project: 'Irrigation Control System',
    progress: 71,
    issue: 'reportPending',
    issueTone: 'orange',
    attendance: 'present',
    status: 'At Risk',
    avatarTone: 'violet',
  },
  {
    name: 'Yazan Khalil',
    initials: 'YK',
    universityId: '12213220',
    project: 'Delivery Robot',
    progress: 38,
    issue: 'slowProgress',
    issueTone: 'red',
    attendance: 'absence',
    repeatedAbsence: true,
    status: 'Delayed',
    avatarTone: 'coral',
  },
]
