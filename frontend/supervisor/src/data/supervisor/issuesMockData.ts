import irrigation from "../../assets/supervisor-project-irrigation.jpg";
import air from "../../assets/supervisor-project-greenhouse.png";
import rover from "../../assets/supervisor-project-robot.png";
import weather from "../../assets/supervisor-project-weather.png";
import { reportTeams } from "./weeklyReportsMockData";
import { progressProjects } from "./progressMockData";

export const issueProjects = [
  {
    id: "demo-irrigation",
    teamId: "demo-team-a",
    name: "Smart Irrigation",
    team: "Team A",
    image: irrigation,
    progress: 62,
  },
  {
    id: "demo-air",
    teamId: "demo-team-b",
    name: "Air Quality Monitor",
    team: "Team B",
    image: air,
    progress: 48,
  },
  {
    id: "demo-rover",
    teamId: "demo-team-c",
    name: "Autonomous Rover",
    team: "Team C",
    image: rover,
    progress: 76,
  },
  {
    id: "demo-weather",
    teamId: "demo-team-d",
    name: "Weather Station",
    team: "Team D",
    image: weather,
    progress: 35,
  },
  ...reportTeams.map((team) => {
    const project = progressProjects.find((project) => project.code === team.projectCode)!;
    return {
      id: team.projectCode,
      teamId: team.id,
      name: team.projectName,
      team: team.name,
      image: project.photo ?? (team.projectCode === "HW03" ? irrigation : air),
      progress: project.weeklyProgress.at(-1) ?? 0,
    };
  }),
];
export type Priority = "high" | "medium" | "low";
export type IssueStatus = "open" | "monitoring" | "resolved";
export type IssueType = "hardware" | "design" | "procurement" | "delay";
export type IssueSource =
  | { kind: "manual" }
  | {
      kind: "weekly-report";
      reportId: string;
      detectedIssueId: string;
      weekId: string;
      weekNumber: number;
    };
export type Issue = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  teamId: string;
  source: IssueSource;
  priority: Priority;
  status: IssueStatus;
  type: IssueType;
  date: string;
  comments: string[];
};
/** The original demo records retain their own teams; report teams use their actual project IDs. */
export type LegacyIssue = Omit<Issue, "projectId" | "teamId" | "source"> & { project: number };
const demoIssues: LegacyIssue[] = [
  {
    id: "i1",
    title: "Sensor not working",
    description: "Ultrasonic sensor gives inconsistent readings",
    project: 0,
    priority: "high",
    status: "open",
    type: "hardware",
    date: "2026-10-18",
    comments: [],
  },
  {
    id: "i2",
    title: "3D model needs modification",
    description: "Mounting design not suitable for available parts",
    project: 1,
    priority: "medium",
    status: "monitoring",
    type: "design",
    date: "2026-10-17",
    comments: [],
  },
  {
    id: "i3",
    title: "Delay in part delivery",
    description: "Supplier delay for ESP32 modules",
    project: 0,
    priority: "medium",
    status: "monitoring",
    type: "procurement",
    date: "2026-10-16",
    comments: [],
  },
  {
    id: "i4",
    title: "Power issue resolved",
    description: "Fixed voltage regulator problem",
    project: 2,
    priority: "low",
    status: "resolved",
    type: "hardware",
    date: "2026-10-15",
    comments: [],
  },
  {
    id: "i5",
    title: "Project behind schedule",
    description: "Milestones are 2 weeks behind",
    project: 3,
    priority: "high",
    status: "open",
    type: "delay",
    date: "2026-10-14",
    comments: [],
  },
  {
    id: "i6",
    title: "Motor driver overheating",
    description: "Check cooling under sustained load",
    project: 2,
    priority: "high",
    status: "open",
    type: "hardware",
    date: "2026-10-13",
    comments: [],
  },
  {
    id: "i7",
    title: "Enclosure dimensions",
    description: "Adjust clearance around the circuit board",
    project: 1,
    priority: "medium",
    status: "monitoring",
    type: "design",
    date: "2026-10-12",
    comments: [],
  },
  {
    id: "i8",
    title: "Battery order pending",
    description: "Waiting for supplier confirmation",
    project: 2,
    priority: "medium",
    status: "open",
    type: "procurement",
    date: "2026-10-11",
    comments: [],
  },
  {
    id: "i9",
    title: "Testing postponed",
    description: "Outdoor testing rescheduled",
    project: 3,
    priority: "medium",
    status: "monitoring",
    type: "delay",
    date: "2026-10-10",
    comments: [],
  },
  {
    id: "i10",
    title: "Wiring secured",
    description: "Loose connectors have been replaced",
    project: 0,
    priority: "low",
    status: "resolved",
    type: "hardware",
    date: "2026-10-09",
    comments: [],
  },
  {
    id: "i11",
    title: "Bracket alignment",
    description: "Minor alignment adjustment needed",
    project: 3,
    priority: "low",
    status: "monitoring",
    type: "design",
    date: "2026-10-08",
    comments: [],
  },
  {
    id: "i12",
    title: "Sensor calibration complete",
    description: "Readings now within the expected range",
    project: 1,
    priority: "low",
    status: "resolved",
    type: "hardware",
    date: "2026-10-07",
    comments: [],
  },
];

/** Preserve locally created issues from the original index-based mock schema. */
export function migrateLegacyIssue({ project, ...issue }: LegacyIssue): Issue {
  const owner = issueProjects[project] ?? issueProjects[0];
  return { ...issue, projectId: owner.id, teamId: owner.teamId, source: { kind: "manual" } };
}

export const initialIssues: Issue[] = demoIssues.map(migrateLegacyIssue);
export const issueProject = (issue: Pick<Issue, "projectId" | "teamId">) =>
  issueProjects.find(
    (project) => project.id === issue.projectId && project.teamId === issue.teamId,
  )!;
