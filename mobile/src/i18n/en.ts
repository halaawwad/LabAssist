import { supervisorEn } from "@/features/supervisor/i18n/en";

export const en = {
  app: {
    name: "LabAssist",
  },
  roles: {
    student: "Student",
    supervisor: "Supervisor",
    workshop: "Workshop Manager",
  },
  language: {
    label: "Language",
    en: "English",
    ar: "العربية",
    enShort: "EN",
    arShort: "ع",
  },
  common: {
    loading: "Loading…",
    retry: "Try again",
    viewAll: "View all",
    back: "Back",
    errorTitle: "Something went wrong",
    errorMessage: "We couldn't load this content. Check your connection and try again.",
  },
  dates: {
    today: "Today",
    tomorrow: "Tomorrow",
    justNow: "Just now",
    minutesAgo: { one: "{count} minute ago", other: "{count} minutes ago" },
    hoursAgo: { one: "{count} hour ago", other: "{count} hours ago" },
    daysAgo: { one: "{count} day ago", other: "{count} days ago" },
  },
  supervisor: supervisorEn,
};
