import {
  BriefcaseBusiness,
  Bell,
  CalendarCheck,
  FileText,
  LogOut,
  Map as MapIcon,
  Megaphone,
  MessageSquareMore,
  Package,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavId =
  | 'dashboard'
  | 'map'
  | 'attendance'
  | 'notices'
  | 'handover'
  | 'supervisorNotes'
  | 'messages'
  | 'notifications'
  | 'settings'
  | 'logout'

export type NavItem = {
  id: NavId
  icon: LucideIcon
  /** Items without a route are actions (logout). */
  route?: string
}

/** Kept deliberately short: the Workshop Manager has no inventory, parts or academic sections. */
export const mainNav: NavItem[] = [
  { id: 'dashboard', icon: BriefcaseBusiness, route: '/dashboard' },
  { id: 'map', icon: MapIcon, route: '/map' },
  { id: 'attendance', icon: CalendarCheck, route: '/attendance' },
  { id: 'notices', icon: Megaphone, route: '/notices' },
  { id: 'handover', icon: Package, route: '/handover' },
  { id: 'supervisorNotes', icon: FileText, route: '/supervisor-notes' },
  { id: 'messages', icon: MessageSquareMore, route: '/messages' },
]

export const footerNav: NavItem[] = [
  { id: 'notifications', icon: Bell, route: '/notifications' },
  { id: 'settings', icon: Settings, route: '/settings' },
]

export const logoutNav: NavItem = { id: 'logout', icon: LogOut }
