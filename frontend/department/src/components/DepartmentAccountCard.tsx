import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FolderKanban } from "lucide-react";
import type { DepartmentAccount, DepartmentGroup } from "./DepartmentGroups";
import { currentGroup, projectNumber } from "../departmentRecords";
import { DepartmentAccountStatus, DepartmentAvatar } from "./DepartmentPeople";
import { DepartmentGroupDetails, readableLabel } from "./DepartmentGroupCard";

export function DepartmentAccountCard({
  account,
  accounts,
  groups,
  actions,
}: {
  account: DepartmentAccount;
  accounts: DepartmentAccount[];
  groups: DepartmentGroup[];
  actions: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const assigned = groups.filter(
    (group) =>
      currentGroup(group) &&
      (account.role === "Student" ? group.studentIds : group.supervisorIds).includes(account.id),
  );
  const studentCount = new Set(assigned.flatMap((group) => group.studentIds)).size;
  const people = (ids: string[]) =>
    ids.map((id) => accounts.find((person) => person.id === id) ?? { name: "Unavailable account" });
  return (
    <article className="dept-person dept-account-card">
      <div className="dept-card-heading">
        <DepartmentAvatar person={account} />
        <div className="dept-card-title">
          <h3>{account.name}</h3>
          <span>
            {account.role} · <bdi>{account.number}</bdi>
          </span>
        </div>
        <DepartmentAccountStatus person={account} />
      </div>
      <div className="dept-card-summary">
        <span>
          {assigned.length
            ? `${assigned.length} ${assigned.length === 1 ? "group" : "groups"} · ${studentCount} ${studentCount === 1 ? "student" : "students"}`
            : account.role === "Workshop Manager"
              ? "Contact details"
              : "Unassigned"}
        </span>
        <button
          type="button"
          className="dept-expand-button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? "Collapse" : "Expand"} account details: ${account.name}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Less" : "Details"}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <div id={detailsId} hidden={!expanded} className="dept-card-details">
        <span className="dept-account-email" dir="auto">
          {account.email}
        </span>
        {assigned.map((group) => (
          <section className="dept-assigned-group" key={group.id}>
            <div className="dept-assigned-heading">
              <FolderKanban size={17} aria-hidden="true" />
              <h4>{group.title || "Untitled draft project"}</h4>
              {readableLabel(projectNumber(group)) && (
                <span className="dept-project-badge">{projectNumber(group)}</span>
              )}
            </div>
            <DepartmentGroupDetails
              supervisors={people(group.supervisorIds)}
              students={people(group.studentIds)}
            />
          </section>
        ))}
      </div>
      <div className="dept-person-actions">{actions}</div>
    </article>
  );
}
