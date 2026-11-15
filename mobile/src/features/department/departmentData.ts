import type { DepartmentAccount, DepartmentGroup } from "../../../../shared/department/records";
import { effectiveAccountStatus } from "../../../../shared/web/domain";
export type Account = Omit<DepartmentAccount, "role" | "linked" | "invited"> & {
  role: "student" | "supervisor" | "workshop";
  linked?: boolean;
  invited?: boolean;
  photo?: string;
};
export type Group = DepartmentGroup;
export type Message = { id: string; person: string; body: string; time: string; at?: string };
export type DepartmentData = { accounts: Account[]; groups: Group[]; messages: Message[] };
const roles = {
  student: "Student",
  supervisor: "Supervisor",
  workshop: "Workshop Manager",
} as const;
const nativeRoles = {
  Student: "student",
  Supervisor: "supervisor",
  "Workshop Manager": "workshop",
} as const;
export const webAccounts = (accounts: Account[]): DepartmentAccount[] =>
  accounts.map((a) => ({
    ...a,
    role: roles[a.role],
    status: effectiveAccountStatus(a),
    linked: a.linked ?? false,
    invited: a.invited ?? false,
  }));
export const mobileAccounts = (accounts: DepartmentAccount[]): Account[] =>
  accounts.map((a) => ({ ...a, role: nativeRoles[a.role] }));
export function validDepartment(data: DepartmentData) {
  return (
    Array.isArray(data.accounts) &&
    data.accounts.every(
      (a) =>
        a &&
        [a.id, a.name, a.number, a.email].every((v) => typeof v === "string") &&
        a.role in roles &&
        typeof a.active === "boolean",
    ) &&
    Array.isArray(data.groups) &&
    data.groups.every(
      (g) =>
        g &&
        typeof g.id === "string" &&
        Array.isArray(g.studentIds) &&
        Array.isArray(g.supervisorIds) &&
        [...g.studentIds, ...g.supervisorIds].every((v) => typeof v === "string"),
    ) &&
    Array.isArray(data.messages) &&
    data.messages.every(
      (m) => m && [m.id, m.person, m.body, m.time].every((v) => typeof v === "string"),
    )
  );
}
