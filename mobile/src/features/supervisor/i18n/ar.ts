import type { Dictionary } from "@/i18n/dictionary";

// Wording follows frontend/supervisor/src/i18n/ar.ts.
export const supervisorAr: Dictionary["supervisor"] = {
  nav: {
    dashboard: "لوحة التحكم",
    projects: "مشاريعي",
    students: "الطلاب",
    progress: "التقدم",
    tasks: "المهام",
    issues: "المشكلات والمخاطر",
    reports: "التقارير الأسبوعية",
    meetings: "الاجتماعات",
    messages: "الرسائل",
    finalReports: "التقارير النهائية",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    more: "المزيد",
  },
  tabs: {
    dashboard: "الرئيسية",
    projects: "مشاريعي",
    reports: "التقارير",
    messages: "الرسائل",
    more: "المزيد",
  },
  more: {
    supervision: "الإشراف",
    account: "الحساب",
  },
  dashboard: {
    greeting: {
      morning: "صباح الخير،",
      afternoon: "مساء الخير،",
      evening: "مساء الخير،",
    },
    honorific: "د. {name}",
    subtitle: "إليك نظرة سريعة على مشاريعك.",
    loading: "جارٍ تحميل لوحة التحكم…",
    openStat: "فتح {label}",
    stats: {
      myProjects: { label: "مشاريعي", trend: "+1 هذا الفصل" },
      delayed: { label: "مشاريع متأخرة", trend: "تحتاج إلى متابعة" },
      reports: { label: "تقارير للمراجعة", trend: "هذا الأسبوع" },
      issues: { label: "مشكلات مفتوحة", trend: "2 بأولوية عالية" },
    },
    progressTitle: "تقدم المشاريع",
    overallProgress: "التقدم الكلي",
    overallAria: "التقدم الكلي {value} بالمئة",
    progressItems: {
      hardwareDesign: "تصميم العتاد",
      prototype: "النموذج الأولي",
      testing: "الاختبار",
      finalReport: "التقرير النهائي",
    },
    noProgress: {
      title: "لا يوجد تقدم بعد",
      message: "يظهر التقدم عندما تبدأ فرقك العمل على مراحل المشروع.",
    },
    activityTitle: "آخر نشاطات الطلاب",
    activity: {
      report: "سلّم تقريرًا أسبوعيًا",
      task: "حدّث مهمة",
      model: "رفع نموذجًا ثلاثي الأبعاد",
    },
    noActivity: {
      title: "لا توجد نشاطات حديثة",
      message: "ستظهر هنا التقارير وتحديثات المهام والملفات التي يرفعها طلابك.",
    },
    meetingsTitle: "الاجتماعات القادمة",
    meetingProject: "مشروع {code}",
    noMeetings: {
      title: "لا توجد اجتماعات قادمة",
      message: "ستظهر هنا الاجتماعات التي تحددها مع فرقك.",
    },
    support: {
      title: "ادعم مشاريع أفضل",
      body: "راجع ووجّه وساعد الطلاب على تحويل أفكارهم إلى واقع.",
      open: "فتح مشاريعي",
    },
  },
  placeholder: {
    title: "قريبًا",
    message: "هذه الشاشة غير متوفرة على الجوال بعد، وستُضاف في خطوة لاحقة.",
  },
};
