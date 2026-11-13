import {
  demoTerm,
  effectiveAccountStatus,
  validateGroup,
  withMembershipHistory,
  createLocalId,
} from "../../../shared/web/domain";
import type { DepartmentAccount, DepartmentGroup } from "./components/DepartmentGroups";
import { columns, type Column, type Workbook } from "./departmentWorkbook";

export const scopeOf = (g: DepartmentGroup) => g.termId ?? demoTerm.id;
export const projectNumber = (g: DepartmentGroup) =>
  (g.projectNumber ?? g.code ?? g.label ?? g.id).trim();
export const currentGroup = (g: DepartmentGroup) =>
  g.status !== "ARCHIVED" && scopeOf(g) === demoTerm.id;
export const personDetails = (a: DepartmentAccount) => `${a.name} · ${a.number} · ${a.email}`;
export const eligibleForGroup = (a: DepartmentAccount) => effectiveAccountStatus(a) === "ACTIVE";

/** Department-owned browser records only; this does not provision login access. */
export function normalizeLocalAccounts(accounts: DepartmentAccount[]): DepartmentAccount[] {
  return accounts.map((account): DepartmentAccount => {
    if (effectiveAccountStatus(account) === "PENDING_ACTIVATION")
      return { ...account, status: "ACTIVE", active: true };
    // Preserve deliberate disabling; restoring an older pending record now restores
    // its approved local state rather than returning it to the removed workflow.
    if (
      effectiveAccountStatus(account) === "DISABLED" &&
      account.disabledFrom === "PENDING_ACTIVATION"
    )
      return { ...account, disabledFrom: "ACTIVE" };
    return account;
  });
}

export function validateDepartmentGroup(
  group: DepartmentGroup,
  groups: DepartmentGroup[],
  accounts: DepartmentAccount[],
) {
  if (!projectNumber(group).trim()) throw new Error("Project number is required.");
  if (
    groups.some(
      (g) =>
        g.id !== group.id &&
        scopeOf(g) === scopeOf(group) &&
        projectNumber(g) === projectNumber(group),
    )
  )
    throw new Error("This project number already exists in this term.");
  validateGroup(group, groups, accounts);
}

export function prepareGroupSave(
  group: DepartmentGroup,
  groups: DepartmentGroup[],
  accounts: DepartmentAccount[],
  confirmedTransfer: boolean,
) {
  const previous = groups.find((g) => g.id === group.id);
  if (previous && (previous.status === "ARCHIVED" || previous.status === "COMPLETED"))
    throw new Error("Historical projects cannot be reassigned.");
  const sources = groups.filter(
    (g) =>
      g.id !== group.id &&
      g.status !== "ARCHIVED" &&
      scopeOf(g) === scopeOf(group) &&
      g.studentIds.some((id) => group.studentIds.includes(id)),
  );
  if (sources.some((g) => g.status === "COMPLETED"))
    throw new Error("Students cannot be transferred out of completed historical projects.");
  if (sources.length && !confirmedTransfer)
    throw new Error("Confirm the listed student transfers before saving.");
  const next = groups.map((g) =>
    sources.includes(g)
      ? withMembershipHistory(g, {
          ...g,
          studentIds: g.studentIds.filter((id) => !group.studentIds.includes(id)),
        })
      : g,
  );
  const saved = withMembershipHistory(previous, {
    ...group,
    status: group.status ?? "DRAFT",
    projectNumber: projectNumber(group),
  });
  const final = previous ? next.map((g) => (g.id === saved.id ? saved : g)) : [...next, saved];
  for (const g of [...sources.map((s) => final.find((g) => g.id === s.id)!), saved])
    validateDepartmentGroup(g, final, accounts);
  return final;
}

export type ImportReview = {
  rows: { number: number; values: string[]; errors: string[]; actions: string[] }[];
  errors: string[];
  detailConflicts: { key: string; description: string }[];
  transfers: string[];
  accounts: DepartmentAccount[];
  groups: DepartmentGroup[];
  summary: {
    accountsCreated: number;
    accountsReused: number;
    groupsCreated: number;
    groupsReused: number;
    assignmentsAdded: number;
    transfers: number;
  };
};
export function planImport(
  workbook: Workbook,
  mapping: Record<Column, number>,
  originalAccounts: DepartmentAccount[],
  originalGroups: DepartmentGroup[],
  keepExisting: string[],
  confirmTransfers: boolean,
): ImportReview {
  const review: ImportReview = {
    rows: [],
    errors: [],
    detailConflicts: [],
    transfers: [],
    accounts: [...originalAccounts],
    groups: [...originalGroups],
    summary: {
      accountsCreated: 0,
      accountsReused: 0,
      groupsCreated: 0,
      groupsReused: 0,
      assignmentsAdded: 0,
      transfers: 0,
    },
  };
  if (
    columns.some(
      (c) =>
        !Number.isInteger(mapping[c]) || mapping[c] < 0 || mapping[c] >= workbook.headers.length,
    ) ||
    new Set(columns.map((c) => mapping[c])).size !== columns.length
  ) {
    review.errors.push(
      "Map every field to a distinct column (including the optional Project Name field).",
    );
    return review;
  }
  if (!workbook.rows.length) review.errors.push("No student rows to import.");
  const filePeople = new Map<string, string>();
  const usedAccounts = new Set<string>();
  const projects = new Map<
    string,
    { group: DepartmentGroup; rows: number[]; supervisor: string; title: string }
  >();
  const memberships = new Map<string, string>();
  for (const row of workbook.rows) {
    const values = columns.map((c) => (row.values[mapping[c]] ?? "").trim());
    const [number, title, supNumber, supName, supEmail, studentNumber, studentName, studentEmail] =
      values;
    const parsed = { number: row.number, values, errors: [] as string[], actions: [] as string[] };
    review.rows.push(parsed);
    if (row.formula)
      parsed.errors.push(
        "Formula-based values are unsupported; replace formulas with plain values.",
      );
    if (!number) parsed.errors.push("Project number is required.");
    function person(role: "Supervisor" | "Student", id: string, name: string, rawEmail: string) {
      const email = rawEmail.toLowerCase();
      if (
        !name ||
        !(role === "Student" ? /^\d{8}$/ : /^\d{4}$/).test(id) ||
        !/^\S+@\S+\.\S+$/.test(email)
      ) {
        parsed.errors.push(
          `${role}: name, ${role === "Student" ? "8" : "4"}-digit number and valid email required.`,
        );
        return undefined;
      }
      if (role === "Student" && email !== `s${id}@stu.najah.edu`)
        parsed.errors.push("Student email must match s<8-digit university number>@stu.najah.edu.");
      const key = `${role}:${id}`;
      const detail = JSON.stringify([role, name, email]);
      if (filePeople.has(id) && filePeople.get(id) !== detail)
        parsed.errors.push(`Number ${id} has inconsistent details within this workbook.`);
      filePeople.set(id, detail);
      const matches = review.accounts.filter((a) => a.number === id);
      if (matches.length > 1)
        parsed.errors.push(
          `Saved data has multiple accounts numbered ${id}; resolve this before importing.`,
        );
      const existing = matches[0];
      if (existing && existing.role !== role) {
        parsed.errors.push(`Number ${id} belongs to another role.`);
        return undefined;
      }
      if (review.accounts.some((a) => a.email.toLowerCase() === email && a.number !== id))
        parsed.errors.push(`Email ${email} belongs to another account.`);
      if (existing) {
        if (existing.name !== name || existing.email.toLowerCase() !== email) {
          if (!review.detailConflicts.some((c) => c.key === key))
            review.detailConflicts.push({
              key,
              description: `${role} ${id}: workbook ${name} / ${email}; saved ${existing.name} / ${existing.email}.`,
            });
          if (!keepExisting.includes(key))
            parsed.errors.push(
              `Conflicting saved details for ${id}; review and retain saved details or correct the file.`,
            );
        }
        if (!usedAccounts.has(key)) review.summary.accountsReused++;
        parsed.actions.push(`Reuse ${role.toLowerCase()} ${id}`);
        usedAccounts.add(key);
        return existing;
      }
      const account: DepartmentAccount = {
        id: createLocalId(),
        role,
        name,
        number: id,
        email,
        status: "ACTIVE",
        active: true,
        invited: false,
        linked: true,
      };
      review.accounts.push(account);
      usedAccounts.add(key);
      review.summary.accountsCreated++;
      parsed.actions.push(`Create ${role.toLowerCase()} ${id}`);
      return account;
    }
    const supervisor = person("Supervisor", supNumber, supName, supEmail);
    const student = person("Student", studentNumber, studentName, studentEmail);
    if (!number || !supervisor || !student) continue;
    const matches = originalGroups.filter(
      (g) => scopeOf(g) === demoTerm.id && projectNumber(g) === number,
    );
    if (matches.length > 1)
      parsed.errors.push(
        "Multiple saved groups have this project number; resolve existing data first.",
      );
    let project = projects.get(number);
    if (!project) {
      const existing = matches[0];
      if (existing && ["ARCHIVED", "COMPLETED"].includes(existing.status ?? ""))
        parsed.errors.push("Historical projects cannot be changed by import.");
      if (existing && title && existing.title?.trim() && existing.title.trim() !== title)
        parsed.errors.push(
          "Project name conflicts with the saved project; correct the file or edit the project first.",
        );
      if (existing && !existing.supervisorIds.includes(supervisor.id))
        parsed.errors.push(
          "Supervisor conflicts with the saved project; use explicit manual group editing first.",
        );
      project = {
        group: existing
          ? {
              ...existing,
              projectNumber: number,
              title: existing.title || title,
              studentIds: [...existing.studentIds],
              supervisorIds: [...existing.supervisorIds],
            }
          : {
              id: createLocalId(),
              projectNumber: number,
              title,
              termId: demoTerm.id,
              status: "DRAFT",
              studentIds: [],
              supervisorIds: [supervisor.id],
            },
        rows: [],
        supervisor: supervisor.id,
        title,
      };
      projects.set(number, project);
      if (existing) review.summary.groupsReused++;
      else review.summary.groupsCreated++;
    }
    project.rows.push(row.number);
    if (project.supervisor !== supervisor.id || project.title !== title)
      parsed.errors.push("Rows for one project must agree on project name and supervisor.");
    if (memberships.has(student.id) && memberships.get(student.id) !== number)
      parsed.errors.push("Student assigned to different projects in this workbook.");
    memberships.set(student.id, number);
    if (!project.group.studentIds.includes(student.id)) {
      project.group.studentIds.push(student.id);
      review.summary.assignmentsAdded++;
    }
    parsed.actions.push(
      `${matches.length ? "Reuse" : "Create"} project ${number}; assign student ${studentNumber}`,
    );
  }
  const targets = [...projects.values()];
  // Only explicitly listed student rows can move; existing unlisted members remain intact.
  const moved = new Map<string, string>();
  for (const [student, number] of memberships) {
    const target = projects.get(number)!.group;
    for (const source of originalGroups.filter(
      (g) => g.id !== target.id && currentGroup(g) && g.studentIds.includes(student),
    )) {
      if (source.status === "COMPLETED")
        review.errors.push(
          `Project ${projectNumber(source)}: cannot transfer students out of a completed historical project.`,
        );
      const description = `${originalAccounts.find((a) => a.id === student)?.number ?? student}: ${projectNumber(source)} → ${number}`;
      review.transfers.push(description);
      review.summary.transfers++;
      moved.set(student, target.id);
      if (!confirmTransfers) review.errors.push(`Confirm transfer: ${description}`);
    }
  }
  let next = originalGroups.map((g) => {
    const changed = targets.find((t) => t.group.id === g.id)?.group ?? g;
    return currentGroup(g)
      ? {
          ...changed,
          studentIds: changed.studentIds.filter((id) => !moved.has(id) || moved.get(id) === g.id),
        }
      : changed;
  });
  next.push(
    ...targets.filter((t) => !originalGroups.some((g) => g.id === t.group.id)).map((t) => t.group),
  );
  const affected = next.filter(
    (g) =>
      targets.some((t) => t.group.id === g.id) ||
      (currentGroup(g) &&
        originalGroups.find((old) => old.id === g.id)?.studentIds.some((id) => moved.has(id))),
  );
  for (const g of affected) {
    try {
      validateDepartmentGroup(g, next, review.accounts);
    } catch (cause) {
      const rows = targets.find((t) => t.group.id === g.id)?.rows;
      review.errors.push(
        `Project ${projectNumber(g)}${rows?.length ? ` (Excel rows ${rows.join(", ")})` : ""}: ${cause instanceof Error ? cause.message : "Invalid assignments"}`,
      );
    }
  }
  next = next.map((g) =>
    affected.includes(g)
      ? withMembershipHistory(
          originalGroups.find((old) => old.id === g.id),
          g,
        )
      : g,
  );
  review.groups = next;
  review.accounts = review.accounts.map((a) =>
    next.some((g) => [...g.studentIds, ...g.supervisorIds].includes(a.id))
      ? { ...a, linked: true }
      : a,
  );
  return review;
}
