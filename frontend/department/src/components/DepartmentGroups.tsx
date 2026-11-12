import { useState } from "react";
import { Pencil, Plus, Search, X } from "lucide-react";

export type DepartmentAccount = {
  id: string;
  name: string;
  number: string;
  email: string;
  role: "Supervisor" | "Workshop Manager" | "Student";
  active: boolean;
  linked: boolean;
  invited: boolean;
};
export type DepartmentGroup = {
  id: string;
  studentIds: string[];
  supervisorIds: string[];
};

export function DepartmentGroups({
  accounts,
  groups,
  onSave,
}: {
  accounts: DepartmentAccount[];
  groups: DepartmentGroup[];
  onSave: (group: DepartmentGroup) => void;
}) {
  const [draft, setDraft] = useState<DepartmentGroup | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const people = (ids: string[]) =>
    ids.map((id) => accounts.find((a) => a.id === id)?.name ?? "Unavailable account");
  function toggle(key: "studentIds" | "supervisorIds", id: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      [key]: draft[key].includes(id)
        ? draft[key].filter((value) => value !== id)
        : [...draft[key], id],
    });
    setError("");
  }
  return (
    <section className="dept-panel">
      <div className="dept-toolbar">
        <div>
          <h2>
            Project groups <small>{groups.length}</small>
          </h2>
          <p>Students and their supervisors, connected in one place.</p>
        </div>
        <button
          className="dept-primary"
          onClick={() => {
            setDraft({ id: crypto.randomUUID(), studentIds: [], supervisorIds: [] });
            setError("");
            setSearch("");
          }}
        >
          <Plus size={17} /> Add group
        </button>
      </div>
      <label className="dept-search">
        <Search size={18} />
        <input
          aria-label="Search groups"
          placeholder="Search student or supervisor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="dept-people">
        {groups
          .filter((g) =>
            [...people(g.studentIds), ...people(g.supervisorIds)]
              .join(" ")
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((g) => (
            <article className="dept-person" key={g.id}>
              <div className="dept-toolbar">
                <h3>Student group</h3>
                <button
                  className="dept-secondary"
                  aria-label={`Edit group: ${people(g.studentIds).join(", ")}`}
                  onClick={() => {
                    setDraft({
                      id: g.id,
                      studentIds: [...g.studentIds],
                      supervisorIds: [...g.supervisorIds],
                    });
                    setError("");
                    setSearch("");
                  }}
                >
                  <Pencil size={16} /> Edit
                </button>
              </div>
              <h4>Students · {g.studentIds.length}</h4>
              {people(g.studentIds).map((name, i) => (
                <p key={g.studentIds[i]}>{name}</p>
              ))}
              <h4>Supervisors · {g.supervisorIds.length}</h4>
              {people(g.supervisorIds).map((name, i) => (
                <p key={g.supervisorIds[i]}>{name}</p>
              ))}
            </article>
          ))}
      </div>
      {groups.length === 0 && (
        <p className="dept-empty">
          Add student accounts, then create a group and choose its supervisors.
        </p>
      )}
      {draft && (
        <div className="dept-overlay" role="dialog" aria-modal="true" aria-label="Group details">
          <form
            className="dept-dialog dept-group-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.studentIds.length < 2 || draft.studentIds.length > 3)
                return setError("Choose 2–3 students for the group.");
              if (!draft.supervisorIds.length) return setError("Choose at least one supervisor.");
              if (
                groups.some(
                  (g) =>
                    g.id !== draft.id && g.studentIds.some((id) => draft.studentIds.includes(id)),
                )
              )
                return setError("A selected student already belongs to another group.");
              if (
                [...draft.studentIds, ...draft.supervisorIds].some(
                  (id) => !accounts.find((a) => a.id === id)?.active,
                )
              )
                return setError("Choose active accounts only.");
              onSave({
                id: draft.id,
                studentIds: draft.studentIds,
                supervisorIds: draft.supervisorIds,
              });
              setDraft(null);
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
              Find people
              <input
                aria-label="Find group people"
                placeholder="Name or university number"
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
                <div className="dept-pick-list">
                  {accounts
                    .filter(
                      (a) =>
                        a.role === role &&
                        a.active &&
                        `${a.name} ${a.number}`.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((a) => {
                      const key = role === "Student" ? "studentIds" : "supervisorIds";
                      const assigned =
                        role === "Student" &&
                        groups.some((g) => g.id !== draft.id && g.studentIds.includes(a.id));
                      return (
                        <label className="dept-pick" key={a.id}>
                          <input
                            type="checkbox"
                            checked={draft[key].includes(a.id)}
                            disabled={
                              assigned ||
                              (key === "studentIds" &&
                                draft.studentIds.length >= 3 &&
                                !draft.studentIds.includes(a.id))
                            }
                            onChange={() => toggle(key, a.id)}
                          />
                          <span>
                            {a.name}
                            <small>
                              {a.number}
                              {assigned ? " · Already in a group" : ""}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                </div>
                {!accounts.some((a) => a.role === role && a.active) && (
                  <p>Add {role.toLowerCase()} accounts first.</p>
                )}
              </fieldset>
            ))}
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
