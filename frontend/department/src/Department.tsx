import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  MessageCircle,
  Users,
  X,
  ShieldCheck,
  Pencil,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
} from "lucide-react";
import "./department.css";
import {
  accountHasHistory,
  toggleAccountAccess,
  demoStudents,
  demoSupervisor,
  demoWorkshop,
  demoTeam,
  effectiveAccountStatus,
  domainVersion,
} from "../../../shared/web/domain";
import { LabAssistBrand } from "../../../shared/web/LabAssistBrand";
import { DepartmentMessages } from "./components/DepartmentMessages";
import { loginUrl } from "./loginUrl";
import { endDemoSession } from "../../../shared/web/demoSession";
import {
  DepartmentGroups,
  type DepartmentAccount as Account,
  type DepartmentGroup,
} from "./components/DepartmentGroups";
import { DepartmentImport } from "./components/DepartmentImport";
import { DepartmentAccountCard } from "./components/DepartmentAccountCard";
import { prepareGroupSave, planImport, normalizeLocalAccounts } from "./departmentRecords";
const initial: Account[] = [
  { ...demoSupervisor, role: "Supervisor", active: true, linked: true, invited: true },
  { ...demoWorkshop, role: "Workshop Manager", active: true, linked: true, invited: true },
  ...demoStudents.map((student) => ({
    ...student,
    role: "Student" as const,
    active: true,
    linked: true,
    invited: true,
  })),
];
export default function Department() {
  const [navOpen, setNavOpen] = useState(true);
  const [groupListVersion, setGroupListVersion] = useState(0);
  const [groups, setGroups] = useState<DepartmentGroup[]>([{ ...demoTeam, status: "DRAFT" }]);
  const [accounts, setAccounts] = useState(initial),
    [loaded, setLoaded] = useState(false),
    [tab, setTab] = useState("accounts"),
    [query, setQuery] = useState(""),
    [role, setRole] = useState("Supervisor"),
    [edit, setEdit] = useState<Partial<Account> | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [contact, setContact] = useState(demoSupervisor.id),
    [messages, setMessages] = useState<{ id: string; to: string; body: string; at: string }[]>([]),
    [confirm, setConfirm] = useState<Account | null>(null);
  const snapshot = useRef<{
    accounts: Account[];
    messages: { id: string; to: string; body: string; at: string }[];
    groups: DepartmentGroup[];
    [key: string]: unknown;
  }>({ accounts: initial, messages: [], groups: [{ ...demoTeam, status: "DRAFT" }] });
  const [storageError, setStorageError] = useState("");
  const persisted = useRef<string | null>(null);
  const load = () => {
    try {
      const raw = localStorage.getItem("labassist.department.preview");
      const data = raw === null ? snapshot.current : JSON.parse(raw);
      if (
        !data ||
        !Array.isArray(data.accounts) ||
        !Array.isArray(data.groups ?? []) ||
        !Array.isArray(data.messages ?? [])
      )
        throw new Error("Invalid saved department records");
      const nextAccounts = normalizeLocalAccounts(data.accounts);
      const next = {
        ...data,
        accounts: nextAccounts,
        groups: data.groups ?? [],
        messages: data.messages ?? [],
      };
      let stored = raw;
      if (nextAccounts.some((account, index) => account !== data.accounts[index])) {
        if (localStorage.getItem("labassist.department.preview") !== raw)
          throw new Error("Saved records changed while loading.");
        stored = JSON.stringify(next);
        localStorage.setItem("labassist.department.preview", stored);
      }
      snapshot.current = next;
      persisted.current = stored;
      setAccounts(snapshot.current.accounts);
      setContact(snapshot.current.accounts[0]?.id ?? "");
      setMessages(snapshot.current.messages);
      setGroups(snapshot.current.groups);
      setStorageError("");
      setLoaded(true);
    } catch {
      setStorageError(
        "Could not load department records. Your saved data is unchanged. Please retry.",
      );
      setLoaded(false);
    }
  };
  useEffect(load, []);
  function commit(change: Partial<typeof snapshot.current>) {
    if (!loaded) return false;
    try {
      if (localStorage.getItem("labassist.department.preview") !== persisted.current) {
        setStorageError("Records have changed. Reload before saving; your form is preserved.");
        return false;
      }
      const next = { ...snapshot.current, ...change, domainVersion };
      const serialized = JSON.stringify(next);
      localStorage.setItem("labassist.department.preview", serialized);
      persisted.current = serialized;
      snapshot.current = next;
      setAccounts(next.accounts);
      setGroups(next.groups);
      setMessages(next.messages);
      setStorageError("");
      return true;
    } catch {
      setStorageError("Could not save changes. Your form is preserved. Please try again.");
      return false;
    }
  }
  function save() {
    if (!edit) return;
    const previous = accounts.find((a) => a.id === edit.id);
    if (
      previous &&
      (previous.role !== edit.role ||
        (previous.role === "Student" && previous.number !== edit.number) ||
        previous.email !== edit.email)
    ) {
      setError(
        "Role, university number and email cannot be changed. Names and staff numbers may be edited.",
      );
      return;
    }
    const count = edit.role === "Student" ? 8 : edit.role === "Supervisor" ? 4 : 5;
    const email =
      edit.role === "Student"
        ? `s${edit.number}@stu.najah.edu`
        : (edit.email || "").trim().toLowerCase();
    if (
      !edit.name?.trim() ||
      !new RegExp("^[0-9]{" + count + "}$").test(edit.number || "") ||
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      setError(`Enter a name, valid email and exactly ${count} digits.`);
      return;
    }
    if (
      accounts.some(
        (a) => a.id !== edit.id && (a.number === edit.number || a.email.toLowerCase() === email),
      )
    ) {
      setError("This number or email already exists.");
      return;
    }
    if (
      edit.role === "Workshop Manager" &&
      accounts.some(
        (a) =>
          a.id !== edit.id &&
          a.role === "Workshop Manager" &&
          effectiveAccountStatus(a) !== "DISABLED",
      ) &&
      edit.active !== false
    ) {
      setError("Only one active workshop manager is allowed.");
      return;
    }
    const next = {
      ...edit,
      email,
      name: edit.name.trim(),
      id: edit.id || crypto.randomUUID(),
      active: previous ? previous.active : true,
      status: previous ? effectiveAccountStatus(previous) : "ACTIVE",
      linked: edit.linked ?? false,
      invited: edit.invited ?? false,
    } as Account;
    if (
      !commit({
        accounts: edit.id
          ? accounts.map((a) => (a.id === edit.id ? next : a))
          : [...accounts, next],
      })
    )
      return;
    setNotice(edit.id ? "Account updated." : "Account created.");
    setEdit(null);
  }
  return (
    <main className={`dept ${navOpen ? "dept-nav-expanded" : "dept-nav-collapsed"}`}>
      <nav className="dept-rail" aria-label="Quick navigation">
        <a
          href={loginUrl()}
          onClick={() => endDemoSession("department")}
          aria-label="LabAssist login"
          className="dept-rail-brand"
        >
          <LabAssistBrand iconOnly size={16} />
        </a>
        <button
          aria-label={navOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={navOpen}
          aria-controls="department-navigation"
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </nav>
      {navOpen && (
        <button
          className="dept-nav-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        className="dept-nav glass-panel glass-strong"
        id="department-navigation"
        inert={!navOpen}
      >
        <a href={loginUrl()} onClick={() => endDemoSession("department")} className="dept-brand">
          <LabAssistBrand size={16} />
        </a>
        <span className="dept-label">DEPARTMENT HEAD</span>
        <button className={tab === "accounts" ? "selected" : ""} onClick={() => setTab("accounts")}>
          <Users size={18} />
          Accounts
        </button>
        <button className={tab === "groups" ? "selected" : ""} onClick={() => setTab("groups")}>
          <FolderKanban size={18} /> Groups
        </button>
        <button className={tab === "messages" ? "selected" : ""} onClick={() => setTab("messages")}>
          <MessageCircle size={18} />
          Communication
        </button>
        <a href={loginUrl()} onClick={() => endDemoSession("department")} className="dept-logout">
          Back to login
        </a>
      </aside>
      <section className="dept-main">
        {storageError && (
          <p role="alert" className="dept-error">
            {storageError} <button onClick={load}>Reload saved data</button>
          </p>
        )}
        {!loaded && !storageError && <p role="status">Loading saved department records?</p>}
        <header>
          <div>
            <p className="dept-label">A LITTLE ORGANIZATION. A CONNECTED DEPARTMENT.</p>
            <h1>
              {tab === "accounts"
                ? "People behind the progress."
                : tab === "groups"
                  ? "Bring every team together."
                  : "Keep your department connected."}
            </h1>
            <p>Department workspace - People, groups & communication</p>
          </div>
          <span className="dept-avatar">DH</span>
        </header>
        <div className="dept-stats">
          {[
            [
              "Active supervisors",
              accounts.filter(
                (a) => a.role === "Supervisor" && effectiveAccountStatus(a) === "ACTIVE",
              ).length,
            ],
            [
              "Workshop manager",
              accounts.filter(
                (a) => a.role === "Workshop Manager" && effectiveAccountStatus(a) !== "DISABLED",
              ).length,
            ],
            [
              "Active students",
              accounts.filter((a) => a.role === "Student" && effectiveAccountStatus(a) === "ACTIVE")
                .length,
            ],
            ["Groups", groups.length],
          ].map(([label, n]) => (
            <article key={label}>
              <ShieldCheck size={20} />
              <strong>{n}</strong>
              <span>{label}</span>
            </article>
          ))}
        </div>
        {notice && (
          <p role="status" className="dept-notice">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </p>
        )}
        {tab !== "messages" && (
          <DepartmentImport
            accounts={accounts}
            groups={groups}
            onConfirm={(workbook, mapping, keepExisting, transfers) => {
              if (!loaded) throw new Error("Load saved records before importing.");
              const review = planImport(
                workbook,
                mapping,
                snapshot.current.accounts,
                snapshot.current.groups,
                keepExisting,
                transfers,
              );
              if (review.errors.length || review.rows.some((r) => r.errors.length)) return review;
              if (!commit({ accounts: review.accounts, groups: review.groups }))
                throw new Error(
                  "Could not add groups. Your data and preview are preserved. Please try again.",
                );
              setNotice(
                `${review.summary.groupsCreated} groups added, ${review.summary.groupsReused} existing groups updated.`,
              );
              setGroupListVersion((version) => version + 1);
              setTab("groups");
              return review;
            }}
          />
        )}
        {tab === "accounts" ? (
          <section className="dept-panel">
            <div className="dept-toolbar">
              <h2>
                Manage accounts <small>{accounts.length}</small>
              </h2>
              <button
                className="dept-primary"
                onClick={() => {
                  setEdit({ role: role === "All" ? "Supervisor" : (role as Account["role"]) });
                  setError("");
                }}
              >
                <Plus size={17} />
                Add account
              </button>
            </div>
            <div className="dept-account-tabs" role="group" aria-label="Account type">
              {["Supervisor", "Student", "Workshop Manager", "All"].map((value) => (
                <button
                  key={value}
                  aria-pressed={role === value}
                  className={role === value ? "dept-primary" : "dept-secondary"}
                  onClick={() => setRole(value)}
                >
                  {value === "All"
                    ? "All accounts"
                    : value === "Workshop Manager"
                      ? value
                      : `${value}s`}{" "}
                  <small>
                    {accounts.filter((a) => value === "All" || a.role === value).length}
                  </small>
                </button>
              ))}
            </div>
            <div className="dept-toolbar">
              <label className="dept-search">
                <Search size={18} />
                <input
                  aria-label="Search accounts"
                  placeholder="Search name, number or email - "
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            <div className="dept-people">
              {accounts
                .filter(
                  (a) =>
                    (role === "All" || a.role === role) &&
                    `${a.name} ${a.number} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((a) => (
                  <DepartmentAccountCard
                    key={a.id}
                    account={a}
                    accounts={accounts}
                    groups={groups}
                    actions={
                      <>
                        <button
                          onClick={() => {
                            setEdit({ ...a });
                            setError("");
                          }}
                        >
                          <Pencil size={15} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setContact(a.id);
                            setTab("messages");
                          }}
                        >
                          <MessageCircle size={15} />
                          Message
                        </button>
                        <button
                          className={!a.linked || a.active ? "dept-danger" : undefined}
                          aria-label={`${a.linked ? (effectiveAccountStatus(a) !== "DISABLED" ? "Disable" : "Reactivate") : "Delete"} ${a.name}`}
                          onClick={() =>
                            setConfirm({
                              ...a,
                              linked:
                                a.linked ||
                                accountHasHistory(a.id, groups) ||
                                messages.some((m) => m.to === a.id),
                            })
                          }
                        >
                          <Trash2 size={15} />
                          {a.linked
                            ? effectiveAccountStatus(a) !== "DISABLED"
                              ? "Disable"
                              : "Reactivate"
                            : "Delete"}
                        </button>
                      </>
                    }
                  />
                ))}
              {!accounts.some(
                (a) =>
                  (role === "All" || a.role === role) &&
                  `${a.name} ${a.number} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
              ) && (
                <p className="dept-empty">
                  No matching accounts. Change your search or add an account.
                </p>
              )}
            </div>
          </section>
        ) : tab === "groups" ? (
          <DepartmentGroups
            key={groupListVersion}
            accounts={accounts}
            groups={groups}
            onCreateAccount={(accountRole) => {
              setEdit({ role: accountRole });
              setError("");
            }}
            onSave={(group, confirmedTransfer) => {
              const nextGroups = prepareGroupSave(
                group,
                snapshot.current.groups,
                snapshot.current.accounts,
                confirmedTransfer,
              );
              const ids = nextGroups.flatMap((g) => [...g.studentIds, ...g.supervisorIds]);
              const ok = commit({
                groups: nextGroups,
                accounts: accounts.map((a) => (ids.includes(a.id) ? { ...a, linked: true } : a)),
              });
              if (ok) setNotice("Group saved.");
              return ok;
            }}
          />
        ) : (
          <DepartmentMessages
            accounts={accounts}
            messages={messages}
            contact={contact}
            onSelect={setContact}
            onSend={(body) =>
              commit({
                messages: [
                  ...messages,
                  { id: crypto.randomUUID(), to: contact, body, at: new Date().toISOString() },
                ],
              })
            }
          />
        )}
      </section>
      {edit && (
        <div
          className="dept-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={edit.id ? "Edit account" : "Add account"}
        >
          <form
            className="dept-dialog"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="dept-toolbar">
              <h2>{edit.id ? "Edit account" : "Add account"}</h2>
              <button
                className="dept-icon-button"
                type="button"
                aria-label="Close account form"
                onClick={() => setEdit(null)}
              >
                <X />
              </button>
            </div>
            {(
              [
                ["Name", "name"],
                ["University / employee number", "number"],
                ["Email", "email"],
              ] as const
            ).map(([label, key]) => (
              <label key={key}>
                {label}
                <input
                  aria-label={label}
                  value={
                    key === "email" && edit.role === "Student"
                      ? edit.number
                        ? `s${edit.number}@stu.najah.edu`
                        : ""
                      : String(edit[key as keyof Account] ?? "")
                  }
                  onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                  maxLength={
                    key === "number"
                      ? edit.role === "Student"
                        ? 8
                        : edit.role === "Supervisor"
                          ? 4
                          : 5
                      : 100
                  }
                  readOnly={
                    (key === "email" && edit.role === "Student") ||
                    (!!edit.id &&
                      (key === "email" || (key === "number" && edit.role === "Student")))
                  }
                />
              </label>
            ))}
            <label>
              Role
              <select
                aria-label="Account role"
                disabled={Boolean(edit.id)}
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as Account["role"] })}
              >
                <option>Student</option>
                <option>Supervisor</option>
                <option>Workshop Manager</option>
              </select>
            </label>
            <p>
              {edit.role === "Student"
                ? "8-digit university number; university email is generated automatically"
                : edit.role === "Supervisor"
                  ? "4-digit university number"
                  : "5-digit unique employee number"}
            </p>
            {error && (
              <p role="alert" className="dept-error">
                {error}
              </p>
            )}
            <button className="dept-primary" disabled={!loaded}>
              Save account
            </button>
          </form>
        </div>
      )}
      {confirm && (
        <div
          className="dept-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm account change"
        >
          <div className="dept-dialog">
            <h2>
              {confirm.linked
                ? effectiveAccountStatus(confirm) !== "DISABLED"
                  ? "Disable account?"
                  : "Reactivate account?"
                : "Delete account?"}
            </h2>
            <p>
              {confirm.linked
                ? "Existing records and assignments will be kept."
                : "This unused account will be removed."}
            </p>
            <div className="dept-toolbar">
              <button className="dept-secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={
                  "dept-primary" + (!confirm.linked || confirm.active ? " dept-danger" : "")
                }
                onClick={() => {
                  try {
                    const linked =
                      confirm.linked ||
                      accountHasHistory(confirm.id, groups) ||
                      messages.some((m) => m.to === confirm.id);
                    const nextAccounts = linked
                      ? accounts.map((a) => (a.id === confirm.id ? toggleAccountAccess(a) : a))
                      : accounts.filter((a) => a.id !== confirm.id);
                    if (
                      nextAccounts.filter(
                        (a) =>
                          a.role === "Workshop Manager" && effectiveAccountStatus(a) !== "DISABLED",
                      ).length > 1
                    )
                      throw new Error(
                        "Disable the existing workshop manager before restoring this account.",
                      );
                    if (
                      !commit({
                        accounts: nextAccounts,
                      })
                    )
                      return;
                    setConfirm(null);
                    setNotice("Account updated.");
                  } catch (cause) {
                    setNotice(
                      cause instanceof Error ? cause.message : "Could not update the account.",
                    );
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
