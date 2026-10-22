import { useEffect, useState } from "react";
import {
  ArrowDownUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flame,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShoppingCart,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { SupervisorTopBar } from "../../components/supervisor/SupervisorTopBar";
import { ActionDialog } from "../../components/supervisor/tasks/ActionDialog";
import {
  issueProjects,
  issueProject,
  type Issue,
  type IssueStatus,
  type IssueType,
  type Priority,
} from "../../data/supervisor/issuesMockData";
import { useI18n } from "../../i18n/i18nContext";
import { readStored, writeStored } from "../../state/storage";
import { useIssues } from "../../state/supervisor/issuesStore";
import { IssueSourceDetails } from "../../components/supervisor/reports/IssueSourceDetails";
import { issuesLabels } from "./issuesLabels";
import "./issues.css";

const priorities: Priority[] = ["high", "medium", "low"];
const statuses: IssueStatus[] = ["open", "monitoring", "resolved"];
const types: IssueType[] = ["hardware", "design", "procurement", "delay"];
const typeIcons = { hardware: Settings2, design: Wrench, procurement: ShoppingCart, delay: Clock };
const pageSize = 5;
type IssueActivity = {
  id: string;
  issueId: string;
  kind: "newIssue" | "updated" | "comment";
  date: string;
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hebron",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function Issues() {
  const { language, t, formatDate } = useI18n();
  const l = issuesLabels[language];
  const [issues, setIssues] = useIssues();
  const [activities, setActivities] = useState(() =>
    readStored<IssueActivity[]>("issue-activity.v1", [
      { id: "a1", issueId: "i1", kind: "newIssue", date: "2026-10-18" },
      { id: "a2", issueId: "i2", kind: "updated", date: "2026-10-17" },
      { id: "a3", issueId: "i4", kind: "updated", date: "2026-10-15" },
    ]),
  );
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("all");
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const [dialog, setDialog] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  useEffect(() => {
    writeStored("issue-activity.v1", activities);
  }, [activities]);
  const filtered = issues
    .filter(
      (i) =>
        (project === "all" || i.projectId === project) &&
        (priority === "all" || i.priority === priority) &&
        (status === "all" || i.status === status) &&
        (type === "all" || i.type === type) &&
        `${i.title} ${i.description} ${issueProject(i).name} ${issueProject(i).team}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const selected = issues.find((i) => i.id === dialog);
  const update = (id: string, changes: Partial<Issue>) =>
    setIssues((items) => items.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  const recordActivity = (issueId: string, kind: IssueActivity["kind"]) =>
    setActivities((items) => [{ id: crypto.randomUUID(), issueId, kind, date: today() }, ...items]);
  const reset = () => {
    setQuery("");
    setProject("all");
    setPriority("all");
    setStatus("all");
    setType("all");
    setPage(0);
  };
  const filterSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        setPage(0);
      }}
    >
      <option value="all">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  return (
    <div className="issues-workspace">
      <div className="issues-topline">
        <span>
          {t("app.portal")} <ChevronRight size={15} /> <strong>{l.title}</strong>
        </span>
        <SupervisorTopBar />
      </div>
      <section className="issues-main" aria-labelledby="issues-title">
        <header className="issues-heading">
          <span className="issues-heading-icon">
            <TriangleAlert size={26} />
          </span>
          <div>
            <h1 id="issues-title">{l.title}</h1>
            <p>{l.subtitle}</p>
          </div>
          <button className="issues-report" onClick={() => setDialog("new")}>
            <Plus size={18} />
            {l.report}
          </button>
        </header>
        <div className="issues-summary" aria-label={l.title}>
          <svg
            className="issues-flow"
            viewBox="0 0 1000 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="issue-flow">
                <stop stopColor="#ff7568" />
                <stop offset=".45" stopColor="#ffc04c" />
                <stop offset=".8" stopColor="#65b698" />
                <stop offset="1" stopColor="white" />
              </linearGradient>
            </defs>
            <path d="M55 50 C60 150 170 85 245 125 S400 100 460 110 S580 62 655 92 S770 8 850 60 S950 65 1000 10" />
            <path
              className="issues-flow-light"
              d="M55 50 C60 150 170 85 245 125 S400 100 460 110 S580 62 655 92 S770 8 850 60 S950 65 1000 10"
            />
          </svg>
          {priorities.map((p, n) => (
            <button
              key={p}
              className={`issues-metric ${p} ${priority === p ? "is-selected" : ""}`}
              style={{ animationDelay: `${n * -1.7}s` }}
              onClick={() => {
                setPriority(priority === p ? "all" : p);
                setPage(0);
              }}
              aria-pressed={priority === p}
            >
              <span className="issues-orb">
                {p === "low" ? (
                  <Check size={19} />
                ) : p === "high" ? (
                  <Flame size={18} />
                ) : (
                  <span>!</span>
                )}
              </span>
              <span>
                <strong>{issues.filter((i) => i.priority === p).length}</strong>
                <small>{l[p]}</small>
              </span>
            </button>
          ))}
          <button className="issues-total" onClick={reset}>
            <strong>{issues.length}</strong>
            <small>{l.total}</small>
          </button>
          <i className="issues-spark spark-one" />
          <i className="issues-spark spark-two" />
          <i className="issues-spark spark-three" />
        </div>
        <div className="issues-filters">
          <label className="issues-search">
            <Search size={18} />
            <input
              aria-label={l.search}
              placeholder={l.search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {filterSelect(
            l.projects,
            project,
            setProject,
            issueProjects.map((p) => ({ value: p.id, label: p.name })),
          )}
          {filterSelect(
            l.statuses,
            status,
            setStatus,
            statuses.map((value) => ({ value, label: l[value] })),
          )}
          {filterSelect(
            l.priorities,
            priority,
            setPriority,
            priorities.map((value) => ({ value, label: l[value] })),
          )}
          {filterSelect(
            l.types,
            type,
            setType,
            types.map((value) => ({ value, label: l[value] })),
          )}
          <label className="issues-sort">
            <ArrowDownUp size={16} />
            <select aria-label={l.newest} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">{l.newest}</option>
              <option value="oldest">{l.oldest}</option>
            </select>
          </label>
        </div>
        <div className="issues-list" aria-live="polite">
          {visible.map((issue) => {
            const p = issueProject(issue);
            const Icon = typeIcons[issue.type];
            return (
              <article className={`issue-row ${issue.priority}`} key={issue.id}>
                <span className="issue-timeline-dot" />
                <button
                  className="issues-orb"
                  aria-label={`${l.details}: ${issue.title}`}
                  onClick={() => {
                    setDialog(issue.id);
                    setComment("");
                  }}
                >
                  {issue.priority === "low" ? (
                    <Check size={18} />
                  ) : issue.priority === "high" ? (
                    <Flame size={17} />
                  ) : (
                    <Wrench size={16} />
                  )}
                </button>
                <div className="issue-copy">
                  <button
                    className="issue-copy-open"
                    onClick={() => {
                      setDialog(issue.id);
                      setComment("");
                    }}
                  >
                    <strong>{issue.title}</strong>
                    <small>{issue.description}</small>
                  </button>
                  <IssueSourceDetails issue={issue} />
                </div>
                <button
                  className="issue-project"
                  onClick={() => {
                    setDialog(issue.id);
                    setComment("");
                  }}
                >
                  <img src={p.image} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.team}</small>
                  </span>
                </button>
                <span className="issue-type">
                  <Icon size={13} />
                  {l[issue.type]}
                </span>
                <span className={`issue-badge ${issue.priority}`}>
                  <Flame size={12} />
                  {l[issue.priority]}
                </span>
                <span className={`issue-badge ${issue.status}`}>{l[issue.status]}</span>
                <time dateTime={issue.date}>
                  {formatDate(issue.date, { month: "short", day: "numeric", year: "numeric" })}
                </time>
                <button
                  className="issue-action"
                  aria-label={`${l.comments}: ${issue.title}`}
                  onClick={() => {
                    setDialog(issue.id);
                    setComment("");
                  }}
                >
                  <MessageSquare size={16} />
                  {issue.comments.length > 0 && <small>{issue.comments.length}</small>}
                </button>
                <button
                  className="issue-action"
                  aria-label={`${l.details}: ${issue.title}`}
                  onClick={() => {
                    setDialog(issue.id);
                    setComment("");
                  }}
                >
                  <MoreHorizontal size={18} />
                </button>
              </article>
            );
          })}
          {!visible.length && (
            <div className="issues-empty">
              <TriangleAlert size={28} />
              <p>{l.empty}</p>
              <button onClick={reset}>{l.reset}</button>
            </div>
          )}
        </div>
        <footer className="issues-pagination">
          <span>
            {filtered.length} · {l.title}
          </span>
          <div>
            <button
              aria-label={l.previous}
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              {l.page} {currentPage + 1} {l.of} {pages}
            </span>
            <button
              aria-label={l.next}
              disabled={currentPage + 1 >= pages}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      {dialog === "new" && (
        <ActionDialog
          title={l.report}
          description={l.local}
          icon={TriangleAlert}
          onClose={() => setDialog(null)}
          submitLabel={l.report}
          onSubmit={(data) => {
            const title = String(data.get("title") ?? "").trim();
            const description = String(data.get("description") ?? "").trim();
            if (!title || !description) return;
            const id = crypto.randomUUID();
            setIssues((items) => [
              {
                id,
                title,
                description,
                projectId: String(data.get("project")),
                teamId: issueProjects.find((project) => project.id === String(data.get("project")))!
                  .teamId,
                source: { kind: "manual" },
                priority: data.get("priority") as Priority,
                type: data.get("type") as IssueType,
                status: "open",
                date: today(),
                comments: [],
              },
              ...items,
            ]);
            recordActivity(id, "newIssue");
            reset();
            setSort("newest");
            setDialog(null);
          }}
        >
          <label className="dialog-field">
            <span>{l.issueTitle}</span>
            <input name="title" required maxLength={100} />
          </label>
          <label className="dialog-field">
            <span>{l.description}</span>
            <textarea name="description" required maxLength={1000} />
          </label>
          <label className="dialog-field">
            <span>{l.project}</span>
            <select name="project">
              {issueProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.team}
                </option>
              ))}
            </select>
          </label>
          <label className="dialog-field">
            <span>{l.priority}</span>
            <select name="priority">
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {l[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="dialog-field">
            <span>{l.type}</span>
            <select name="type">
              {types.map((p) => (
                <option key={p} value={p}>
                  {l[p]}
                </option>
              ))}
            </select>
          </label>
        </ActionDialog>
      )}
      {selected && (
        <ActionDialog
          title={selected.title}
          description={selected.description}
          icon={TriangleAlert}
          onClose={() => setDialog(null)}
          submitLabel={l.save}
          onSubmit={(data) => {
            const status = data.get("status") as IssueStatus;
            if (status !== selected.status) {
              update(selected.id, { status });
              recordActivity(selected.id, "updated");
            }
            setDialog(null);
          }}
        >
          <p>
            {issueProject(selected).name} · {issueProject(selected).team} ·{" "}
            {formatDate(selected.date)}
          </p>
          <IssueSourceDetails issue={selected} />
          <label className="dialog-field">
            <span>{l.status}</span>
            <select key={selected.id} name="status" defaultValue={selected.status}>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {l[s]}
                </option>
              ))}
            </select>
          </label>
          <h3>{l.comments}</h3>
          {selected.comments.length ? (
            selected.comments.map((c, i) => (
              <p className="issue-comment" key={i}>
                {c}
              </p>
            ))
          ) : (
            <p>{l.noComments}</p>
          )}
          <label className="dialog-field">
            <span>{l.addComment}</span>
            <textarea
              value={comment}
              maxLength={1000}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          <button
            className="dialog-secondary-button"
            type="button"
            disabled={!comment.trim()}
            onClick={() => {
              update(selected.id, { comments: [...selected.comments, comment.trim()] });
              recordActivity(selected.id, "comment");
              setComment("");
            }}
          >
            {l.send}
          </button>
        </ActionDialog>
      )}
      {dialog === "activity" && (
        <ActionDialog
          title={l.activity}
          description={l.local}
          icon={Clock}
          onClose={() => setDialog(null)}
        >
          {activities.map((activity) => (
            <p key={activity.id}>
              {l[activity.kind]} · {issues.find((i) => i.id === activity.issueId)?.title} ·{" "}
              {formatDate(activity.date)}
            </p>
          ))}
        </ActionDialog>
      )}
    </div>
  );
}
