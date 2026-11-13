import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, FolderKanban, Users } from "lucide-react";
import { DepartmentAvatar, DepartmentPersonRow, type DepartmentPerson } from "./DepartmentPeople";

export const readableLabel = (value?: string) =>
  value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
    ? value.trim()
    : "";
const projectStatuses: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In progress",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export function DepartmentGroupDetails({
  students,
  supervisors,
}: {
  students: DepartmentPerson[];
  supervisors: DepartmentPerson[];
}) {
  return (
    <div className="dept-group-members">
      <section>
        <h4>
          Supervisors <small>{supervisors.length}</small>
        </h4>
        {supervisors.map((person, i) => (
          <DepartmentPersonRow key={i} person={person} />
        ))}
      </section>
      <section>
        <h4>
          Students <small>{students.length}</small>
        </h4>
        {students.map((person, i) => (
          <DepartmentPersonRow key={i} person={person} />
        ))}
      </section>
    </div>
  );
}

/** Shared card for manually created, imported, and previewed groups. */
export function DepartmentGroupCard({
  number,
  title,
  students,
  supervisors,
  status = "DRAFT",
  termName,
  action,
  children,
  defaultExpanded = false,
}: {
  number: string;
  title?: string;
  students: DepartmentPerson[];
  supervisors: DepartmentPerson[];
  status?: string;
  termName?: string;
  action?: ReactNode;
  children?: ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = useId();
  const name = title?.trim() || "Untitled draft project";
  return (
    <article className="dept-person dept-group-card">
      <div className="dept-card-heading">
        <span className="dept-project-icon" aria-hidden="true">
          <FolderKanban size={20} />
        </span>
        <div className="dept-card-title">
          <h3>{name}</h3>
          <div className="dept-card-meta">
            {readableLabel(number) && <span className="dept-project-badge">{number}</span>}
            <span className="dept-project-status">
              {projectStatuses[status] || "Status unavailable"}
            </span>
          </div>
        </div>
        {action}
      </div>
      <div className="dept-supervisor-names">
        {supervisors.length ? (
          supervisors.map((person, i) => <span key={i}>{person.name}</span>)
        ) : (
          <span>No supervisor assigned</span>
        )}
      </div>
      <div className="dept-card-summary">
        <span className="dept-member-count">
          <Users size={15} aria-hidden="true" />
          {students.length} {students.length === 1 ? "student" : "students"}
        </span>
        <div className="dept-avatar-stack" aria-hidden="true">
          {students.slice(0, 3).map((person, i) => (
            <DepartmentAvatar key={i} person={person} />
          ))}
          {students.length > 3 && <span className="dept-avatar-more">+{students.length - 3}</span>}
        </div>
        <button
          type="button"
          className="dept-expand-button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? "Collapse" : "Expand"} group details: ${name}`}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Less" : "Details"}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <div id={detailsId} hidden={!expanded} className="dept-card-details">
        {readableLabel(termName) && <p>{termName}</p>}
        <DepartmentGroupDetails students={students} supervisors={supervisors} />
        {children}
      </div>
    </article>
  );
}
