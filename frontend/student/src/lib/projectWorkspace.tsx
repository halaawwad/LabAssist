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
function useWorkspaceState() {
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
