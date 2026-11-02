// Supervisor navigation, mirroring the web sidebar (frontend/supervisor/src/data/supervisor/supervisorMockData.ts).
// A phone tab bar holds five items, so the rest of the sidebar lives under "More".
import type { Href } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import Bell from "lucide-react-native/icons/bell";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ChartColumn from "lucide-react-native/icons/chart-column";
import CheckSquare from "lucide-react-native/icons/square-check-big";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import FileText from "lucide-react-native/icons/file-text";
import Folder from "lucide-react-native/icons/folder";
import Home from "lucide-react-native/icons/house";
import LayoutGrid from "lucide-react-native/icons/layout-grid";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Settings from "lucide-react-native/icons/settings";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import User from "lucide-react-native/icons/user";
import Users from "lucide-react-native/icons/users";

export type SupervisorTabId = "dashboard" | "projects" | "reports" | "messages" | "more";

export type SupervisorSectionId =
  | "students"
  | "progress"
  | "tasks"
  | "issues"
  | "meetings"
  | "finalReports"
  | "notifications"
  | "profile"
  | "settings";

/** Every page that has a title under `supervisor.nav.`. */
export type SupervisorPageId = Exclude<SupervisorTabId, "more"> | SupervisorSectionId;

export type SupervisorTab = {
  id: SupervisorTabId;
  /** Route name inside the (supervisor) tabs layout. */
  route: string;
  icon: LucideIcon;
};

export const supervisorTabs: SupervisorTab[] = [
  { id: "dashboard", route: "supervisor/dashboard", icon: Home },
  { id: "projects", route: "supervisor/projects", icon: Folder },
  { id: "reports", route: "supervisor/reports", icon: CheckSquare },
  { id: "messages", route: "supervisor/messages", icon: MessageCircle },
  { id: "more", route: "supervisor/more", icon: LayoutGrid },
];

export type SupervisorSection = {
  id: SupervisorSectionId;
  href: Href;
  icon: LucideIcon;
  /** The web keeps these in the sidebar footer. */
  group: "supervision" | "account";
};

export const supervisorSections: SupervisorSection[] = [
  { id: "students", href: "/supervisor/more/students", icon: Users, group: "supervision" },
  { id: "progress", href: "/supervisor/more/progress", icon: ChartColumn, group: "supervision" },
  { id: "tasks", href: "/supervisor/more/tasks", icon: ClipboardList, group: "supervision" },
  { id: "issues", href: "/supervisor/more/issues", icon: TriangleAlert, group: "supervision" },
  { id: "meetings", href: "/supervisor/more/meetings", icon: CalendarDays, group: "supervision" },
  {
    id: "finalReports",
    href: "/supervisor/more/final-reports",
    icon: FileText,
    group: "supervision",
  },
  { id: "notifications", href: "/supervisor/more/notifications", icon: Bell, group: "account" },
  { id: "profile", href: "/supervisor/more/profile", icon: User, group: "account" },
  { id: "settings", href: "/supervisor/more/settings", icon: Settings, group: "account" },
];

export function sectionHref(id: SupervisorSectionId): Href {
  return supervisorSections.find((section) => section.id === id)?.href ?? "/supervisor/dashboard";
}

export const pageIcons: Record<SupervisorPageId, LucideIcon> = {
  dashboard: Home,
  projects: Folder,
  reports: CheckSquare,
  messages: MessageCircle,
  students: Users,
  progress: ChartColumn,
  tasks: ClipboardList,
  issues: TriangleAlert,
  meetings: CalendarDays,
  finalReports: FileText,
  notifications: Bell,
  profile: User,
  settings: Settings,
};
