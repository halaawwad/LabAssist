import type { LucideIcon } from "lucide-react-native";
import {
  ArrowLeftRight,
  Bell,
  Box,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  CircuitBoard,
  ClipboardList,
  Ellipsis,
  FileText,
  FolderKanban,
  GraduationCap,
  House,
  LayoutGrid,
  ListChecks,
  Map,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Package,
  Settings,
  TriangleAlert,
  User,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react-native";

export type NavRole = "student" | "supervisor" | "workshop" | "department";

export type NavItem = {
  /** Page id: the last route segment, or the Department section id. */
  id: string;
  /** Header title. */
  en: string;
  ar: string;
  /** Shorter bottom-tab label, when the title is too long for a tab. */
  tab?: [en: string, ar: string];
  icon: LucideIcon;
};

export type NavSectionId = "project" | "workshop" | "communication" | "account";

export type NavSection = { id: NavSectionId; items: NavItem[] };

export const sectionTitles: Record<NavSectionId, [en: string, ar: string]> = {
  project: ["Project", "المشروع"],
  workshop: ["Workshop", "الورشة"],
  communication: ["Communication", "التواصل"],
  account: ["Account", "الحساب"],
};

const home: NavItem = { id: "dashboard", en: "Home", ar: "الرئيسية", icon: House };
const messages: NavItem = { id: "messages", en: "Messages", ar: "الرسائل", icon: MessageSquare };
export const moreItem: NavItem = { id: "more", en: "More", ar: "المزيد", icon: Ellipsis };
const notifications: NavItem = {
  id: "notifications",
  en: "Notifications",
  ar: "الإشعارات",
  icon: Bell,
};
const meetings: NavItem = { id: "meetings", en: "Meetings", ar: "الاجتماعات", icon: CalendarDays };
const profile: NavItem = { id: "profile", en: "My Profile", ar: "ملفي الشخصي", icon: User };
const settings: NavItem = { id: "settings", en: "Settings", ar: "الإعدادات", icon: Settings };

/** Bottom tabs: the main navigation, 4–5 per role, always ending with More. */
export const roleTabs: Record<NavRole, NavItem[]> = {
  student: [
    home,
    {
      id: "project",
      en: "My Project",
      ar: "مشروعي",
      tab: ["Project", "المشروع"],
      icon: FolderKanban,
    },
    { id: "reports", en: "Reports", ar: "التقارير", icon: FileText },
    messages,
    moreItem,
  ],
  supervisor: [
    home,
    {
      id: "projects",
      en: "My Projects",
      ar: "مشاريعي",
      tab: ["Projects", "المشاريع"],
      icon: FolderKanban,
    },
    {
      id: "reports",
      en: "Weekly Reports",
      ar: "التقارير الأسبوعية",
      tab: ["Reports", "التقارير"],
      icon: FileText,
    },
    messages,
    moreItem,
  ],
  workshop: [
    home,
    { id: "attendance", en: "Attendance", ar: "الحضور", icon: CalendarCheck },
    { id: "map", en: "Workshop Map", ar: "خريطة الورشة", tab: ["Map", "الخريطة"], icon: Map },
    messages,
    moreItem,
  ],
  department: [
    { id: "Overview", en: "Home", ar: "الرئيسية", icon: House },
    { id: "Accounts", en: "Accounts", ar: "الحسابات", icon: Users },
    { id: "Teams", en: "Groups", ar: "المجموعات", icon: LayoutGrid },
    { id: "Messages", en: "Messages", ar: "الرسائل", icon: MessageSquare },
    moreItem,
  ],
};

/** Every remaining destination, grouped as settings-style rows on More. */
export const moreSections: Record<NavRole, NavSection[]> = {
  student: [
    {
      id: "project",
      items: [
        { id: "team", en: "Team", ar: "الفريق", icon: Users },
        { id: "tasks", en: "Tasks", ar: "المهام", icon: ListChecks },
        { id: "issues", en: "Issues", ar: "المشكلات", icon: TriangleAlert },
        { id: "parts", en: "Bill of Materials", ar: "قائمة المواد", icon: Package },
        { id: "budget", en: "Budget", ar: "الميزانية", icon: Wallet },
      ],
    },
    {
      id: "workshop",
      items: [
        { id: "lab", en: "3D Lab", ar: "المختبر ثلاثي الأبعاد", icon: Box },
        { id: "circuits", en: "My Circuits", ar: "دوائري", icon: CircuitBoard },
        { id: "catalog", en: "Component Catalog", ar: "دليل المكونات", icon: LayoutGrid },
        { id: "offers", en: "Workshop Inventory", ar: "مخزون الورشة", icon: Warehouse },
        { id: "learning", en: "Learning Hub", ar: "مركز التعلم", icon: GraduationCap },
        { id: "workshop", en: "Workshop notices", ar: "إعلانات الورشة", icon: Megaphone },
      ],
    },
    { id: "communication", items: [meetings, notifications] },
    { id: "account", items: [profile, settings] },
  ],
  supervisor: [
    {
      id: "project",
      items: [
        { id: "students", en: "Students", ar: "الطلاب", icon: Users },
        { id: "progress", en: "Progress", ar: "التقدم", icon: ChartColumn },
        { id: "tasks", en: "Tasks", ar: "المهام", icon: ClipboardList },
        { id: "issues", en: "Issues", ar: "المشكلات", icon: TriangleAlert },
        { id: "finalReports", en: "Final Reports", ar: "التقارير النهائية", icon: FileText },
      ],
    },
    { id: "communication", items: [meetings, notifications] },
    { id: "account", items: [profile, settings] },
  ],
  workshop: [
    {
      id: "workshop",
      items: [
        { id: "handover", en: "Team Handovers", ar: "تسليمات الفرق", icon: ArrowLeftRight },
        { id: "notices", en: "Notices", ar: "الإعلانات", icon: Megaphone },
        { id: "observations", en: "Supervisor Notes", ar: "ملاحظات المشرفين", icon: NotebookPen },
      ],
    },
    { id: "communication", items: [notifications] },
    { id: "account", items: [profile, settings] },
  ],
  // Language and Log out are added to every Account section by the More screen.
  // Department sections are all tabs; Account reuses the shared profile/settings pattern.
  department: [{ id: "account", items: [profile, settings] }],
};

export function isTabPage(role: NavRole, page: string) {
  return roleTabs[role].some((item) => item.id === page);
}

export function findNavItem(role: NavRole, page: string): NavItem | undefined {
  return (
    roleTabs[role].find((item) => item.id === page) ??
    moreSections[role].flatMap((section) => section.items).find((item) => item.id === page)
  );
}

/** Route for a role page. Department sections are local state, not routes. */
export function pageHref(role: Exclude<NavRole, "department">, page: string) {
  return role === "student" && page === "dashboard" ? "/native" : `/native/${role}/${page}`;
}
