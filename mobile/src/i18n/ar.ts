import { supervisorAr } from "@/features/supervisor/i18n/ar";

import type { Dictionary } from "./dictionary";

export const ar: Dictionary = {
  app: {
    name: "LabAssist",
  },
  roles: {
    student: "طالب",
    supervisor: "مشرف",
    workshop: "مدير الورشة",
  },
  language: {
    label: "اللغة",
    en: "English",
    ar: "العربية",
    enShort: "EN",
    arShort: "ع",
  },
  common: {
    loading: "جارٍ التحميل…",
    retry: "حاول مرة أخرى",
    viewAll: "عرض الكل",
    back: "رجوع",
    errorTitle: "حدث خطأ ما",
    errorMessage: "تعذّر تحميل هذا المحتوى. تحقّق من الاتصال ثم حاول مرة أخرى.",
  },
  dates: {
    today: "اليوم",
    tomorrow: "غدًا",
    justNow: "الآن",
    minutesAgo: {
      one: "منذ دقيقة",
      two: "منذ دقيقتين",
      few: "منذ {count} دقائق",
      many: "منذ {count} دقيقة",
      other: "منذ {count} دقيقة",
    },
    hoursAgo: {
      one: "منذ ساعة",
      two: "منذ ساعتين",
      few: "منذ {count} ساعات",
      many: "منذ {count} ساعة",
      other: "منذ {count} ساعة",
    },
    daysAgo: {
      one: "منذ يوم",
      two: "منذ يومين",
      few: "منذ {count} أيام",
      many: "منذ {count} يومًا",
      other: "منذ {count} يوم",
    },
  },
  supervisor: supervisorAr,
};
