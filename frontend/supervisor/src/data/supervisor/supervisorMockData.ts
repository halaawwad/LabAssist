import {
  Bell,
  CalendarDays,
  ChartColumn,
  CheckSquare,
  FileText,
  ClipboardList,
  Folder,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  TriangleAlert,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type SidebarItemId =
  | 'dashboard'
  | 'projects'
  | 'students'
  | 'progress'
  | 'tasks'
  | 'issues'
  | 'reports'
  | 'meetings'
  | 'messages'
  | 'finalReports'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'logout'

export type SidebarItem = {
  /** Also the translation key under `nav.`. */
  id: SidebarItemId
  icon: LucideIcon
  /** Items without a route are not built yet. */
  route?: string
  footer?: boolean
}

export type StatCard = {
  /** Translation key under `dashboard.stats.`. */
  id: 'myProjects' | 'delayed' | 'reports' | 'issues'
  value: string
  tone: 'green' | 'orange' | 'blue' | 'red'
  icon: LucideIcon
  highlighted?: boolean
}

export type ProgressItem = {
  /** Translation key under `dashboard.progressItems.`. */
  id: 'hardwareDesign' | 'prototype' | 'testing' | 'finalReport'
  value: number
}

export type Meeting = {
  projectCode: string
  team: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  /** 24-hour time (HH:mm). */
  time: string
  tone: 'green' | 'blue'
}

export type Activity = {
  initials: string
  student: string
  project: string
  hoursAgo: number
  tone: 'blue' | 'green' | 'violet'
  /** Also the translation key of the action under `dashboard.activity.`. */
  status: 'report' | 'task' | 'model'
}

export const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', icon: Home, route: '/supervisor/dashboard' },
  { id: 'projects', icon: Folder, route: '/supervisor/projects' },
  { id: 'students', icon: Users, route: '/supervisor/students' },
  { id: 'progress', icon: ChartColumn, route: '/supervisor/progress' },
  { id: 'tasks', icon: ClipboardList, route: '/supervisor/tasks' },
  { id: 'issues', icon: TriangleAlert, route: '/supervisor/issues' },
  { id: 'reports', icon: CheckSquare, route: '/supervisor/reports' },
  { id: 'meetings', icon: CalendarDays, route: '/supervisor/meetings' },
  { id: 'messages', icon: MessageCircle, route: '/supervisor/messages' },
  { id: 'finalReports', icon: FileText, route: '/supervisor/final-reports' },
  { id: 'notifications', icon: Bell, route: '/supervisor/notifications', footer: true },
  { id: 'profile', icon: User, route: '/supervisor/profile', footer: true },
  { id: 'settings', icon: Settings, route: '/supervisor/settings', footer: true },
  { id: 'logout', icon: LogOut, footer: true },
]

export const stats: StatCard[] = [
  { id: 'myProjects', value: '5', tone: 'green', icon: Folder, highlighted: true },
  { id: 'delayed', value: '1', tone: 'orange', icon: CalendarDays },
  { id: 'reports', value: '3', tone: 'blue', icon: ClipboardList },
  { id: 'issues', value: '4', tone: 'red', icon: TriangleAlert },
]

export const progressItems: ProgressItem[] = [
  { id: 'hardwareDesign', value: 100 },
  { id: 'prototype', value: 80 },
  { id: 'testing', value: 35 },
  { id: 'finalReport', value: 0 },
]

export const meetings: Meeting[] = [
  {
    projectCode: 'LA-101',
    team: 'Team Alpha',
    date: '2026-10-09',
    time: '10:00',
    tone: 'green',
  },
  {
    projectCode: 'LA-205',
    team: 'Team Delta',
    date: '2026-10-12',
    time: '14:00',
    tone: 'blue',
  },
]

export const activities: Activity[] = [
  {
    initials: 'SA',
    student: 'Sara Ahmad',
    project: 'LA-101',
    hoursAgo: 2,
    tone: 'blue',
    status: 'report',
  },
  {
    initials: 'OM',
    student: 'Omar Mahmoud',
    project: 'LA-205',
    hoursAgo: 4,
    tone: 'green',
    status: 'task',
  },
]
