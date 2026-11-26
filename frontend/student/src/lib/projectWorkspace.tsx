import { apiMode, webClient } from "../../../../shared/auth/web-session";
import { useLiveProject } from "../../../../shared/project-work/useLiveProject";
import type { ProjectIssue, ProjectTaskStatus } from "../../../../shared/contracts/project-work";
import { useStoredState } from "./useStoredState";
import { demoTeam, demoStudents, demoTasks } from "../../../../shared/web/domain";
import { createContext, useContext, useState, type SetStateAction, type ReactNode } from "react";

export const project = {
  id: demoTeam.id,
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
const defaultAbstract =
  "We're developing an autonomous smart car that detects obstacles and navigates safely using ultrasonic sensors, an Arduino controller, and a dual motor driver. Our goal is to combine reliable sensing, efficient power management, and responsive motor control into an affordable, compact prototype. The expected result is a working vehicle that identifies obstacles in real time, adjusts its path, and demonstrates the practical use of embedded systems in autonomous navigation.";

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
function useDemoWorkspace() {
  const [taskData, persistTaskData] = useStoredState<{ tasks: TeamTask[]; completed: string[] }>(
    "labassist.student.team-work.v1",
    {
      tasks: teammates.flatMap((p, owner) =>
        p.tasks.map((title, i) => ({
          id: demoTasks[owner]!.id,
          owner,
          title,
          description:
            "Complete the work, document the outcome and share any blockers with the team.",
          due: "",
          inProgress: false,
          help: false,
        })),
      ),
      completed: [],
    },
  );
  const teamTasks = taskData.tasks;
  const completed = taskData.completed;
  const persistTasks = (action: SetStateAction<TeamTask[]>) =>
    persistTaskData((current) => ({
      ...current,
      tasks: typeof action === "function" ? action(current.tasks) : action,
    }));
  const setCompleted = (action: SetStateAction<string[]>) =>
    persistTaskData((current) => ({
      ...current,
      completed: typeof action === "function" ? action(current.completed) : action,
    }));
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([
    { id: "seed1", owner: 0, text: "Updated the circuit design", time: "Sample activity" },
    { id: "seed2", owner: 1, text: "Added motor driver test notes", time: "Sample activity" },
    { id: "seed3", owner: 2, text: "Shared sensor calibration results", time: "Sample activity" },
  ]);
  const logTeamActivity = (owner: number, text: string) =>
    setTeamActivity((items) =>
      [
        {
          id: crypto.randomUUID(),
          owner,
          text,
          time: new Date().toLocaleTimeString("en-US", {
            timeZone: "Asia/Hebron",
            hour: "numeric",
            minute: "2-digit",
          }),
        },
        ...items,
      ].slice(0, 30),
    );
  const [details, setDetails] = useStoredState("labassist.student.project-details.v1", {
    name: project.name,
    subtitle: project.subtitle,
    abstract: defaultAbstract,
  });
  const abstract = details.abstract;
  const setAbstract = (value: string) => setDetails((current) => ({ ...current, abstract: value }));
  const saveProjectDetails = (value: typeof details) => {
    if (!value.name.trim() || value.name.trim().length > 220 || !value.abstract.trim())
      throw new Error("Enter a title (up to 220 characters) and project abstract.");
    setDetails({
      name: value.name.trim(),
      subtitle: value.subtitle.trim(),
      abstract: value.abstract.trim(),
    });
  };
  const [issues, setIssues] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const setTeamTasks: typeof persistTasks = (action) =>
    persistTasks((items) => {
      const next = typeof action === "function" ? action(items) : action;
      if (
        next.some((task) => task.owner < 0 || task.owner >= teammates.length || !task.title.trim())
      )
        throw new Error("Choose a teammate and task title.");
      if (
        items.some(
          (old) =>
            old.owner !== 0 &&
            JSON.stringify(next.find((t) => t.id === old.id)) !== JSON.stringify(old),
        )
      )
        throw new Error("Only the task assignee may edit their task.");
      if (
        items.some(
          (old) =>
            next.find((t) => t.id === old.id)?.owner !== old.owner &&
            next.some((t) => t.id === old.id),
        )
      )
        throw new Error("Task reassignment is not implemented.");
      return next;
    });
  const toggleTask = (id: string) => {
    if (teamTasks.find((task) => task.id === id)?.owner !== 0)
      throw new Error("Only the task assignee may update their task.");
    setCompleted((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };
  const updateTaskStatus = (id: string, status: string) =>
    persistTaskData((current) => {
      const task = current.tasks.find((item) => item.id === id);
      if (!task || task.owner !== 0 || !["To Do", "In Progress", "Completed"].includes(status))
        throw new Error("Only the task assignee may update their task.");
      return {
        tasks: current.tasks.map((item) =>
          item.id === id
            ? {
                ...item,
                inProgress: status === "In Progress",
                help: status === "Completed" ? false : item.help,
              }
            : item,
        ),
        completed: [
          ...current.completed.filter((value) => value !== id),
          ...(status === "Completed" ? [id] : []),
        ],
      };
    });
  const completedCount = teamTasks.filter((task) => completed.includes(task.id)).length;
  const taskCount = teamTasks.length;
  return {
    details,
    saveProjectDetails,
    updateTaskStatus,
    teamTasks,
    setTeamTasks,
    teamActivity,
    logTeamActivity,
    abstract,
    setAbstract,
    completed,
    toggleTask,
    issues,
    addIssue: (text: string) => setIssues((current) => [...current, text]),
    report,
    setReport,
    submitted,
    submitReport: () => setSubmitted(true),
    withdrawReport: () => setSubmitted(false),
    progress: Math.round((completedCount / Math.max(1, taskCount)) * 100),
    completedCount,
    taskCount,
  };
}
function useWorkspaceState() {
  const demo = useDemoWorkspace();
  const client = apiMode(import.meta.env) ? webClient(import.meta.env) : null;
  const accountId = client?.account?.id;
  const live = useLiveProject(client, accountId);
  const project = live.project;
  const roster = project?.students ?? [];
  const students = [...roster].sort(
    (a, b) => Number(b.id === accountId) - Number(a.id === accountId),
  );
  const members = client
    ? students.map((student, index) => ({
        name: student.name,
        initials: student.name
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
          .toUpperCase(),
        tone: ["mint", "blue", "rose"][index % 3]!,
      }))
    : teammates;
  const teamTasks: TeamTask[] = client
    ? (project?.tasks ?? []).map((task) => ({
        id: task.id,
        owner: students.findIndex(({ id }) => id === task.assignedTo),
        title: task.title,
        description: task.description,
        due: task.dueOn ?? "",
        inProgress: task.status === "IN_PROGRESS",
        help: task.needsHelp,
      }))
    : demo.teamTasks;
  const completed = client
    ? (project?.tasks ?? []).filter((task) => task.status === "DONE").map(({ id }) => id)
    : demo.completed;

  const saveTask = (id: string, status: ProjectTaskStatus, needsHelp?: boolean) => {
    const task = project?.tasks.find((item) => item.id === id);
    if (!task) return Promise.resolve(false);
    return live.save("/tasks/" + id, "PATCH", {
      expectedRevision: task.revision,
      status,
      needsHelp: needsHelp ?? task.needsHelp,
    });
  };

  return {
    ...demo,
    live: !!client,
    project,
    members,
    loading: live.loading,
    error: live.error,
    saving: live.saving,
    reload: live.reload,
    details: client
      ? {
          name: project?.name ?? "",
          subtitle: project?.subtitle ?? "",
          abstract: project?.abstract ?? "",
        }
      : demo.details,
    abstract: client ? (project?.abstract ?? "") : demo.abstract,
    teamTasks,
    completed,
    completedCount: completed.length,
    taskCount: teamTasks.length,
    progress: Math.round((completed.length / Math.max(1, teamTasks.length)) * 100),
    teamActivity: client ? [] : demo.teamActivity,
    logTeamActivity: client ? () => undefined : demo.logTeamActivity,
    saveProjectDetails: async (details: typeof demo.details, expectedUpdatedAt?: string) => {
      if (client) return live.save("", "PATCH", { ...details, expectedUpdatedAt });
      demo.saveProjectDetails(details);
      return true;
    },
    createTask: async (input: Pick<TeamTask, "owner" | "title" | "description" | "due">) => {
      if (client) {
        const assignedTo = students[input.owner]?.id;
        if (!assignedTo) return false;
        return live.save("/tasks", "POST", {
          assignedTo,
          title: input.title,
          description: input.description,
          dueOn: input.due || null,
        });
      }
      demo.setTeamTasks((tasks) => [
        ...tasks,
        { ...input, id: crypto.randomUUID(), inProgress: false, help: false },
      ]);
      return true;
    },
    toggleTask: async (id: string) => {
      if (client) return saveTask(id, completed.includes(id) ? "TODO" : "DONE");
      demo.toggleTask(id);
      return true;
    },
    updateTaskStatus: async (id: string, status: string) => {
      if (client)
        return saveTask(
          id,
          status === "Completed" ? "DONE" : status === "In Progress" ? "IN_PROGRESS" : "TODO",
        );
      demo.updateTaskStatus(id, status);
      return true;
    },
    toggleHelp: async (task: TeamTask) => {
      if (client) return saveTask(task.id, task.inProgress ? "IN_PROGRESS" : "TODO", !task.help);
      demo.setTeamTasks((list) =>
        list.map((item) => (item.id === task.id ? { ...item, help: !item.help } : item)),
      );
      return true;
    },
    addIssue: async (title: string, description = "") => {
      if (client) return live.save("/issues", "POST", { title, description, priority: "MEDIUM" });
      demo.addIssue(title);
      return true;
    },
    updateIssue: (issue: ProjectIssue) =>
      live.save("/issues/" + issue.id, "PATCH", {
        title: issue.title,
        description: issue.description,
        priority: issue.priority,
        status: issue.status,
        resolution: issue.resolution,
        expectedRevision: issue.revision,
      }),
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
