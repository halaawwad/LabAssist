/** Dependency-free SQL boundary. UI aliases are explicit, never name matching. */
export type DomainRole = "STUDENT" | "SUPERVISOR" | "WORKSHOP_MANAGER" | "DEPARTMENT_HEAD";
export type AccountStatus = "REFERENCE_ONLY" | "PENDING_ACTIVATION" | "ACTIVE" | "DISABLED";
export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type SubmissionState = "SUBMITTED" | "WITHDRAWN" | "SUPERSEDED";
export type DomainUser = { id: string; role: DomainRole; status: AccountStatus; email: string };
export type Term = { id: string; teamCapacity: number };
export type ProjectGroup = {
  id: string;
  canonicalId?: string;
  termId?: string;
  title?: string;
  studentIds: string[];
  supervisorIds: string[];
  status?: ProjectStatus;
  membershipHistory?: { studentIds: string[]; supervisorIds: string[]; endedAt: string }[];
};
export type ProjectTask = { id: string; projectId: string; assignedTo: string; status: TaskStatus };
export type Submission = {
  id: string;
  projectId: string;
  versionId: string;
  state: SubmissionState;
};
export type PartRequest = { id: string; projectId: string; requestedBy: string; quantity: number };
export type Meeting = { id: string; projectId: string; participantIds: string[]; startsAt: string };
export type Attendance = { studentId: string; date: string; status: "PRESENT" | "ABSENT" };
export type TableAssignment = { projectId: string; tableId: string; releasedAt?: string };
export type Handover = {
  id: string;
  projectId: string;
  quantity: number;
  returned: number;
  damaged: number;
  missing: number;
};
export const roleMap = {
  student: "STUDENT",
  supervisor: "SUPERVISOR",
  workshop: "WORKSHOP_MANAGER",
  department: "DEPARTMENT_HEAD",
} as const;
export const taskStatusMap = {
  Pending: "TODO",
  "To Do": "TODO",
  "In Progress": "IN_PROGRESS",
  Completed: "DONE",
} as const;
export const attendanceStatusMap = {
  present: "PRESENT",
  absent: "ABSENT",
  absence: "ABSENT",
} as const;
// Review outcomes are separate from immutable submission state.
export const reviewStatusMap = {
  reviewed: "REVIEWED",
  revision: "NEEDS_CHANGES",
  changes: "NEEDS_CHANGES",
  approved: "APPROVED",
} as const;
export const meetingStatusMap = {
  scheduled: "SCHEDULED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
} as const;
export const meetingResponseMap = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  declined: "DECLINED",
} as const;
/** Unmapped local request states deliberately require a backend contract. */
export const partRequestStatusMap = {
  Pending: "PENDING",
  "Ready for Pickup": "READY",
  Rejected: "REJECTED",
  Draft: null,
  Approved: null,
  Completed: null,
  Cancelled: null,
} as const;

export const domainVersion = 2;
export const demoTerm: Term = { id: "10000000-0000-4000-8000-000000000100", teamCapacity: 25 };
export const demoTeam = {
  id: "10000000-0000-4000-8000-000000002001",
  title: "CropBot",
  label: "TEAM01",
  termId: demoTerm.id,
  studentIds: [
    "10000000-0000-4000-8000-000000001001",
    "10000000-0000-4000-8000-000000001002",
    "10000000-0000-4000-8000-000000001003",
  ],
  supervisorIds: ["10000000-0000-4000-8000-000000000001"],
};
export const demoStudents = [
  {
    id: demoTeam.studentIds[0]!,
    name: "Noor Ahmad Salem",
    number: "20260001",
    email: "s20260001@stu.najah.edu",
  },
  {
    id: demoTeam.studentIds[1]!,
    name: "Sara Mohammad Hassan",
    number: "20260002",
    email: "s20260002@stu.najah.edu",
  },
  {
    id: demoTeam.studentIds[2]!,
    name: "Lina Samer Odeh",
    number: "20260003",
    email: "s20260003@stu.najah.edu",
  },
];
export const demoSupervisor = {
  id: demoTeam.supervisorIds[0]!,
  name: "Demo Supervisor 01",
  number: "1024",
  email: "demo.supervisor01@najah.edu",
};
// IDs from md5('project-work-task:' || student_id)::uuid in stage 2.
export const demoTasks = [
  "cdd72c0d-57fc-5296-d597-79f6313e031a",
  "436e5775-11e5-9267-015a-3d87b3ca4503",
  "9dfc1232-049e-bc00-a687-12401b251da9",
].map((id, index) => ({
  id,
  projectId: demoTeam.id,
  assignedTo: demoStudents[index]!.id,
  title: "Review assigned circuit connections",
  status: "TODO" as const,
}));
/** Display aliases stay intact; integration uses these SQL table identifiers. */
export function tableIdToSql(displayId: string) {
  if (/^R0?([1-9]|1\d|2[0-5])$/.test(displayId)) return `R${Number(displayId.slice(1))}`;
  if (/^C[1-3]$/.test(displayId)) return displayId;
  throw new Error("Unknown workshop table identity.");
}
export const demoWorkshop = {
  id: "30000000-0000-4000-8000-000000000001",
  name: "Demo Workshop Manager",
  number: "10001",
  email: "demo.workshop@najah.edu",
};
export function createLocalId() {
  // Demo record identity only, never a credential or an activation token.
  return (
    globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const n = Math.floor(Math.random() * 16);
      return (c === "x" ? n : (n & 3) | 8).toString(16);
    })
  );
}
export function effectiveAccountStatus(account: {
  status?: AccountStatus;
  active: boolean;
  invited?: boolean;
}): AccountStatus {
  return (
    account.status ??
    (!account.active ? "DISABLED" : account.invited === false ? "PENDING_ACTIVATION" : "ACTIVE")
  );
}
export function toggleAccountAccess<
  T extends {
    active: boolean;
    status?: AccountStatus;
    invited?: boolean;
    disabledFrom?: AccountStatus;
  },
>(account: T): T {
  const status = effectiveAccountStatus(account);
  // Disabling and restoring a pending account never activates it.
  const next = status === "DISABLED" ? (account.disabledFrom ?? "ACTIVE") : "DISABLED";
  return {
    ...account,
    status: next,
    active: next === "ACTIVE",
    disabledFrom: status === "DISABLED" ? account.disabledFrom : status,
  };
}
/** Only these deliberately assigned fixture aliases may be resolved automatically. */
export function demoProjectId(
  app: "student" | "supervisor" | "workshop" | "mobile",
  legacyId: string,
) {
  const aliases = {
    student: ["primary"],
    supervisor: ["cropbot", "CPE-590"],
    workshop: ["G01"],
    mobile: ["p1"],
  };
  return aliases[app].includes(legacyId) || legacyId === demoTeam.id ? demoTeam.id : undefined;
}
export function requireRole(actual: DomainRole, expected: DomainRole) {
  if (actual !== expected) throw new Error("This action is not permitted for this role.");
}
export function canReview(supervisorId: string, project: ProjectGroup, submission?: Submission) {
  return (
    project.supervisorIds.includes(supervisorId) &&
    !!submission &&
    submission.projectId === project.id &&
    submission.state === "SUBMITTED"
  );
}
export function validateGroup(
  group: ProjectGroup,
  groups: ProjectGroup[],
  accounts: {
    id: string;
    active: boolean;
    role: string;
    status?: AccountStatus;
    invited?: boolean;
  }[],
) {
  if (
    new Set(group.studentIds).size !== group.studentIds.length ||
    new Set(group.supervisorIds).size !== group.supervisorIds.length
  )
    throw new Error("Duplicate membership or supervisor link.");
  if (group.studentIds.length < 2 || group.studentIds.length > 3 || !group.supervisorIds.length)
    throw new Error("Choose 2–3 students and at least one supervisor.");
  for (const [ids, roles] of [
    [group.studentIds, ["Student", "student"]],
    [group.supervisorIds, ["Supervisor", "supervisor"]],
  ] as const)
    for (const id of ids)
      if (
        !accounts.some(
          (a) =>
            a.id === id &&
            effectiveAccountStatus(a) === "ACTIVE" &&
            roles.some((r) => r === a.role),
        )
      )
        throw new Error("Choose active accounts with the correct role only.");
  const current = groups.filter(
    (g) =>
      g.id !== group.id &&
      g.status !== "ARCHIVED" &&
      (g.termId ?? demoTerm.id) === (group.termId ?? demoTerm.id),
  );
  if (current.some((g) => g.studentIds.some((id) => group.studentIds.includes(id))))
    throw new Error("A student already belongs to a current group in this term.");
  if (
    group.supervisorIds.some(
      (id) => current.filter((g) => g.supervisorIds.includes(id)).length >= 4,
    )
  )
    throw new Error("A supervisor can supervise at most four groups per term.");
  if (current.length >= demoTerm.teamCapacity)
    throw new Error("The demo term's workshop team capacity is full.");
}
export function withMembershipHistory<T extends ProjectGroup>(previous: T | undefined, next: T): T {
  if (!previous) return { ...next, termId: next.termId ?? demoTerm.id };
  const changed =
    JSON.stringify([previous.studentIds, previous.supervisorIds]) !==
    JSON.stringify([next.studentIds, next.supervisorIds]);
  return {
    ...previous,
    ...next,
    membershipHistory: [
      ...(previous.membershipHistory ?? []),
      ...(changed
        ? [
            {
              studentIds: [...previous.studentIds],
              supervisorIds: [...previous.supervisorIds],
              endedAt: new Date().toISOString(),
            },
          ]
        : []),
    ],
  };
}
export function accountHasHistory(id: string, groups: ProjectGroup[]) {
  return groups.some((g) =>
    [
      ...g.studentIds,
      ...g.supervisorIds,
      ...(g.membershipHistory ?? []).flatMap((h) => [...h.studentIds, ...h.supervisorIds]),
    ].includes(id),
  );
}
