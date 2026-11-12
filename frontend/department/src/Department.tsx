import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MessageCircle,
  Users,
  X,
  ShieldCheck,
  Pencil,
  Trash2,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
} from "lucide-react";
import "./department.css";
import { LabAssistBrand } from "../../../shared/web/LabAssistBrand";
import { DepartmentMessages } from "./components/DepartmentMessages";
import { loginUrl } from "./loginUrl";
import { endDemoSession } from "../../../shared/web/demoSession";
import {
  DepartmentGroups,
  type DepartmentAccount as Account,
  type DepartmentGroup,
} from "./components/DepartmentGroups";
const initial: Account[] = [
  {
    id: "d1",
    name: "Dr. Ahmad Saleh",
    number: "1024",
    email: "ahmad.saleh@najah.edu",
    role: "Supervisor",
    active: true,
    linked: true,
    invited: true,
  },
  {
    id: "d2",
    name: "Dr. Lina Hassan",
    number: "1035",
    email: "lina.hassan@najah.edu",
    role: "Supervisor",
    active: true,
    linked: false,
    invited: false,
  },
  {
    id: "w1",
    name: "Workshop Manager",
    number: "10001",
    email: "workshop@najah.edu",
    role: "Workshop Manager",
    active: true,
    linked: true,
    invited: true,
  },
];
export default function Department() {
  const [navOpen, setNavOpen] = useState(true);
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [accounts, setAccounts] = useState(initial),
    [loaded, setLoaded] = useState(false),
    [tab, setTab] = useState("accounts"),
    [query, setQuery] = useState(""),
    [role, setRole] = useState("All"),
    [edit, setEdit] = useState<Partial<Account> | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [contact, setContact] = useState("d1"),
    [messages, setMessages] = useState<{ id: string; to: string; body: string; at: string }[]>([]),
    [confirm, setConfirm] = useState<Account | null>(null);
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("labassist.department.preview") || "null");
      if (data) {
        setAccounts(data.accounts);
        setMessages(data.messages || []);
        setGroups(data.groups || []);
      }
    } catch {
      /* Use local sample records. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      localStorage.setItem(
        "labassist.department.preview",
        JSON.stringify({ accounts, messages, groups }),
      );
  }, [accounts, messages, groups, loaded]);
  function save() {
    if (!edit) return;
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
      accounts.some((a) => a.id !== edit.id && a.role === "Workshop Manager" && a.active) &&
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
      active: edit.active ?? true,
      linked: edit.linked ?? false,
      invited: edit.invited ?? false,
    } as Account;
    setAccounts((items) =>
      edit.id ? items.map((a) => (a.id === edit.id ? next : a)) : [...items, next],
    );
    setNotice(edit.id ? "Account updated." : "Account added. Activation invitation is ready.");
    setEdit(null);
  }
  return (
    <main className={`dept ${navOpen ? "dept-nav-expanded" : "dept-nav-collapsed"}`}>
      <nav className="dept-rail" aria-label="Quick navigation">
        <a href={loginUrl()} onClick={() => endDemoSession("department")} aria-label="LabAssist login" className="dept-rail-brand">
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
            ["Supervisors", accounts.filter((a) => a.role === "Supervisor" && a.active).length],
            [
              "Workshop manager",
              accounts.filter((a) => a.role === "Workshop Manager" && a.active).length,
            ],
            ["Students", accounts.filter((a) => a.role === "Student" && a.active).length],
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
        {tab === "accounts" ? (
          <section className="dept-panel">
            <div className="dept-toolbar">
              <h2>
                Manage accounts <small>{accounts.length}</small>
              </h2>
              <button
                className="dept-primary"
                onClick={() => {
                  setEdit({ role: "Supervisor" });
                  setError("");
                }}
              >
                <Plus size={17} />
                Add account
              </button>
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
              <select
                aria-label="Filter role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {["All", "Student", "Supervisor", "Workshop Manager"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
            <div className="dept-people">
              {accounts
                .filter(
                  (a) =>
                    (role === "All" || a.role === role) &&
                    `${a.name} ${a.number} ${a.email}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((a) => (
                  <article key={a.id} className="dept-person">
                    <div className="dept-person-top">
                      <span className="dept-avatar">
                        {a.name
                          .split(" ")
                          .filter((x) => x !== "Dr.")
                          .map((x) => x[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <h3>{a.name}</h3>
                        <p>
                          {a.role} - {a.number}
                        </p>
                      </div>
                      <span
                        className={"dept-status " + (!a.active ? "off" : !a.invited ? "pending" : "")}
                      >
                        {!a.active ? "Disabled" : a.invited ? "Active" : "Pending"}
                      </span>
                    </div>
                    <p>
                      <Mail size={15} />
                      {a.email}
                    </p>
                    <div className="dept-person-actions">
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
                        onClick={() =>
                          setNotice(
                            `Activation invitation prepared for ${a.email}. Email delivery will be connected with the backend.`,
                          )
                        }
                      >
                        Activation invite
                      </button>
                      <button
                        className={!a.linked || a.active ? "dept-danger" : undefined}
                        aria-label={`${a.linked ? (a.active ? "Disable" : "Enable") : "Delete"} ${a.name}`}
                        onClick={() => setConfirm(a)}
                      >
                        <Trash2 size={15} />
                        {a.linked ? (a.active ? "Disable" : "Enable") : "Delete"}
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ) : tab === "groups" ? (
          <DepartmentGroups
            accounts={accounts}
            groups={groups}
            onSave={(group) => {
              setGroups((items) =>
                items.some((g) => g.id === group.id)
                  ? items.map((g) => (g.id === group.id ? group : g))
                  : [...items, group],
              );
              const ids = [...group.studentIds, ...group.supervisorIds];
              setAccounts((items) =>
                items.map((a) => (ids.includes(a.id) ? { ...a, linked: true } : a)),
              );
              setNotice("Group saved with its students and supervisors.");
            }}
          />
        ) : (
          <DepartmentMessages
            accounts={accounts}
            messages={messages}
            contact={contact}
            onSelect={setContact}
            onSend={(body) =>
              setMessages([
                ...messages,
                { id: crypto.randomUUID(), to: contact, body, at: new Date().toISOString() },
              ])
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
                  readOnly={key === "email" && edit.role === "Student"}
                />
              </label>
            ))}
            <label>
              Role
              <select
                aria-label="Account role"
                disabled={Boolean(edit.linked)}
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
                  : "5-digit unique employee number"}{" "}
              - The account owner chooses their password through activation.
            </p>
            {error && (
              <p role="alert" className="dept-error">
                {error}
              </p>
            )}
            <button className="dept-primary">Save account</button>
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
                ? confirm.active
                  ? "Disable access?"
                  : "Enable access?"
                : "Delete account?"}
            </h2>
            <p>
              {confirm.linked
                ? "Existing records stay preserved. Only account access changes."
                : "This unused account will be removed."}
            </p>
            <div className="dept-toolbar">
              <button className="dept-secondary" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className={"dept-primary" + (!confirm.linked || confirm.active ? " dept-danger" : "")}
                onClick={() => {
                  setAccounts((items) =>
                    confirm.linked
                      ? items.map((a) => (a.id === confirm.id ? { ...a, active: !a.active } : a))
                      : items.filter((a) => a.id !== confirm.id),
                  );
                  setConfirm(null);
                  setNotice("Account updated.");
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
