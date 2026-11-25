import { useEffect, useState } from "react";
import { webClient } from "../../../../shared/auth/web-session";
import { useAccountAdmin, type ProvisionInput } from "../../../../shared/auth/useAccountAdmin";
import type { Account } from "../../../../shared/auth/session-client";

export function AccountAdministration({ onAccounts }: { onAccounts: (rows: Account[]) => void }) {
  const admin = useAccountAdmin(webClient(import.meta.env));
  useEffect(() => {
    onAccounts(admin.accounts);
  }, [admin.accounts, onAccounts]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [draft, setDraft] = useState<ProvisionInput | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const roles = {
    STUDENT: "Student",
    SUPERVISOR: "Supervisor",
    WORKSHOP_MANAGER: "Workshop Manager",
  };
  const filtered = admin.accounts.filter(
    (a) =>
      (filter === "all" || a.role === filter) &&
      `${a.fullName} ${a.email} ${a.universityNumber ?? a.employeeNumber}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const ok = editing
      ? await admin.rename(editing.id, draft.fullName.trim())
      : await admin.create(draft);
    if (ok) {
      setDraft(null);
      setEditing(null);
    }
  }
  return (
    <section className="dept-panel">
      <div className="dept-toolbar">
        <h2>
          Manage accounts <small>{admin.accounts.length}</small>
        </h2>
        <button
          className="dept-primary"
          disabled={!admin.ready || admin.busy}
          onClick={() => {
            setEditing(null);
            setDraft({ role: "STUDENT", fullName: "" });
          }}
        >
          Add account
        </button>
        <button disabled={admin.busy} onClick={() => void admin.reload()}>
          Refresh accounts
        </button>
      </div>
      {admin.error && (
        <p role="alert" className="dept-error">
          {admin.error}
        </p>
      )}
      {admin.notice && (
        <p role="status" className="dept-notice">
          {admin.notice}
        </p>
      )}
      {!admin.ready && !admin.error && <p role="status">Loading accounts…</p>}
      <div className="dept-account-tabs" role="group" aria-label="Account type">
        {[["all", "All accounts"], ...Object.entries(roles)].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "dept-primary" : "dept-secondary"}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <label>
        Search accounts
        <input
          aria-label="Search accounts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, number or email"
        />
      </label>
      {admin.ready && !filtered.length && <p>No matching accounts.</p>}
      <div className="dept-accounts">
        {filtered.map((a) => (
          <article className="dept-panel" key={a.id}>
            <h3>{a.fullName}</h3>
            <p>
              {roles[a.role as keyof typeof roles]} · {a.universityNumber ?? a.employeeNumber}
            </p>
            <p>{a.email}</p>
            <p>
              {a.status === "ACTIVE"
                ? "Active"
                : a.status === "PENDING_ACTIVATION"
                  ? "Pending activation"
                  : "Disabled"}
            </p>
            <div className="dept-toolbar">
              <button
                disabled={!admin.ready || admin.busy}
                onClick={() => {
                  setEditing(a);
                  setDraft({ role: a.role as ProvisionInput["role"], fullName: a.fullName });
                }}
              >
                Edit name
              </button>
              {a.status === "PENDING_ACTIVATION" && (
                <button
                  disabled={!admin.ready || admin.busy}
                  onClick={() => void admin.invite(a.id)}
                >
                  Resend invitation
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {draft && (
        <div className="dept-overlay">
          <section
            className="dept-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={editing ? "Edit name" : "Add account"}
          >
            <form onSubmit={save}>
              <h2>{editing ? "Edit name" : "Add account"}</h2>
              {!editing && (
                <label>
                  Role
                  <select
                    value={draft.role}
                    disabled={admin.busy}
                    onChange={(e) =>
                      setDraft({
                        role: e.target.value as ProvisionInput["role"],
                        fullName: draft.fullName,
                      })
                    }
                  >
                    {Object.entries(roles).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Full name
                <input
                  aria-label="Full name"
                  value={draft.fullName}
                  required
                  maxLength={160}
                  disabled={admin.busy}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                />
              </label>
              {!editing && (
                <>
                  <label>
                    University number
                    <input
                      aria-label="University number"
                      inputMode="numeric"
                      required
                      pattern={
                        draft.role === "STUDENT"
                          ? "[0-9]{8}"
                          : draft.role === "SUPERVISOR"
                            ? "[0-9]{4}"
                            : "[0-9]{5}"
                      }
                      value={
                        (draft.role === "STUDENT"
                          ? draft.universityNumber
                          : draft.employeeNumber) ?? ""
                      }
                      disabled={admin.busy}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          ...(draft.role === "STUDENT"
                            ? { universityNumber: e.target.value }
                            : { employeeNumber: e.target.value }),
                        })
                      }
                    />
                  </label>
                  {draft.role === "STUDENT" ? (
                    <p>{`s${draft.universityNumber ?? ""}@stu.najah.edu`}</p>
                  ) : (
                    <label>
                      University email
                      <input
                        aria-label="University email"
                        type="email"
                        required
                        value={draft.email ?? ""}
                        disabled={admin.busy}
                        onChange={(e) =>
                          setDraft({ ...draft, email: e.target.value.trim().toLowerCase() })
                        }
                      />
                    </label>
                  )}
                  <p>The owner chooses a password through the activation email.</p>
                </>
              )}
              {admin.error && (
                <p role="alert" className="dept-error">
                  {admin.error}
                </p>
              )}
              {!admin.ready && (
                <button type="button" disabled={admin.busy} onClick={() => void admin.reload()}>
                  Reload accounts
                </button>
              )}
              <button type="submit" className="dept-primary" disabled={admin.busy || !admin.ready}>
                {admin.busy ? "Saving…" : "Save"}
              </button>
              <button type="button" disabled={admin.busy} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
