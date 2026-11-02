// Supervisor strings, merged into the app dictionary under `supervisor.`.
// Wording follows frontend/supervisor/src/i18n/en.ts.
export const supervisorEn = {
  nav: {
    dashboard: "Dashboard",
    projects: "My Projects",
    students: "Students",
    progress: "Progress",
    tasks: "Tasks",
    issues: "Issues & Risks",
    reports: "Weekly Reports",
    meetings: "Meetings",
    messages: "Messages",
    finalReports: "Final Reports",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    more: "More",
  },
  /** Shorter labels that fit the bottom tab bar. */
  tabs: {
    dashboard: "Dashboard",
    projects: "Projects",
    reports: "Reports",
    messages: "Messages",
    more: "More",
  },
  more: {
    supervision: "Supervision",
    account: "Account",
  },
  dashboard: {
    greeting: {
      morning: "Good morning,",
      afternoon: "Good afternoon,",
      evening: "Good evening,",
    },
    honorific: "Dr. {name}",
    subtitle: "Here’s a quick overview of your projects.",
    loading: "Loading your dashboard…",
    openStat: "Open {label}",
    stats: {
      myProjects: { label: "My Projects", trend: "+1 this semester" },
      delayed: { label: "Delayed Projects", trend: "Needs attention" },
      reports: { label: "Reports to Review", trend: "This week" },
      issues: { label: "Open Issues", trend: "2 high priority" },
    },
    progressTitle: "Project Progress",
    overallProgress: "Overall Progress",
    overallAria: "Overall progress {value} percent",
    progressItems: {
      hardwareDesign: "Hardware Design",
      prototype: "Prototype",
      testing: "Testing",
      finalReport: "Final Report",
    },
    noProgress: {
      title: "No progress yet",
      message: "Progress appears once your teams start their milestones.",
    },
    activityTitle: "Recent Student Activity",
    activity: {
      report: "submitted a weekly report",
      task: "updated a task",
      model: "uploaded a 3D model",
    },
    noActivity: {
      title: "No recent activity",
      message: "Reports, task updates and uploads from your students will show up here.",
    },
    meetingsTitle: "Upcoming Meetings",
    meetingProject: "Project {code}",
    noMeetings: {
      title: "No upcoming meetings",
      message: "Meetings you schedule with your teams will appear here.",
    },
    support: {
      title: "Support better projects",
      body: "Review, guide, and help students turn ideas into reality.",
      open: "Open my projects",
    },
  },
  placeholder: {
    title: "Coming soon",
    message: "This screen isn’t on mobile yet. It will be added in a later step.",
  },
};
