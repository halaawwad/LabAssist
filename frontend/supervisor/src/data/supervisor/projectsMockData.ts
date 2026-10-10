// Mock data for the Supervisor "My Projects" page. Shaped so it can be replaced by API data later.
//
// Wearable and irrigation thumbnails are Unsplash photos (Unsplash License):
// unsplash.com/photos/42d9995fb5b6 (Al Amin Mir) and unsplash.com/photos/fe0390adce24 (Jonathan Kemper).
import greenhouseImage from '../../assets/supervisor-project-greenhouse.png'
import irrigationImage from '../../assets/supervisor-project-irrigation.jpg'
import robotImage from '../../assets/supervisor-project-robot.png'
import wearableImage from '../../assets/supervisor-project-wearable.jpg'
import weatherImage from '../../assets/supervisor-project-weather.png'

export type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed'

export type SupervisedProject = {
  name: string
  code: string
  team?: string
  status: ProjectStatus
  progress: number
  /** Change in overall progress since last week, in percentage points. */
  weeklyChange: number
  students: number
  nextMilestone: string
  milestoneDate: string
  openIssues: number
  image: string
}

export type ReviewLocation = 'Workshop' | 'Supervisor Office' | 'Online Meeting'
export type ReviewKind = 'progress' | 'design' | 'final' | 'demo'

export type UpcomingReview = {
  id: string
  month: string
  day: string
  /** Short label on the timeline; `title` is shown in the details card. */
  label: string
  title: string
  /** Short project name shown on the timeline; the full name appears in the details card. */
  projectShort: string
  project: string
  time: string
  location: ReviewLocation
  team: string
  kind: ReviewKind
  status: ProjectStatus
}

export const supervisedProjects: SupervisedProject[] = [
  {
    name: 'Autonomous Delivery Robot',
    code: 'EE-402',
    team: 'Team Alpha',
    status: 'On Track',
    progress: 68,
    weeklyChange: 12,
    students: 3,
    nextMilestone: 'Prototype navigation test',
    milestoneDate: 'Oct 28, 2026',
    openIssues: 1,
    image: robotImage,
  },
  {
    name: 'Smart Greenhouse Monitor',
    code: 'EE-317',
    team: 'Team Delta',
    status: 'At Risk',
    progress: 42,
    weeklyChange: 4,
    students: 2,
    nextMilestone: 'Sensor calibration review',
    milestoneDate: 'Nov 04, 2026',
    openIssues: 2,
    image: greenhouseImage,
  },
  {
    name: 'Solar-Powered Weather Station',
    code: 'EE-299',
    status: 'Delayed',
    progress: 25,
    weeklyChange: 3,
    students: 3,
    nextMilestone: 'Power budget validation',
    milestoneDate: 'Nov 12, 2026',
    openIssues: 3,
    image: weatherImage,
  },
  {
    name: 'Wearable Health Monitor',
    code: 'HW07',
    status: 'On Track',
    progress: 45,
    weeklyChange: 5,
    students: 2,
    nextMilestone: 'Hardware integration',
    milestoneDate: 'Nov 20, 2026',
    openIssues: 1,
    image: wearableImage,
  },
  {
    name: 'Smart Irrigation System',
    code: 'HW03',
    status: 'On Track',
    progress: 38,
    weeklyChange: 5,
    students: 2,
    nextMilestone: 'Field testing',
    milestoneDate: 'Nov 24, 2026',
    openIssues: 0,
    image: irrigationImage,
  },
]

export const upcomingReviews: UpcomingReview[] = [
  {
    id: 'review-1',
    month: 'OCT',
    day: '20',
    label: 'Weekly Progress',
    title: 'Weekly Progress Review',
    projectShort: 'Autonomous Robot',
    project: 'Autonomous Delivery Robot',
    time: '10:00 AM',
    location: 'Workshop',
    team: 'Team Alpha',
    kind: 'progress',
    status: 'On Track',
  },
  {
    id: 'review-2',
    month: 'OCT',
    day: '21',
    label: 'Design Review',
    title: 'Design Review',
    projectShort: 'Greenhouse Monitor',
    project: 'Smart Greenhouse Monitor',
    time: '1:00 PM',
    location: 'Supervisor Office',
    team: 'Team Delta',
    kind: 'design',
    status: 'At Risk',
  },
  {
    id: 'review-3',
    month: 'OCT',
    day: '22',
    label: 'Final Design Review',
    title: 'Final Design Review',
    projectShort: 'Weather Station',
    project: 'Solar-Powered Weather Station',
    time: '10:00 AM',
    location: 'Supervisor Office',
    team: 'EE-299 team',
    kind: 'final',
    status: 'Delayed',
  },
  {
    id: 'review-4',
    month: 'OCT',
    day: '24',
    label: 'Prototype Demo',
    title: 'Prototype Demo',
    projectShort: 'Wearable Monitor',
    project: 'Wearable Health Monitor',
    time: '2:00 PM',
    location: 'Workshop',
    team: 'HW07 team',
    kind: 'demo',
    status: 'On Track',
  },
]
