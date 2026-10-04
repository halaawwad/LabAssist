import {
  AlertTriangle,
  Bell,
  Box,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  Clock3,
  ClipboardList,
  Cpu,
  FileText,
  Folder,
  FolderOpen,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  TriangleAlert,
  User,
  Users,
  Flag,
  type LucideIcon,
} from 'lucide-react'
import arduinoOverview from '../../assets/supervisor-arduino-overview.png'
import greenhouseImage from '../../assets/supervisor-project-greenhouse.png'
import robotImage from '../../assets/supervisor-project-robot.png'
import weatherImage from '../../assets/supervisor-project-weather.png'

export type SidebarItem = {
  label: string
  icon: LucideIcon
  active?: boolean
  badge?: number
}

export type StatCard = {
  label: string
  value: string
  trend: string
  tone: 'green' | 'orange' | 'blue' | 'red'
  icon: LucideIcon
  highlighted?: boolean
}

export type ProgressItem = {
  label: string
  value: number
}

export type Meeting = {
  project: string
  team: string
  date: string
  time: string
  tone: 'green' | 'blue'
}

export type Activity = {
  initials: string
  student: string
  action: string
  project: string
  time: string
  tone: 'blue' | 'green' | 'violet'
  status: 'report' | 'task' | 'model'
}

export type ProjectStatus = 'On Track' | 'At Risk' | 'Delayed'

export type Project = {
  name: string
  code: string
  team?: string
  progress: number
  status: ProjectStatus
  milestone: string
  deadline: string
  issues: number
  image: string
  students: string[]
  featured?: boolean
}

export type AttentionItem = {
  title: string
  project: string
  due: string
  tone: 'red' | 'orange' | 'blue'
  icon: LucideIcon
}

export type OverviewItem = {
  value: string
  label: string
  icon: LucideIcon
}

export type Review = {
  time: string
  title: string
  project: string
  place: string
  tone: 'green' | 'orange' | 'red' | 'teal' | 'blue'
}

export type ReviewDay = {
  date: string
  reviews: Review[]
}

export const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', icon: Home, active: true },
  { label: 'My Projects', icon: Folder },
  { label: 'Students', icon: Users },
  { label: 'Milestones', icon: Flag },
  { label: 'Tasks', icon: ClipboardList },
  { label: '3D Lab Review', icon: Box },
  { label: 'BOM & Parts', icon: Cpu },
  { label: 'Issues & Risks', icon: TriangleAlert },
  { label: 'Weekly Reports', icon: CheckSquare },
  { label: 'Meetings', icon: CalendarDays },
  { label: 'Messages', icon: MessageCircle },
  { label: 'Notifications', icon: Bell, badge: 3 },
  { label: 'Profile', icon: User },
  { label: 'Settings', icon: Settings },
  { label: 'Logout', icon: LogOut },
]

export const stats: StatCard[] = [
  {
    label: 'My Projects',
    value: '5',
    trend: '+1 this semester',
    tone: 'green',
    icon: Folder,
    highlighted: true,
  },
  {
    label: 'Delayed Projects',
    value: '1',
    trend: 'Needs attention',
    tone: 'orange',
    icon: CalendarDays,
  },
  {
    label: 'Reports to Review',
    value: '3',
    trend: 'This week',
    tone: 'blue',
    icon: ClipboardList,
  },
  {
    label: 'Open Issues',
    value: '4',
    trend: '2 high priority',
    tone: 'red',
    icon: TriangleAlert,
  },
]

export const progressItems: ProgressItem[] = [
  { label: 'Hardware Design', value: 100 },
  { label: 'Prototype', value: 80 },
  { label: 'Testing', value: 35 },
  { label: 'Final Report', value: 0 },
]

export const meetings: Meeting[] = [
  {
    project: 'Project LA-101',
    team: 'Team Alpha',
    date: 'Tomorrow',
    time: '10:00 AM',
    tone: 'green',
  },
  {
    project: 'Project LA-205',
    team: 'Team Delta',
    date: '12 Oct 2026',
    time: '2:00 PM',
    tone: 'blue',
  },
]

export const activities: Activity[] = [
  {
    initials: 'SA',
    student: 'Sara Ahmad',
    action: 'submitted a weekly report',
    project: 'LA-101',
    time: '2 hours ago',
    tone: 'blue',
    status: 'report',
  },
  {
    initials: 'OM',
    student: 'Omar Mahmoud',
    action: 'updated a task',
    project: 'LA-205',
    time: '4 hours ago',
    tone: 'green',
    status: 'task',
  },
]

export const projects: Project[] = [
  {
    name: 'Autonomous Delivery Robot',
    code: 'EE-402',
    team: 'Team Alpha',
    progress: 68,
    status: 'On Track',
    milestone: 'Prototype navigation test',
    deadline: 'Oct 28, 2026',
    issues: 1,
    image: robotImage,
    students: ['JL', 'SC', 'MR'],
    featured: true,
  },
  {
    name: 'Smart Greenhouse Monitor',
    code: 'EE-317',
    team: 'Team Delta',
    progress: 42,
    status: 'At Risk',
    milestone: 'Sensor calibration review',
    deadline: 'Nov 04, 2026',
    issues: 2,
    image: greenhouseImage,
    students: ['MK', 'TR'],
  },
  {
    name: 'Solar-Powered Weather Station',
    code: 'EE-299',
    progress: 25,
    status: 'Delayed',
    milestone: 'Power budget validation',
    deadline: 'Nov 12, 2026',
    issues: 3,
    image: weatherImage,
    students: ['DS', 'AL', 'YO'],
  },
]

export const attentionItems: AttentionItem[] = [
  {
    title: 'Review weekly report',
    project: 'Smart Irrigation System',
    due: 'Due Today',
    tone: 'red',
    icon: FileText,
  },
  {
    title: 'Milestone approval',
    project: 'Autonomous Delivery Robot',
    due: 'Due Tomorrow',
    tone: 'orange',
    icon: Flag,
  },
  {
    title: 'Feedback on circuit version',
    project: 'Greenhouse Monitor',
    due: 'Oct 22, 2026',
    tone: 'blue',
    icon: CheckCircle2,
  },
  {
    title: 'Review risk assessment',
    project: 'Solar-Powered Weather Station',
    due: 'Oct 24, 2026',
    tone: 'red',
    icon: AlertTriangle,
  },
]

export const overviewItems: OverviewItem[] = [
  { value: '3', label: 'Active Projects', icon: FolderOpen },
  { value: '1', label: 'Delayed', icon: Clock3 },
  { value: '5', label: 'Pending Reviews', icon: FileText },
  { value: '2', label: 'Open Issues', icon: AlertTriangle },
]

export const reviewDays: ReviewDay[] = [
  {
    date: 'Mon, Oct 20, 2026',
    reviews: [
      {
        time: '10:00',
        title: 'Weekly Progress Review',
        project: 'Autonomous Delivery Robot',
        place: 'Room B-201',
        tone: 'green',
      },
      {
        time: '13:00',
        title: 'Design Review',
        project: 'Smart Greenhouse Monitor',
        place: 'Online (Teams)',
        tone: 'orange',
      },
      {
        time: '15:30',
        title: 'Project Planning',
        project: 'Solar-Powered Weather Station',
        place: 'Room A-105',
        tone: 'red',
      },
    ],
  },
  {
    date: 'Tue, Oct 21, 2026',
    reviews: [
      {
        time: '09:00',
        title: 'Circuit Design Review',
        project: 'Smart Irrigation System',
        place: 'Room B-201',
        tone: 'teal',
      },
      {
        time: '11:00',
        title: 'Milestone Check',
        project: 'Autonomous Delivery Robot',
        place: 'Online (Teams)',
        tone: 'orange',
      },
      {
        time: '14:00',
        title: 'Prototype Demo',
        project: 'Greenhouse Monitor',
        place: 'Lab 1',
        tone: 'blue',
      },
    ],
  },
  {
    date: 'Wed, Oct 22, 2026',
    reviews: [
      {
        time: '10:00',
        title: 'Final Design Review',
        project: 'Solar-Powered Weather Station',
        place: 'Room A-105',
        tone: 'red',
      },
      {
        time: '16:00',
        title: 'Student Meeting',
        project: 'General Discussion',
        place: 'Online (Teams)',
        tone: 'teal',
      },
    ],
  },
]

export const supervisionOverviewImage = arduinoOverview
