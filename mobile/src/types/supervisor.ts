// Supervisor dashboard data, shaped after frontend/supervisor/src/data/supervisor/supervisorMockData.ts.
// These are the shapes the services return, so they stay when the mock data is replaced by the API.

export type SupervisorProfile = {
  id: string;
  name: string;
  email: string;
  specialization: string;
};

export type DashboardStatId = "myProjects" | "delayed" | "reports" | "issues";

export type DashboardStat = {
  /** Translation key under `supervisor.dashboard.stats.`. */
  id: DashboardStatId;
  value: number;
  tone: "green" | "orange" | "blue" | "red";
  highlighted?: boolean;
};

export type ProgressStageId = "hardwareDesign" | "prototype" | "testing" | "finalReport";

export type ProgressStage = {
  /** Translation key under `supervisor.dashboard.progressItems.`. */
  id: ProgressStageId;
  /** 0–100. */
  value: number;
};

export type ProgressOverview = {
  /** Overall progress across all projects, 0–100. */
  overall: number;
  /** Change in overall progress since last month, in percentage points. */
  trend: number;
  stages: ProgressStage[];
};

export type Meeting = {
  id: string;
  projectCode: string;
  team: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** 24-hour time (HH:mm). */
  time: string;
  tone: "green" | "blue";
};

export type ActivityStatus = "report" | "task" | "model";

export type Activity = {
  id: string;
  initials: string;
  student: string;
  project: string;
  /** ISO timestamp. The web mock stores `hoursAgo` instead. */
  occurredAt: string;
  tone: "blue" | "green" | "violet";
  /** Also the translation key of the action under `supervisor.dashboard.activity.`. */
  status: ActivityStatus;
};

export type SupervisorDashboard = {
  profile: SupervisorProfile;
  stats: DashboardStat[];
  progress: ProgressOverview;
  meetings: Meeting[];
  activities: Activity[];
};
