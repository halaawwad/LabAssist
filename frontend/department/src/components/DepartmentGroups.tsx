import { demoTerm, type AccountStatus, type ProjectGroup } from "../../../../shared/web/domain";
import { useState } from "react";
import { Pencil, Plus, Search, X } from "lucide-react";
import { eligibleForGroup, personDetails, projectNumber, scopeOf } from "../departmentRecords";
import { DepartmentGroupCard, readableLabel } from "./DepartmentGroupCard";

export type DepartmentAccount = {
  id: string;
  name: string;
  number: string;
  email: string;
  role: "Supervisor" | "Workshop Manager" | "Student";
  active: boolean;
  status?: AccountStatus;
  disabledFrom?: AccountStatus;
  linked: boolean;
  invited: boolean;
  photoUrl?: string;
  avatarUrl?: string;
  profilePhotoUrl?: string;
};
export type DepartmentGroup = ProjectGroup & {
  projectNumber?: string;
  code?: string;
  label?: string;
  name?: string;
  groupName?: string;
  termName?: string;
};

export function DepartmentGroups({
  accounts,
  groups,
  onSave,
  onCreateAccount,
}: {
  accounts: DepartmentAccount[];
  groups: DepartmentGroup[];
  onSave: (group: DepartmentGroup, confirmedTransfer: boolean) => boolean;
  onCreateAccount: (role: "Student" | "Supervisor") => void;
}) {
  const [draft, setDraft] = useState<DepartmentGroup | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [confirmedTransfer, setConfirmedTransfer] = useState(false);
  const draftNumber = draft ? (draft.projectNumber ?? projectNumber(draft)) : "";
  const people = (ids: string[]) =>
    ids.map((id) => {
      const a = accounts.find((a) => a.id === id);
      return a ? personDetails(a) : "Unavailable account";
    });
  const sources = draft
    ? groups.filter(
        (g) =>
          g.id !== draft.id &&
          g.status !== "ARCHIVED" &&
          scopeOf(g) === scopeOf(draft) &&
          g.studentIds.some((id) => draft.studentIds.includes(id)),
      )
    : [];
  function toggle(key: "studentIds" | "supervisorIds", id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      [key]: draft[key].includes(id)
        ? draft[key].filter((value) => value !== id)
        : [...draft[key], id],
    });
    setError("");
    setConfirmedTransfer(false);
  }
  return (
    <section className="dept-panel">
      <div className="dept-toolbar">
        <div>
          <h2>
            Project groups <small>{groups.length}</small>
          </h2>
          <p>Create and manage project groups.</p>
        </div>
        <button
          className="dept-primary"
          onClick={() => {
            setDraft({
              id: crypto.randomUUID(),
              projectNumber: "",
              title: "",
              status: "DRAFT",
              termId: demoTerm.id,
              studentIds: [],
              supervisorIds: [],
            });
            setError("");
            setSearch("");
            setConfirmedTransfer(false);
          }}
        >
          <Plus size={17} /> Add group
        </button>
      </div>
      <label className="dept-search">
        <Search size={18} />
        <input
          aria-label="Search groups"
          placeholder="Search project, student, supervisor, number or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="dept-people">
        {groups
          .filter((g) =>
            [
              projectNumber(g),
              g.title ?? "",
              g.name ?? "",
              g.groupName ?? "",
              ...people(g.studentIds),
              ...people(g.supervisorIds),
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((g) => (
            <DepartmentGroupCard
              key={g.id}
              number={projectNumber(g)}
              title={g.title}
              students={g.studentIds.map(
                (id) => accounts.find((a) => a.id === id) ?? { name: "Unavailable account" },
              )}
              supervisors={g.supervisorIds.map(
                (id) => accounts.find((a) => a.id === id) ?? { name: "Unavailable account" },
              )}
              status={g.status}
              termName={g.termName}
              action={
                <button
                  className="dept-secondary"
                  disabled={g.status === "ARCHIVED" || g.status === "COMPLETED"}
                  aria-label={`Edit group: ${people(g.studentIds).join(", ")}`}
                  onClick={() => {
                    setDraft({
                      ...g,
                      projectNumber: projectNumber(g),
                      studentIds: [...g.studentIds],
                      supervisorIds: [...g.supervisorIds],
                    });
                    setError("");
                    setSearch("");
                    setConfirmedTransfer(false);
                  }}
                >
                  <Pencil size={16} /> Edit
                </button>
              }
            />
          ))}
      </div>
      {groups.length === 0 && (
        <p className="dept-empty">Select active accounts to create a project group.</p>
      )}
      {groups.length > 0 &&
        !groups.some((g) =>
          [
            projectNumber(g),
            g.title ?? "",
            g.name ?? "",
            g.groupName ?? "",
            ...people(g.studentIds),
            ...people(g.supervisorIds),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ) && (
          <p className="dept-empty">No matching groups. Search a project, name, number or email.</p>
        )}
      {draft && (
        <div className="dept-overlay" role="dialog" aria-modal="true" aria-label="Group details">
          <form
            className="dept-dialog dept-group-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                if (onSave(draft, confirmedTransfer)) setDraft(null);
                else
                  setError(
                    "Could not save the group. Your selections are preserved. Please try again.",
                  );
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "Could not save group.");
              }
            }}
          >
            <div className="dept-toolbar">
              <h2>Group details</h2>
              <button
                className="dept-icon-button"
                type="button"
                aria-label="Close group form"
                onClick={() => setDraft(null)}
              >
                <X />
              </button>
            </div>
            <label>
              Project number / code
              <input
                required={!draftNumber || !!readableLabel(draftNumber)}
                value={readableLabel(draftNumber)}
                placeholder="Project number"
                onChange={(e) => setDraft({ ...draft, projectNumber: e.target.value })}
              />
            </label>
            <label>
              Project name (optional)
              <input
                value={draft.title ?? ""}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            {(draft.name || draft.groupName) && (
              <p>{readableLabel(draft.name || draft.groupName)}</p>
            )}
            <p>Choose 2–3 students and one or more supervisors from active accounts.</p>
            <label>
              Find people
              <input
                aria-label="Find group people"
                placeholder="Name, number or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {(["Student", "Supervisor"] as const).map((role) => (
              <fieldset key={role}>
                <legend>
                  {role === "Student"
                    ? `Students (${draft.studentIds.length}/3)`
                    : `Supervisors (${draft.supervisorIds.length})`}
                </legend>
                <button
                  className="dept-secondary"
                  type="button"
                  onClick={() => onCreateAccount(role)}
                >
                  <Plus size={15} /> Create missing {role.toLowerCase()}
                </button>
                <div className="dept-pick-list">
                  {accounts
                    .filter(
                      (a) =>
                        a.role === role &&
                        (eligibleForGroup(a) ||
                          draft[role === "Student" ? "studentIds" : "supervisorIds"].includes(
                            a.id,
                          )) &&
                        `${a.name} ${a.number} ${a.email}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((a) => {
                      const key = role === "Student" ? "studentIds" : "supervisorIds";
                      const assigned =
                        role === "Student" &&
                        groups.some(
                          (g) =>
                            g.id !== draft.id &&
                            g.status !== "ARCHIVED" &&
                            scopeOf(g) === scopeOf(draft) &&
                            g.studentIds.includes(a.id),
                        );
                      return (
                        <label className="dept-pick" key={a.id}>
                          <input
                            type="checkbox"
                            checked={draft[key].includes(a.id)}
                            disabled={
                              key === "studentIds" &&
                              draft.studentIds.length >= 3 &&
                              !draft.studentIds.includes(a.id)
                            }
                            onChange={() => toggle(key, a.id)}
                          />
                          <span>
                            {a.name}
                            <small>
                              {a.number}
                              {` · ${a.email}`}
                              {assigned ? " · Transfer requires confirmation" : ""}
                              {!a.active ? " · Not active" : ""}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                </div>
                {!accounts.some((a) => a.role === role && eligibleForGroup(a)) && (
                  <p>No active {role.toLowerCase()} accounts. Create an account above.</p>
                )}
              </fieldset>
            ))}
            {sources.length > 0 && (
              <div className="dept-error">
                <p>
                  Transfers remove students from these current groups and retain dated membership
                  history. Each source must still have 2–3 students.
                </p>
                <ul>
                  {sources.map((g) => (
                    <li key={g.id}>
                      {readableLabel(projectNumber(g)) || "Untitled project"}:{" "}
                      {people(g.studentIds.filter((id) => draft.studentIds.includes(id))).join(
                        "; ",
                      )}
                    </li>
                  ))}
                </ul>
                <label className="dept-pick">
                  <input
                    type="checkbox"
                    checked={confirmedTransfer}
                    onChange={(e) => setConfirmedTransfer(e.target.checked)}
                  />
                  I confirm these transfers.
                </label>
              </div>
            )}
            {error && (
              <p role="alert" className="dept-error">
                {error}
              </p>
            )}
            <button className="dept-primary">Save group</button>
          </form>
        </div>
      )}
    </section>
  );
}
