import { demoTeam, demoStudents, demoTasks } from "../../../shared/web/domain";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { createContext, useContext, useState, type ReactNode } from "react";

export const project = {
  name: demoTeam.title,
  subtitle: "Autonomous Navigation",
  status: "In Progress",
  deadline: "Oct 24, 2026",
  budget: 250,
  spent: 184,
  milestone: 3,
  milestoneCount: 5,
};
export const teammates = [
  {
    name: demoStudents[0]!.name,
    initials: "NO",
    done: 0,
    remaining: 1,
    tone: "mint",
    tasks: [demoTasks[0]!.title],
  },
  {
    name: demoStudents[1]!.name,
    initials: "OK",
    done: 0,
    remaining: 1,
    tone: "blue",
    tasks: [demoTasks[1]!.title],
  },
  {
    name: demoStudents[2]!.name,
    initials: "LN",
    done: 0,
    remaining: 1,
    tone: "rose",
    tasks: [demoTasks[2]!.title],
  },
];
export const projectBom = [
  { name: "Arduino Uno", quantity: 1, cost: 22, available: true },
  { name: "L298N Motor Driver", quantity: 1, cost: 8, available: true },
  {
    name: "HC-SR04 Ultrasonic Sensor",
    quantity: 2,
    cost: 8,
    available: false,
    image: "/components/hc-sr04.jpg",
  },
  {
    name: "18650 Li-ion Battery",
    quantity: 1,
    cost: 6,
    available: false,
    image: "/components/battery-18650.jpg",
  },
];
export const deadlines = [
  {
    name: "Circuit schematic review",
    day: "08",
    month: "OCT",
    date: "Oct 08, 2026",
    owner: "NOOR & Omar",
    type: "Design",
    tone: "blue",
  },
  {
    name: "Weekly progress report",
    day: "09",
    month: "OCT",
    date: "Oct 09, 2026",
    owner: "Whole team",
    type: "Report",
    tone: "orange",
  },
  {
    name: "Obstacle detection test",
    day: "11",
    month: "OCT",
    date: "Oct 11, 2026",
    owner: "Lina & Omar",
    type: "Testing",
    tone: "olive",
  },
];
export type TeamTask = {
  id: string;
  owner: number;
  title: string;
  description: string;
  due: string;
  inProgress: boolean;
  help: boolean;
};
export type TeamActivity = { id: string; owner: number; text: string; time: string };
/** Adapter for the existing native project layout; all writes use the workspace. */
function useWorkspaceState() {
  const { state, actorId, act, error, retryLoading, saving } = useWorkspace();
  const active = state.projects.find((p) => p.studentIds.includes(actorId)) ?? state.projects[0]!;
  const members = active.studentIds.map((id) => state.users.find((user) => user.id === id)!);
  const teamTasks: TeamTask[] = state.tasks
    .filter((task) => task.projectId === active.id)
    .map((task) => ({
      id: task.id,
      owner: active.studentIds.indexOf(task.ownerId),
      title: task.title,
      description: "",
      due: task.dueDate ?? "",
      inProgress: false,
      help: false,
    }));
  const completed = state.tasks
    .filter((task) => task.projectId === active.id && task.done)
    .map((task) => task.id);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const logTeamActivity = (owner: number, text: string) =>
    setTeamActivity((items) => [
      { id: String(Date.now()), owner, text, time: new Date().toLocaleTimeString() },
      ...items,
    ]);
  const currentReport = state.reports
    .filter((report) => report.projectId === active.id && report.kind === "weekly")
    .sort((a, b) => b.week - a.week)[0];
  return {
    actorId,
    details: active,
    members,
    teamTasks,
    teamActivity,
    logTeamActivity,
    completed,
    abstract: active.description,
    saveDetails: (title: string, description: string) =>
      act({ type: "project.edit", id: active.id, title, description }),
    toggleTask: (id: string) => act({ type: "task.toggle", id }),
    issues: state.issues
      .filter((issue) => issue.projectId === active.id && !issue.resolved)
      .map((issue) => issue.title),
    addIssue: (title: string) => act({ type: "issue.add", projectId: active.id, title }),
    submitted: !!currentReport && currentReport.status !== "draft",
    progress: Math.round((completed.length / Math.max(1, teamTasks.length)) * 100),
    completedCount: completed.length,
    taskCount: teamTasks.length,
    error,
    retryLoading,
    saving,
  };
}
const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
export function ProjectWorkspaceProvider({ children }: { children: ReactNode }) {
  const workspace = useWorkspaceState();
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}
export function useProjectWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("ProjectWorkspaceProvider is required");
  return context;
}
