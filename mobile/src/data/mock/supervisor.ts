// Mock supervisor data, copied from frontend/supervisor/src/data/supervisor
// (supervisorMockData.ts and profileMockData.ts). Read it through src/services/supervisor.ts only.
import type {
  Activity,
  DashboardStat,
  Meeting,
  ProgressOverview,
  SupervisorProfile,
} from "@/types/supervisor";

const HOUR = 3_600_000;

/** Dates relative to today, so "upcoming" meetings stay upcoming whenever the app runs. */
function daysFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * HOUR).toISOString();
}

export const supervisorProfile: SupervisorProfile = {
  id: "sv-ahmad-saleh",
  name: "Ahmad Saleh",
  email: "ahmad.saleh@najah.edu",
  specialization: "Embedded Systems & Robotics",
};

export const dashboardStats: DashboardStat[] = [
  { id: "myProjects", value: 5, tone: "green", highlighted: true },
  { id: "delayed", value: 1, tone: "orange" },
  { id: "reports", value: 3, tone: "blue" },
  { id: "issues", value: 4, tone: "red" },
];

export const progressOverview: ProgressOverview = {
  overall: 62,
  trend: 12,
  stages: [
    { id: "hardwareDesign", value: 100 },
    { id: "prototype", value: 80 },
    { id: "testing", value: 35 },
    { id: "finalReport", value: 0 },
  ],
};

export const meetings = (): Meeting[] => [
  {
    id: "meeting-la-101",
    projectCode: "LA-101",
    team: "Team Alpha",
    date: daysFromToday(1),
    time: "10:00",
    tone: "green",
  },
  {
    id: "meeting-la-205",
    projectCode: "LA-205",
    team: "Team Delta",
    date: daysFromToday(4),
    time: "14:00",
    tone: "blue",
  },
];

export const activities = (): Activity[] => [
  {
    id: "activity-sa-report",
    initials: "SA",
    student: "Sara Ahmad",
    project: "LA-101",
    occurredAt: hoursAgo(2),
    tone: "blue",
    status: "report",
  },
  {
    id: "activity-om-task",
    initials: "OM",
    student: "Omar Mahmoud",
    project: "LA-205",
    occurredAt: hoursAgo(4),
    tone: "green",
    status: "task",
  },
];
