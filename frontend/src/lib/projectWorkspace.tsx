import { createContext, useContext, useState, type ReactNode } from "react";

export const project = {
  name: "Smart Car", subtitle: "Autonomous Navigation", status: "In Progress", deadline: "Oct 24, 2026",
  budget: 250, spent: 184, milestone: 3, milestoneCount: 5,
};
export const teammates = [
  { name: "NOOR OWASSI", initials: "NO", done: 19, remaining: 6, tone: "mint", tasks: ["Finalize sensor connections", "Document circuit changes"] },
  { name: "Omar Khalil", initials: "OK", done: 17, remaining: 8, tone: "blue", tasks: ["Test motor driver response", "Check power consumption"] },
  { name: "Lina Nasser", initials: "LN", done: 16, remaining: 9, tone: "rose", tasks: ["Calibrate obstacle detection", "Record test results"] },
  { name: "Ahmad Saleh", initials: "AS", done: 16, remaining: 9, tone: "amber", tasks: ["Review component costs", "Prepare prototype enclosure"] },
];
export const projectBom = [
  { name: "Arduino Uno", quantity: 1, cost: 22, available: true },
  { name: "L298N Motor Driver", quantity: 1, cost: 8, available: true },
  { name: "HC-SR04 Ultrasonic Sensor", quantity: 2, cost: 8, available: false, image: "/components/hc-sr04.jpg" },
  { name: "18650 Li-ion Battery", quantity: 1, cost: 6, available: false, image: "/components/battery-18650.jpg" },
];
export const deadlines = [
  { name: "Circuit schematic review", day: "08", month: "OCT", date: "Oct 08, 2026", owner: "NOOR & Omar", type: "Design", tone: "blue" },
  { name: "Weekly progress report", day: "09", month: "OCT", date: "Oct 09, 2026", owner: "Whole team", type: "Report", tone: "orange" },
  { name: "Obstacle detection test", day: "11", month: "OCT", date: "Oct 11, 2026", owner: "Lina & Ahmad", type: "Testing", tone: "olive" },
];
const defaultAbstract = "We're developing an autonomous smart car that detects obstacles and navigates safely using ultrasonic sensors, an Arduino controller, and a dual motor driver. Our goal is to combine reliable sensing, efficient power management, and responsive motor control into an affordable, compact prototype. The expected result is a working vehicle that identifies obstacles in real time, adjusts its path, and demonstrates the practical use of embedded systems in autonomous navigation.";

function useWorkspaceState() {
  const [abstract, setAbstract] = useState(defaultAbstract);
  const [completed, setCompleted] = useState<string[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const toggleTask = (id: string) => setCompleted(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const completedCount = teammates.reduce((sum, person) => sum + person.done, 0) + completed.length;
  const taskCount = teammates.reduce((sum, person) => sum + person.done + person.remaining, 0);
  return { abstract, setAbstract, completed, toggleTask, issues, addIssue: (text: string) => setIssues(current => [...current, text]), report, setReport, submitted, submitReport: () => setSubmitted(true), progress: Math.round(completedCount / taskCount * 100), completedCount, taskCount };
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
