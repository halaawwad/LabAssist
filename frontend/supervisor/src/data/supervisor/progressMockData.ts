// Mock data for the Supervisor Progress page. Each entry mirrors what a
// per-project progress endpoint could return, so it can be swapped for API data later.
//
// Progress photos are real hardware-prototype photos from Unsplash (Unsplash License):
// unsplash.com/photos/QsdV1KhCqys (RUT MIIT), unsplash.com/photos/mVJzfw2Zm7Y (Gabriel Vasiliu),
// unsplash.com/photos/vtg8tAdoWVQ (Vishnu Mohanan), unsplash.com/photos/9BkycB5U9iQ (Nandito F. Anggara).
import chassisAssemblyPhoto from '../../assets/supervisor-progress-chassis-assembly.jpg'
import hw17PrototypePhoto from '../../assets/supervisor-progress-hw17-prototype.jpg'
import motorDriversPhoto from '../../assets/supervisor-progress-motor-drivers.jpg'
import navigationTestingPhoto from '../../assets/supervisor-progress-navigation-testing.jpg'
import sensorTestingPhoto from '../../assets/supervisor-progress-sensor-testing.jpg'

export type ProgressStatus = 'On Track' | 'Attention' | 'Delayed'

export type ProjectStudent = {
  name: string
  initials: string
  universityId: string
}

export type ProgressEvidence = {
  title: string
  /** Short display date, e.g. "Oct 6". */
  date: string
  photo: string
}

export type ProjectIssue = {
  title: string
  detail: string
}

export type ProjectProgress = {
  code: string
  name: string
  status: ProgressStatus
  /** Latest student-uploaded prototype photo, if any. */
  photo?: string
  /** Short display date of the final deadline, e.g. "Dec 20". */
  finalDeadline: string
  /** Groups have 1–3 students. */
  students: ProjectStudent[]
  /** Actual overall progress (%) recorded at the end of each completed semester week. */
  weeklyProgress: number[]
  /** Index into `projectMilestones` of the stage the team is currently working on. */
  milestoneStage: number
  evidence: ProgressEvidence[]
  issues: ProjectIssue[]
  note: string
}

export const projectMilestones = ['Proposal', 'BOM', 'Circuit', 'Prototype', 'Testing', 'Final']

/** Weeks shown on the progress chart: the completed weeks plus a short look-ahead. */
export const progressChartWeeks = 10

const finalDeadline = 'Dec 20'

export const progressProjects: ProjectProgress[] = [
  {
    code: 'HW17',
    name: 'Autonomous Delivery Robot',
    status: 'On Track',
    photo: hw17PrototypePhoto,
    finalDeadline,
    students: [
      { name: 'Ahmad Khaled', initials: 'AK', universityId: '12217669' },
      { name: 'Sara Ali', initials: 'SA', universityId: '12218432' },
      { name: 'Omar Hasan', initials: 'OH', universityId: '12219811' },
    ],
    weeklyProgress: [8, 14, 20, 27, 35, 44, 54, 68],
    milestoneStage: 2,
    evidence: [
      { title: 'Chassis Assembly', date: 'Oct 6', photo: chassisAssemblyPhoto },
      { title: 'Motor Drivers Installed', date: 'Sep 30', photo: motorDriversPhoto },
      { title: 'Sensor Module Testing', date: 'Sep 23', photo: sensorTestingPhoto },
      { title: 'Navigation Testing', date: 'Sep 18', photo: navigationTestingPhoto },
    ],
    issues: [{ title: 'Inconsistent motor response', detail: 'Need to adjust motor driver configuration.' }],
    note: 'Good progress. Focus on navigation stability next week.',
  },
  {
    code: 'HW12',
    name: 'Robotic Arm',
    status: 'On Track',
    finalDeadline,
    students: [
      { name: 'Tareq Mansour', initials: 'TM', universityId: '12213357' },
      { name: 'Aya Barakat', initials: 'AB', universityId: '12215818' },
      { name: 'Hamza Qasem', initials: 'HQ', universityId: '12214472' },
    ],
    weeklyProgress: [15, 26, 38, 49, 60, 71, 82, 90],
    milestoneStage: 4,
    evidence: [],
    issues: [],
    note: 'Excellent progress. Prepare the demo video and the final report draft.',
  },
  {
    code: 'HW25',
    name: 'Solar Tracking System',
    status: 'On Track',
    finalDeadline,
    students: [
      { name: 'Mohammad Odeh', initials: 'MO', universityId: '12216044' },
      { name: 'Rana Saleh', initials: 'RS', universityId: '12217781' },
      { name: 'Khaled Amer', initials: 'KA', universityId: '12214093' },
    ],
    weeklyProgress: [10, 18, 26, 35, 46, 57, 70, 78],
    milestoneStage: 3,
    evidence: [],
    issues: [],
    note: 'Strong progress. Start logging power output to compare against a fixed panel.',
  },
  {
    code: 'HW41',
    name: 'Smart Home Automation',
    status: 'On Track',
    finalDeadline,
    students: [{ name: 'Rami Jaber', initials: 'RJ', universityId: '12217408' }],
    weeklyProgress: [7, 13, 20, 27, 34, 41, 48, 55],
    milestoneStage: 2,
    evidence: [],
    issues: [],
    note: 'Good pace for a one-person team. Keep the voice integration optional.',
  },
  {
    code: 'HW07',
    name: 'Wearable Health Monitor',
    status: 'Attention',
    finalDeadline,
    students: [
      { name: 'Dana Yousef', initials: 'DY', universityId: '12219034' },
      { name: 'Majd Hamdan', initials: 'MH', universityId: '12216620' },
    ],
    weeklyProgress: [6, 11, 17, 22, 28, 34, 40, 45],
    milestoneStage: 2,
    evidence: [],
    issues: [{ title: 'Noisy pulse readings while moving', detail: 'Add filtering before sending data to the app.' }],
    note: 'Steady work. Share the filtered sensor plots in the next weekly report.',
  },
  {
    code: 'HW03',
    name: 'Smart Irrigation System',
    status: 'Attention',
    finalDeadline,
    students: [
      { name: 'Lina Hasan', initials: 'LH', universityId: '12199821' },
      { name: 'Yousef Nasser', initials: 'YN', universityId: '12215530' },
    ],
    weeklyProgress: [5, 9, 14, 18, 22, 27, 33, 38],
    milestoneStage: 2,
    evidence: [],
    issues: [{ title: 'Pump relay overheating', detail: 'Relay module heats up during long watering cycles.' }],
    note: 'Progress is slower than planned. Prioritize the pump control loop before the dashboard.',
  },
  {
    code: 'HW28',
    name: 'Air Quality Monitoring',
    status: 'Delayed',
    finalDeadline,
    students: [
      { name: 'Sami Darwish', initials: 'SD', universityId: '12212894' },
      { name: 'Leen Abu Ali', initials: 'LA', universityId: '12218863' },
    ],
    weeklyProgress: [3, 6, 9, 12, 15, 19, 24, 28],
    milestoneStage: 1,
    evidence: [],
    issues: [
      { title: 'CO2 sensor not responding', detail: 'Check the I2C wiring and sensor address.' },
      { title: 'Weekly reports submitted late', detail: 'Two of the last three reports were late.' },
    ],
    note: 'The project is behind. Book a meeting this week to agree on a recovery plan.',
  },
]
