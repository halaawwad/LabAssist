import { demoProjectId, demoStudents, demoTasks, demoTeam, demoSupervisor, demoWorkshop, demoTerm, domainVersion } from "../../../shared/web/domain";
import { validDeck, type Deck } from "./presentation/presentations";
import { meetingInstant } from "./meetingTime";
import { CATALOG_MAP } from "../lib/hardware/catalog";
import { checkWireFit } from "../lib/hardware/wireCompatibility";
import type { WireType } from "../lib/hardware/types";
import type { FinalDocument } from "./finalReport";
export type Role = "student" | "supervisor" | "workshop";
export type User = {
  canonicalId?: string;
  photo?: string;
  id: string;
  name: string;
  role: Role;
  email: string;
  universityNumber?: string;
  bio: string;
};
export type Project = {
  termId?: string;
  tableHistory?: { table: string; releasedAt: string }[];
  canonicalId?: string;
  tableVerified?: boolean;
  id: string;
  title: string;
  description: string;
  studentIds: string[];
  supervisorIds: string[];
  table: string;
  budget: number;
  finalOpen: boolean;
  presentationOpen: boolean;
};
export type Task = {
  dueDate?: string;
  id: string;
  projectId: string;
  title: string;
  ownerId: string;
  done: boolean;
  createdAt: string;
};
export type Issue = { id: string; projectId: string; title: string; resolved: boolean };
export type ReportKind = "weekly" | "final" | "presentation";
export type ReportStatus = "draft" | "submitted" | "reviewed" | "changes";
export const weeklyFields = [
  "completed",
  "progress",
  "tasks",
  "delays",
  "problems",
  "plan",
] as const;
export type Report = {
  editableDraft?: { fields: Record<string, string>; attachments?: ReportAttachment[]; savedAt: string };
  deck?: Deck;
  savedAt?: string;
  attachments?: ReportAttachment[];
  document?: FinalDocument;
  history?: {
    state?: "SUBMITTED" | "WITHDRAWN" | "SUPERSEDED";
    deck?: Deck;
    attachments?: ReportAttachment[];
    document?: FinalDocument;
    id: string;
    fields: Record<string, string>;
    template: string;
    color: string;
    submittedAt: string;
  }[];
  id: string;
  projectId: string;
  kind: ReportKind;
  week: number;
  status: ReportStatus;
  fields: Record<string, string>;
  template: string;
  color: string;
  submittedAt?: string;
  openedBy: string[];
  feedback: { id: string; authorId: string; body: string; section: string; createdAt: string; submissionId?: string }[];
};
export type ReportAttachment = { id: string; name: string; uri: string; mime: string };
export type Message = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  starredBy: string[];
  seenBy?: string[];
  replyTo?: string;
  attachment?: { uri: string; name: string; mime: string };
  forwarded?: boolean;
};
export type Thread = {
  id: string;
  name: string;
  memberIds: string[];
  projectId?: string;
  starredBy: string[];
  photo?: string;
};
export type Meeting = {
  duration?: number;
  notes?: string;
  completed?: boolean;
  meetingType?: "team" | "individual";
  projectId?: string;
  sample?: boolean;
  id: string;
  title: string;
  creatorId: string;
  inviteeIds: string[];
  date: string;
  time: string;
  agenda: string;
  location: string;
  responses: Record<string, "accepted" | "declined">;
  cancelled: boolean;
};
export type Notice = {
  id: string;
  authorId: string;
  body: string;
  projectId?: string;
  supervisors: boolean;
  seenBy: string[];
  createdAt: string;
  kind: "notice" | "observation";
};
export type Tool = {
  inspections?: { at: string; returned: number; damaged: number; missing: number }[];
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  returned: number;
  damaged: number;
  missing: number;
};
export type Part = {
  id: string;
  projectId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: "needed" | "obtained" | "unused";
};
export type Expense = { id: string; projectId: string; title: string; amount: number };
export type Circuit = {
  publishedVersionId?: string;
  id: string;
  ownerId: string;
  projectId: string;
  name: string;
  shared: boolean;
  published: "private" | "view" | "copy";
  versions: {
    id: string;
    nodes: { model: string; x: number; z: number }[];
    wires: {
      from: number;
      fromPin: number;
      to: number;
      toPin: number;
      color: string;
      kind: string;
    }[];
    createdAt: string;
  }[];
};
export type Workspace = {
  previewDataRevision?: number;
  meetingPreviewRevision?: number;
  version: 1;
  users: User[];
  projects: Project[];
  tasks: Task[];
  issues: Issue[];
  reports: Report[];
  threads: Thread[];
  messages: Message[];
  meetings: Meeting[];
  notices: Notice[];
  tools: Tool[];
  parts: Part[];
  expenses: Expense[];
  circuits: Circuit[];
  attendance: Record<string, Record<string, boolean>>;
  attendanceHistory?: { userId: string; date: string; present: boolean; at: string; actorId: string }[];
  days: Record<string, boolean>;
  absenceThreshold: number | null;
  availability: "open" | "closed";
  bookmarks: string[];
  alerts: { id: string; userId: string; body: string; read: boolean }[];
};

export function calendarDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function projectFor(state: Workspace, userId: string) {
  return state.projects.find((p) => p.studentIds.includes(userId));
}
export function canSeeProject(state: Workspace, userId: string, projectId: string) {
  const user = state.users.find((u) => u.id === userId);
  const project = state.projects.find((p) => p.id === projectId);
  return (
    !!project &&
    !!user &&
    (user.role === "workshop" ||
      project.studentIds.includes(userId) ||
      project.supervisorIds.includes(userId))
  );
}
export function projectProgress(state: Workspace, projectId: string) {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  return tasks.length ? Math.round((100 * tasks.filter((t) => t.done).length) / tasks.length) : 0;
}
const names = [
  demoTeam.title,
  "Smart Car",
  "Weather Station",
  "Heart Monitor",
  "Greenhouse Monitor",
  "Parking Sensor",
  "Pet Feeder",
  "Solar Tracker",
  "Robotic Arm",
  "Air Monitor",
  "Access Gate",
  "Door Lock",
  "Water Monitor",
  "Obstacle Avoidance",
  "Fall Detector",
  "Energy Meter",
  "Hydroponics",
  "Plant Care",
  "Traffic Lights",
  "Digital Stethoscope",
  "Fire Detection",
  "Smart Bin",
  "Voice Lights",
];
export function createWorkspace(now = new Date()): Workspace {
  const users: User[] = [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `d${i + 1}`,
      name: [
        demoSupervisor.name,
        "Dr. Rana Yousef",
        "Dr. Omar Nasser",
        "Dr. Maha Haddad",
        "Dr. Fadi Jaber",
        "Dr. Samer Khalil",
      ][i],
      role: "supervisor" as const,
      email: i === 0 ? demoSupervisor.email : `doctor${i + 1}@najah.edu`,
      bio: "Embedded Systems & Engineering",
    })),
    {
      id: "w1",
      name: demoWorkshop.name,
      role: "workshop",
      email: demoWorkshop.email,
      bio: "Engineering workshop",
    },
  ];
  let student = 0;
  const projects: Project[] = names.map((title, i) => {
    const studentIds = Array.from({ length: i < 8 ? 3 : 2 }, () => {
      student++;
      const id = `s${student}`;
      const name =
        demoStudents[student - 1]?.name ?? `Student ${student}`;
      const universityNumber = demoStudents[student - 1]?.number ?? String(12000000 + student);
      users.push({
        id,
        name,
        role: "student",
        universityNumber,
        email: `s${universityNumber}@stu.najah.edu`,
        bio: "Computer Engineering",
      });
      return id;
    });
    return {
      id: `p${i + 1}`,
      canonicalId: demoProjectId("mobile", `p${i + 1}`),
      title,
      description:
        i === 0 ? "Autonomous navigation and obstacle detection" : "Graduation engineering project",
      studentIds,
      supervisorIds: [`d${(i % 6) + 1}`],
      table: `R${String(i + 1).padStart(2, "0")}`,
      budget: 250,
      finalOpen: true,
      presentationOpen: true,
    };
  });
  const stamp = now.toISOString();
  const tasks = projects.flatMap((p) =>
    p.studentIds.map((ownerId, i) => ({
      id: p.canonicalId === demoTeam.id ? demoTasks[i]!.id : `task-${ownerId}`,
      projectId: p.id,
      title: p.canonicalId === demoTeam.id ? demoTasks[i]!.title : ["Test the distance sensor", "Review the wiring diagram", "Record motor readings"][i],
      ownerId,
      done: p.canonicalId === demoTeam.id ? false : i === 1,
      createdAt: stamp,
    })),
  );
  const reports: Report[] = projects.flatMap((p) =>
    (["weekly", "final", "presentation"] as const).map((kind) => ({
      id: `${p.id}-${kind}`,
      projectId: p.id,
      kind,
      week: kind === "weekly" ? 1 : 0,
      status: kind === "weekly" ? "submitted" : "draft",
      fields: (kind === "weekly"
        ? {
            completed: "Assembled the first prototype and tested the sensors.",
            progress: "Initial hardware tests completed.",
            tasks: "Sensor setup and wiring review.",
            delays: "None",
            problems: "Readings fluctuate under bright light.",
            plan: "Calibrate readings and repeat tests.",
          }
        : kind === "final"
          ? {
              Abstract: "",
              Introduction: "",
              "Theoretical Background": "",
              Methodology: "",
              Results: "",
              Conclusion: "",
              References: "",
            }
          : {
              "Project overview": "",
              "Problem and objectives": "",
              "Our solution": "",
              Results: "",
              "Next steps": "",
            }) as Record<string, string>,
      template: "minimal",
      color: "#526443",
      submittedAt: kind === "weekly" ? stamp : undefined,
      openedBy: [],
      feedback: [],
    })),
  );
  const threads: Thread[] = projects.map((p) => ({
    id: `thread-${p.id}`,
    name: p.title,
    memberIds: [...p.studentIds, ...p.supervisorIds],
    projectId: p.id,
    starredBy: [],
  }));
  users.forEach((u) =>
    threads.push({ id: `self-${u.id}`, name: u.name, memberIds: [u.id], starredBy: [] }),
  );
  return {
    version: 1,
    users,
    projects,
    tasks,
    reports,
    threads,
    messages: projects.map((p) => ({
      id: `welcome-${p.id}`,
      threadId: `thread-${p.id}`,
      senderId: p.supervisorIds[0],
      body: "Welcome to the team. Let’s review your progress this week.",
      createdAt: stamp,
      starredBy: [],
    })),
    issues: [
      {
        id: "issue1",
        projectId: "p1",
        title: "Distance sensor needs calibration",
        resolved: false,
      },
    ],
    meetings: [
      {
        id: "meet1",
        title: "Prototype design review",
        creatorId: "d1",
        inviteeIds: projects[0].studentIds,
        date: calendarDay(new Date(now.getTime() + 86400000)),
        time: "13:00",
        agenda: "Review the prototype, sensors and next tasks.",
        location: "Engineering workshop",
        responses: {},
        cancelled: false,
      },
    ],
    notices: [],
    tools: projects.flatMap((p) =>
      ["Digital multimeter", "Soldering station"].map((name, i) => ({
        id: `${p.id}-tool${i}`,
        projectId: p.id,
        name,
        quantity: 1,
        returned: 0,
        damaged: 0,
        missing: 0,
      })),
    ),
    parts: [
      {
        id: "part1",
        projectId: "p1",
        name: "Arduino Uno",
        quantity: 1,
        unitPrice: 35,
        status: "obtained",
      },
      {
        id: "part2",
        projectId: "p1",
        name: "HC-SR04",
        quantity: 2,
        unitPrice: 12,
        status: "needed",
      },
    ],
    expenses: [{ id: "expense1", projectId: "p1", title: "Arduino Uno", amount: 35 }],
    circuits: [],
    attendance: {},
    days: { [calendarDay(now)]: true },
    absenceThreshold: null,
    availability: "open",
    bookmarks: [],
    alerts: [],
  };
}

export type Action =
  | { type: "project.create"; title: string; students: { name: string; number: string }[] }
  | { type: "project.gate"; id: string; kind: "final" | "presentation"; open: boolean }
  | { type: "weekly.create"; projectId: string; week: number }
  | { type: "task.add"; projectId: string; title: string; ownerId: string }
  | { type: "task.toggle"; id: string }
  | { type: "issue.add"; projectId: string; title: string }
  | { type: "issue.toggle"; id: string }
  | { type: "project.edit"; id: string; title: string; description: string }
  | {
      type: "report.save";
      id: string;
      fields: Record<string, string>;
      template?: string;
      color?: string;
      document?: FinalDocument;
      deck?: Deck;
      attachments?: ReportAttachment[];
      autosave?: boolean;
      draftOnly?: boolean;
    }
  | { type: "report.publish"; id: string; fields: Record<string, string>; attachments?: ReportAttachment[] }
  | { type: "report.submit" | "report.withdraw" | "report.view" | "report.reopen"; id: string }
  | {
      type: "report.review";
      submissionId: string;
      id: string;
      body: string;
      section: string;
      status: "reviewed" | "changes";
    }
  | { type: "thread.create"; userId: string }
  | { type: "thread.star"; id: string }
  | { type: "thread.edit"; id: string; name: string; photo?: string }
  | {
      type: "message.send";
      threadId: string;
      body: string;
      replyTo?: string;
      forwarded?: boolean;
      attachment?: Message["attachment"];
    }
  | { type: "message.star"; id: string }
  | { type: "message.read"; threadId: string }
  | { type: "message.delete"; id: string }
  | {
      type: "meeting.create";
      duration?: number;
      meetingType?: "team" | "individual";
      projectId?: string;
      title: string;
      inviteeIds: string[];
      date: string;
      time: string;
      agenda: string;
      location: string;
    }
  | {
      type: "meeting.update";
      id: string;
      title: string;
      inviteeIds: string[];
      date: string;
      time: string;
      duration: number;
      location: string;
      agenda: string;
      meetingType: "team" | "individual";
      projectId?: string;
    }
  | { type: "meeting.notes"; id: string; notes: string }
  | { type: "meeting.complete"; id: string }
  | { type: "meeting.respond"; id: string; response: "accepted" | "declined" }
  | { type: "meeting.cancel"; id: string }
  | { type: "attendance.set"; userId: string; date: string; present: boolean }
  | { type: "day.set"; date: string; open: boolean }
  | { type: "table.assign"; projectId: string; table: string }
  | { type: "table.release"; projectId: string }
  | { type: "table.verify"; projectId: string }
  | { type: "tool.issue"; projectId: string; name: string; quantity: number }
  | { type: "tool.return"; id: string; returned: number; damaged: number; missing: number }
  | {
      type: "notice.add";
      body: string;
      projectId?: string;
      supervisors: boolean;
      kind: "notice" | "observation";
    }
  | { type: "notice.view"; id: string }
  | { type: "availability.set"; value: "open" | "closed" }
  | { type: "threshold.set"; value: number | null }
  | { type: "profile.edit"; name: string; bio: string; photo?: string }
  | { type: "part.add"; projectId: string; name: string; quantity: number; unitPrice: number }
  | { type: "part.status"; id: string; status: Part["status"] }
  | { type: "part.update"; id: string; quantity: number; unitPrice: number }
  | { type: "budget.set"; projectId: string; amount: number }
  | { type: "expense.add"; projectId: string; title: string; amount: number }
  | { type: "bookmark.toggle"; id: string }
  | { type: "alert.read"; id: string }
  | {
      type: "circuit.save";
      id?: string;
      name: string;
      nodes: Circuit["versions"][number]["nodes"];
      wires: Circuit["versions"][number]["wires"];
    }
  | { type: "circuit.share"; id: string; shared: boolean; published: Circuit["published"] }
  | { type: "circuit.copy"; id: string };

function insist(value: unknown, code = "not_allowed"): asserts value {
  if (!value) throw new Error(code);
}
function short(value: string) {
  const text = value.trim();
  insist(text.length > 0 && text.length <= 4000, "invalid_input");
  return text;
}
function validDay(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T12:00:00Z")) &&
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value
  );
}
function number(value: number, min = 0, max = 1000000) {
  insist(Number.isFinite(value) && value >= min && value <= max, "invalid_input");
  return value;
}
export function migrateWorkspace(state: Workspace): Workspace {
  const next: Workspace = JSON.parse(JSON.stringify(state));
  Object.assign(next, { domainVersion });
  next.projects.forEach(p => { p.canonicalId ??= demoProjectId("mobile", p.id); if (p.canonicalId === demoTeam.id) p.termId ??= demoTerm.id; });
  next.users.forEach(user => {
    const i = ["s1", "s2", "s3"].indexOf(user.id);
    if (i >= 0 && user.role === "student") user.canonicalId ??= demoStudents[i]!.id;
    if (user.id === "d1" && user.role === "supervisor") user.canonicalId ??= demoSupervisor.id;
    if (user.id === "w1" && user.role === "workshop") user.canonicalId ??= demoWorkshop.id;
  });
  next.reports.forEach(report => {
    const latest = report.history?.at(-1);
    if (latest && !latest.state && report.status !== "draft") latest.state = "SUBMITTED";
    if (report.status !== "draft" && !report.history?.length) report.history = [{
      id: `legacy-submission-${report.id}`, state: "SUBMITTED", fields: JSON.parse(JSON.stringify(report.fields)),
      template: report.template, color: report.color, submittedAt: report.submittedAt ?? "",
      ...(report.deck ? { deck: JSON.parse(JSON.stringify(report.deck)) } : {}),
      ...(report.document ? { document: JSON.parse(JSON.stringify(report.document)) } : {}),
      ...(report.attachments ? { attachments: JSON.parse(JSON.stringify(report.attachments)) } : {}),
    }];
  });
  return next;
}
export function applyAction(
  state: Workspace,
  actorId: string,
  action: Action,
  id: string,
  now = new Date(),
): Workspace {
  const user = state.users.find((u) => u.id === actorId);
  insist(user);
  const next = migrateWorkspace(state);
  const own = (projectId: string) => {
    insist(user.role === "student");
    const p = next.projects.find((p) => p.id === projectId);
    insist(p && p.studentIds.includes(actorId));
    return p;
  };
  const supervisor = (projectId: string) => {
    insist(user.role === "supervisor");
    const p = next.projects.find((p) => p.id === projectId);
    insist(p && p.supervisorIds.includes(actorId));
    return p;
  };
  const manager = () => insist(user.role === "workshop");
  const alert = (recipients: string[], body: string) =>
    recipients.forEach((userId, i) =>
      next.alerts.unshift({ id: `${id}-${i}`, userId, body, read: false }),
    );
  const stamp = now.toISOString();
  switch (action.type) {
    case "project.create": {
      throw new Error("Only the Department Head can provision accounts and form project groups.");
    }
    case "project.gate": {
      const p = supervisor(action.id);
      if (action.kind === "final") p.finalOpen = action.open;
      else p.presentationOpen = action.open;
      break;
    }
    case "weekly.create": {
      own(action.projectId);
      insist(
        Number.isInteger(action.week) &&
          action.week > 0 &&
          !next.reports.some(
            (r) =>
              r.projectId === action.projectId && r.kind === "weekly" && r.week === action.week,
          ),
        "invalid_input",
      );
      next.reports.push({
        id,
        projectId: action.projectId,
        kind: "weekly",
        week: action.week,
        status: "draft",
        fields: Object.fromEntries(weeklyFields.map((k) => [k, ""])),
        template: "margin",
        color: "#526443",
        openedBy: [],
        feedback: [],
      });
      break;
    }
    case "task.add": {
      const p = own(action.projectId);
      insist(p.studentIds.includes(action.ownerId));
      next.tasks.push({
        id,
        projectId: p.id,
        title: short(action.title),
        ownerId: action.ownerId,
        done: false,
        createdAt: stamp,
      });
      break;
    }
    case "task.toggle": {
      const task = next.tasks.find((t) => t.id === action.id);
      insist(task && task.ownerId === actorId);
      own(task.projectId);
      task.done = !task.done;
      break;
    }
    case "issue.add":
      own(action.projectId);
      next.issues.push({
        id,
        projectId: action.projectId,
        title: short(action.title),
        resolved: false,
      });
      break;
    case "issue.toggle": {
      const issue = next.issues.find((i) => i.id === action.id);
      insist(issue);
      own(issue.projectId);
      issue.resolved = !issue.resolved;
      break;
    }
    case "project.edit": {
      const p = own(action.id);
      p.title = short(action.title);
      p.description = short(action.description);
      break;
    }
    case "report.save": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report);
      const p = own(report.projectId);
      const separateDraft = action.draftOnly && report.kind === "weekly" && report.status === "submitted" && !report.openedBy.length;
      insist(report.status === "draft" || separateDraft, "locked");
      insist(
        report.kind === "weekly" || (report.kind === "final" ? p.finalOpen : p.presentationOpen),
        "locked",
      );
      insist(
        Object.values(action.fields).every(
          (value) =>
            typeof value === "string" &&
            (report.kind === "final" && action.document ? true : value.length <= 50000),
        ),
        "invalid_input",
      );
      insist(!action.color || /^#[0-9a-f]{6}$/i.test(action.color), "invalid_input");
      if (separateDraft) {
        report.editableDraft = { fields: JSON.parse(JSON.stringify(action.fields)), attachments: JSON.parse(JSON.stringify(action.attachments ?? [])), savedAt: stamp };
        break;
      }
      report.fields = JSON.parse(JSON.stringify(action.fields));
      if (!action.autosave) report.savedAt = stamp;
      if (action.deck) {
        insist(validDeck(action.deck), "invalid_input");
        report.deck = JSON.parse(JSON.stringify(action.deck));
      }
      if (action.attachments) report.attachments = JSON.parse(JSON.stringify(action.attachments));
      if (action.document && report.kind === "final")
        report.document = JSON.parse(JSON.stringify(action.document));
      report.template = action.template ?? report.template;
      report.color = action.color ?? report.color;
      break;
    }
    case "report.publish": {
      const report = next.reports.find(r => r.id === action.id);
      insist(report);
      own(report.projectId);
      insist(report.status === "draft" || (report.status === "submitted" && !report.openedBy.length), "locked");
      report.status = "draft";
      delete report.editableDraft;
      const saved = applyAction(next, actorId, { type: "report.save", id: action.id, fields: action.fields, attachments: action.attachments }, `${id}-draft`, now);
      return applyAction(saved, actorId, { type: "report.submit", id: action.id }, id, now);
    }
    case "report.submit": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report);
      const p = own(report.projectId);
      insist(report.status === "draft", "locked");
      insist(
        report.kind === "weekly" || (report.kind === "final" ? p.finalOpen : p.presentationOpen),
        "locked",
      );
      const fields =
        report.kind === "weekly"
          ? weeklyFields.filter((f) => f !== "delays" || report.fields.hasDelays === "true")
          : Object.keys(report.fields);
      insist(
        fields.every((f) => report.fields[f]?.trim()),
        "required_fields",
      );
      if (report.kind === "weekly" && report.fields.progressPercent !== undefined)
        number(Number(report.fields.progressPercent), 0, 100);
      report.status = "submitted";
      report.submittedAt = stamp;
      report.history ??= [];
      report.history.forEach(version => { if (version.state === "SUBMITTED") version.state = "SUPERSEDED"; });
      report.history.push({
        state: "SUBMITTED",
        ...(report.deck ? { deck: JSON.parse(JSON.stringify(report.deck)) } : {}),
        id,
        ...(report.attachments
          ? { attachments: JSON.parse(JSON.stringify(report.attachments)) }
          : {}),
        ...(report.document ? { document: JSON.parse(JSON.stringify(report.document)) } : {}),
        fields: JSON.parse(JSON.stringify(report.fields)),
        template: report.template,
        color: report.color,
        submittedAt: stamp,
      });
      report.openedBy = [];
      alert(p.supervisorIds, `${p.title} · ${report.kind} submitted`);
      break;
    }
    case "report.withdraw": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report);
      own(report.projectId);
      insist(
        report.kind === "weekly" && report.status === "submitted" && !report.openedBy.length,
        "locked",
      );
      report.status = "draft";
      const withdrawn = report.history?.at(-1);
      if (withdrawn) withdrawn.state = "WITHDRAWN";
      report.submittedAt = undefined;
      break;
    }
    case "report.view": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report && report.status !== "draft");
      supervisor(report.projectId);
      if (!report.openedBy.includes(actorId)) report.openedBy.push(actorId);
      break;
    }
    case "report.review": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report && report.status !== "draft");
      const p = supervisor(report.projectId);
      const submission = report.history?.[report.history.length - 1];
      insist(submission && submission.id === action.submissionId && submission.state === "SUBMITTED" && report.openedBy.includes(actorId), "locked");
      report.feedback.push({
        submissionId: submission.id,
        id,
        authorId: actorId,
        body: short(action.body),
        section: action.section,
        createdAt: stamp,
      });
      report.status = action.status;
      if (!report.openedBy.includes(actorId)) report.openedBy.push(actorId);
      alert(p.studentIds, `${p.title} · New supervisor feedback`);
      break;
    }
    case "report.reopen": {
      const report = next.reports.find((r) => r.id === action.id);
      insist(report && report.kind !== "weekly");
      const project = supervisor(report.projectId);
      if (report.kind === "final") project.finalOpen = true;
      else project.presentationOpen = true;
      report.status = "draft";
      report.openedBy = [];
      break;
    }
    case "thread.create": {
      const other = next.users.find((u) => u.id === action.userId);
      insist(other);
      let t = next.threads.find(
        (t) =>
          !t.projectId &&
          t.memberIds.length === 2 &&
          t.memberIds.includes(actorId) &&
          t.memberIds.includes(other.id),
      );
      if (!t) {
        t = { id, name: other.name, memberIds: [...new Set([actorId, other.id])], starredBy: [] };
        next.threads.push(t);
      }
      break;
    }
    case "thread.star": {
      const t = next.threads.find((t) => t.id === action.id);
      insist(t && t.memberIds.includes(actorId));
      t.starredBy = t.starredBy.includes(actorId)
        ? t.starredBy.filter((a) => a !== actorId)
        : [...t.starredBy, actorId];
      break;
    }
    case "thread.edit": {
      const t = next.threads.find((t) => t.id === action.id);
      insist(t && t.projectId && t.memberIds.includes(actorId));
      t.name = short(action.name);
      if (action.photo) t.photo = action.photo;
      break;
    }
    case "message.send": {
      const t = next.threads.find((t) => t.id === action.threadId);
      insist(t && t.memberIds.includes(actorId));
      insist(action.body.trim() || action.attachment, "required_fields");
      insist(
        !action.replyTo ||
          next.messages.some((m) => m.id === action.replyTo && m.threadId === t.id),
      );
      next.messages.push({
        id,
        threadId: t.id,
        senderId: actorId,
        body: action.body.trim(),
        createdAt: stamp,
        starredBy: [],
        replyTo: action.replyTo,
        forwarded: action.forwarded,
        attachment: action.attachment,
      });
      alert(
        t.memberIds.filter((id) => id !== actorId),
        `${user.name} · ${action.body.trim() || action.attachment?.name || "Attachment"}`,
      );
      break;
    }
    case "message.star": {
      const m = next.messages.find((m) => m.id === action.id);
      insist(m && next.threads.some((t) => t.id === m.threadId && t.memberIds.includes(actorId)));
      m.starredBy = m.starredBy.includes(actorId)
        ? m.starredBy.filter((a) => a !== actorId)
        : [...m.starredBy, actorId];
      break;
    }
    case "message.read": {
      insist(next.threads.some((t) => t.id === action.threadId && t.memberIds.includes(actorId)));
      next.messages
        .filter((m) => m.threadId === action.threadId)
        .forEach((m) => {
          m.seenBy = [...new Set([...(m.seenBy ?? []), actorId])];
        });
      break;
    }
    case "message.delete": {
      const m = next.messages.find((m) => m.id === action.id);
      insist(m && m.senderId === actorId);
      next.messages = next.messages.filter((m) => m.id !== action.id);
      break;
    }
    case "meeting.update": {
      const m = next.meetings.find((m) => m.id === action.id);
      insist(m && m.creatorId === actorId && !m.cancelled && !m.completed);
      insist(
        Number.isFinite(meetingInstant(action.date, action.time)) &&
          meetingInstant(action.date, action.time) > now.getTime(),
        "invalid_input",
      );
      insist(
        Number.isInteger(action.duration) && action.duration >= 15 && action.duration <= 240,
        "invalid_input",
      );
      insist(
        action.location.trim() &&
          action.title.trim() &&
          action.title.length <= 120 &&
          action.agenda.length <= 3000,
        "required_fields",
      );
      insist(
        action.inviteeIds.length &&
          action.inviteeIds.every((id) => id !== actorId && next.users.some((u) => u.id === id)),
        "required_fields",
      );
      if (action.meetingType === "individual")
        insist(new Set(action.inviteeIds).size === 1, "invalid_input");
      if (action.projectId) insist(canSeeProject(next, actorId, action.projectId));
      const timingChanged =
        m.date !== action.date || m.time !== action.time || (m.duration ?? 30) !== action.duration;
      const oldResponses = m.responses;
      Object.assign(m, action, {
        id: m.id,
        inviteeIds: [...new Set(action.inviteeIds)],
        responses: timingChanged
          ? {}
          : Object.fromEntries(
              Object.entries(oldResponses).filter(([id]) => action.inviteeIds.includes(id)),
            ),
      });
      alert(action.inviteeIds, "Meeting updated · " + action.title);
      break;
    }
    case "meeting.notes": {
      const m = next.meetings.find((m) => m.id === action.id);
      insist(m && (m.creatorId === actorId || m.inviteeIds.includes(actorId)));
      insist(action.notes.length <= 5000, "invalid_input");
      m.notes = action.notes;
      break;
    }
    case "meeting.complete": {
      const m = next.meetings.find((m) => m.id === action.id);
      insist(m && m.creatorId === actorId && !m.cancelled && !m.completed);
      m.completed = true;
      break;
    }
    case "meeting.create": {
      insist(
        /^\d{4}-\d{2}-\d{2}$/.test(action.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(action.time),
        "invalid_input",
      );
      insist(
        !Number.isNaN(Date.parse(`${action.date}T${action.time}:00`)) &&
          action.date >= calendarDay(now),
        "invalid_input",
      );
      insist(
        action.inviteeIds.length &&
          action.inviteeIds.every((id) => id !== actorId && next.users.some((u) => u.id === id)),
        "required_fields",
      );
      insist(
        Number.isFinite(meetingInstant(action.date, action.time)) &&
          meetingInstant(action.date, action.time) > now.getTime(),
        "invalid_input",
      );
      insist(
        Number.isInteger(action.duration ?? 30) &&
          (action.duration ?? 30) >= 15 &&
          (action.duration ?? 30) <= 240,
        "invalid_input",
      );
      insist(
        action.location.trim() && action.title.length <= 120 && action.agenda.length <= 3000,
        "required_fields",
      );
      if (action.meetingType === "individual")
        insist(new Set(action.inviteeIds).size === 1, "invalid_input");
      if (action.projectId) insist(canSeeProject(next, actorId, action.projectId));
      next.meetings.push({
        ...action,
        id,
        title: short(action.title),
        creatorId: actorId,
        inviteeIds: [...new Set(action.inviteeIds)],
        responses: {},
        cancelled: false,
      });
      alert(action.inviteeIds, `Meeting invitation · ${action.title}`);
      break;
    }
    case "meeting.respond": {
      const m = next.meetings.find((m) => m.id === action.id);
      insist(m && !m.cancelled && !m.completed && m.inviteeIds.includes(actorId));
      m.responses[actorId] = action.response;
      break;
    }
    case "meeting.cancel": {
      const m = next.meetings.find((m) => m.id === action.id);
      insist(m && m.creatorId === actorId);
      m.cancelled = true;
      break;
    }
    case "day.set":
      manager();
      insist(validDay(action.date), "invalid_input");
      next.days[action.date] = action.open;
      break;
    case "attendance.set": {
      manager();
      insist(validDay(action.date), "invalid_input");
      insist(next.users.some((u) => u.id === action.userId && u.role === "student"));
      insist(next.days[action.date] === true, "closed_day");
      const age = (Date.parse(calendarDay(now)) - Date.parse(action.date)) / 86400000;
      insist(age >= 0 && age <= 7, "locked");
      next.attendance[action.date] ??= {};
      if (next.attendance[action.date][action.userId] !== action.present)
        (next.attendanceHistory ??= []).push({ userId: action.userId, date: action.date, present: action.present, at: stamp, actorId });
      next.attendance[action.date][action.userId] = action.present;
      if (next.absenceThreshold !== null) {
        const days = Object.keys(next.days).filter(
          (day) => next.days[day] && day <= calendarDay(now),
        );
        const absent = days.filter((day) => next.attendance[day]?.[action.userId] === false).length;
        const key = `absence-${action.userId}`;
        if (
          days.length &&
          (absent / days.length) * 100 > next.absenceThreshold &&
          !next.alerts.some((a) => a.id.startsWith(key + ":"))
        ) {
          const p = projectFor(next, action.userId);
          [action.userId, ...(p?.supervisorIds ?? [])].forEach((uid) =>
            next.alerts.push({
              id: `${key}:${uid}`,
              userId: uid,
              body: `Workshop absence alert · ${next.users.find((u) => u.id === action.userId)?.name}`,
              read: false,
            }),
          );
        }
      }
      break;
    }
    case "table.assign": {
      if (user.role !== "workshop") own(action.projectId);
      insist(/^(R(0[1-9]|1\d|2[0-5])|C[1-3])$/.test(action.table), "invalid_input");
      const p = next.projects.find((p) => p.id === action.projectId);
      insist(p);
      const used = next.projects.filter(
        (p) => p.id !== action.projectId && p.table === action.table,
      ).length;
      insist(used < (action.table.startsWith("C") ? 2 : 1), "capacity");
      if (p.table && p.table !== action.table) (p.tableHistory ??= []).push({ table: p.table, releasedAt: stamp });
      p.table = action.table;
      p.tableVerified = user.role === "workshop";
      break;
    }
    case "table.release": {
      manager();
      const project = next.projects.find(p => p.id === action.projectId);
      insist(project && project.table, "invalid_input");
      (project.tableHistory ??= []).push({ table: project.table, releasedAt: stamp });
      project.table = ""; project.tableVerified = false;
      break;
    }
    case "table.verify": {
      manager();
      const p = next.projects.find((p) => p.id === action.projectId);
      insist(p && p.table);
      p.tableVerified = true;
      break;
    }
    case "tool.issue": {
      manager();
      insist(next.projects.some((p) => p.id === action.projectId));
      insist(
        Number.isInteger(action.quantity) && action.quantity > 0 && action.quantity <= 999,
        "invalid_input",
      );
      next.tools.push({
        id,
        projectId: action.projectId,
        name: short(action.name),
        quantity: action.quantity,
        returned: 0,
        damaged: 0,
        missing: 0,
      });
      break;
    }
    case "tool.return": {
      manager();
      const tool = next.tools.find((t) => t.id === action.id);
      insist(tool);
      [action.returned, action.damaged, action.missing].forEach((v) =>
        insist(Number.isInteger(v) && v >= 0, "invalid_input"),
      );
      insist(action.returned + action.damaged + action.missing <= tool.quantity, "invalid_input");
      (tool.inspections ??= []).push({ at: stamp, returned: tool.returned, damaged: tool.damaged, missing: tool.missing });
      Object.assign(tool, {
        returned: action.returned,
        damaged: action.damaged,
        missing: action.missing,
      });
      break;
    }
    case "notice.add": {
      manager();
      insist(!action.projectId || next.projects.some((p) => p.id === action.projectId));
      next.notices.unshift({
        id,
        authorId: actorId,
        body: short(action.body),
        projectId: action.projectId,
        supervisors: action.supervisors,
        kind: action.kind,
        seenBy: [],
        createdAt: stamp,
      });
      const ps = next.projects.filter((p) => !action.projectId || p.id === action.projectId);
      alert(
        [
          ...new Set(
            ps.flatMap((p) =>
              action.kind === "observation"
                ? p.supervisorIds
                : [...p.studentIds, ...(action.supervisors ? p.supervisorIds : [])],
            ),
          ),
        ],
        action.body,
      );
      break;
    }
    case "notice.view": {
      const n = next.notices.find((n) => n.id === action.id);
      insist(n);
      const p = n.projectId ? next.projects.find((p) => p.id === n.projectId) : undefined;
      const allowed =
        user.role === "workshop" ||
        (user.role === "student" &&
          n.kind === "notice" &&
          (!p || p.studentIds.includes(actorId))) ||
        (user.role === "supervisor" &&
          (n.kind === "observation" || n.supervisors) &&
          (!p || p.supervisorIds.includes(actorId)));
      insist(allowed);
      if (!n.seenBy.includes(actorId)) n.seenBy.push(actorId);
      break;
    }
    case "availability.set":
      manager();
      next.availability = action.value;
      break;
    case "threshold.set":
      manager();
      insist(
        action.value === null ||
          (Number.isFinite(action.value) && action.value > 0 && action.value <= 100),
        "invalid_input",
      );
      next.absenceThreshold = action.value;
      break;
    case "profile.edit": {
      const u = next.users.find((u) => u.id === actorId)!;
      u.name = short(action.name);
      u.bio = action.bio;
      if (action.photo) u.photo = action.photo;
      break;
    }
    case "part.add":
      own(action.projectId);
      insist(Number.isInteger(action.quantity), "invalid_input");
      next.parts.push({
        id,
        projectId: action.projectId,
        name: short(action.name),
        quantity: number(action.quantity, 1, 999),
        unitPrice: number(action.unitPrice),
        status: "needed",
      });
      break;
    case "part.status": {
      const p = next.parts.find((p) => p.id === action.id);
      insist(p);
      own(p.projectId);
      p.status = action.status;
      break;
    }
    case "part.update": {
      const part = next.parts.find((p) => p.id === action.id);
      insist(part);
      own(part.projectId);
      insist(Number.isInteger(action.quantity), "invalid_input");
      part.quantity = number(action.quantity, 1, 999);
      part.unitPrice = number(action.unitPrice);
      break;
    }
    case "budget.set": {
      const p = own(action.projectId);
      p.budget = number(action.amount);
      break;
    }
    case "expense.add":
      own(action.projectId);
      next.expenses.push({
        id,
        projectId: action.projectId,
        title: short(action.title),
        amount: number(action.amount, 0.01),
      });
      break;
    case "bookmark.toggle": {
      const key = `${actorId}:${action.id}`;
      next.bookmarks = next.bookmarks.includes(key)
        ? next.bookmarks.filter((k) => k !== key)
        : [...next.bookmarks, key];
      break;
    }
    case "alert.read": {
      const a = next.alerts.find((a) => a.id === action.id);
      insist(a && a.userId === actorId);
      a.read = true;
      break;
    }
    case "circuit.save": {
      insist(user.role === "student");
      insist(
        action.nodes.length <= 20 &&
          action.nodes.every(
            (n) =>
              CATALOG_MAP[n.model] &&
              Number.isFinite(n.x) &&
              Number.isFinite(n.z) &&
              Math.abs(n.x) <= 40 &&
              Math.abs(n.z) <= 40,
          ),
        "invalid_input",
      );
      const data = {
        parts: action.nodes.map((n, i) => ({
          id: String(i),
          type: n.model,
          x: n.x,
          z: n.z,
          rot: 0,
        })),
        wires: [],
      };
      insist(
        action.wires.length <= 200 &&
          action.wires.every(
            (w) =>
              Number.isInteger(w.from) &&
              Number.isInteger(w.to) &&
              Number.isInteger(w.fromPin) &&
              Number.isInteger(w.toPin) &&
              /^#[0-9a-f]{6}$/i.test(w.color) &&
              ["jumper-mm", "jumper-mf", "jumper-fm", "jumper-ff", "power"].includes(w.kind) &&
              !(w.from === w.to && w.fromPin === w.toPin) &&
              checkWireFit(
                data,
                { partId: String(w.from), pin: w.fromPin },
                { partId: String(w.to), pin: w.toPin },
                w.kind as WireType,
              ).ok,
          ),
        "invalid_input",
      );
      const p = projectFor(next, actorId);
      insist(p);
      let c = next.circuits.find((c) => c.id === action.id);
      if (c) insist(c.ownerId === actorId || (c.shared && c.projectId === p.id));
      else {
        c = {
          id,
          ownerId: actorId,
          projectId: p.id,
          name: short(action.name),
          shared: false,
          published: "private",
          versions: [],
        };
        next.circuits.push(c);
      }
      c.name = short(action.name);
      c.versions.push({
        id,
        nodes: JSON.parse(JSON.stringify(action.nodes)),
        wires: JSON.parse(JSON.stringify(action.wires)),
        createdAt: stamp,
      });
      break;
    }
    case "circuit.share": {
      const c = next.circuits.find((c) => c.id === action.id);
      insist(c && c.ownerId === actorId);
      c.shared = action.shared;
      c.published = action.published;
      c.publishedVersionId = action.published === "private" ? undefined : c.versions.at(-1)?.id;
      break;
    }
    case "circuit.copy": {
      const c = next.circuits.find((c) => c.id === action.id);
      insist(user.role === "student" && c && c.published === "copy");
      const p = projectFor(next, actorId);
      insist(p);
      const snapshot = c.versions.find((v) => v.id === c.publishedVersionId);
      insist(snapshot, "not_allowed");
      next.circuits.push({
        ...JSON.parse(JSON.stringify(c)),
        id,
        name: `${c.name} (copy)`,
        ownerId: actorId,
        projectId: p.id,
        shared: false,
        published: "private",
        publishedVersionId: undefined,
        versions: [JSON.parse(JSON.stringify(snapshot))],
      });
      break;
    }
  }
  return next;
}
