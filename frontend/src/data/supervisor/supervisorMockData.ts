import {
  Bell,
  Box,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Cpu,
  Folder,
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
  {
    initials: 'LF',
    student: 'Lina Fathi',
    action: 'published a new circuit version',
    project: 'LA-101',
    time: '6 hours ago',
    tone: 'violet',
    status: 'model',
  },
]
