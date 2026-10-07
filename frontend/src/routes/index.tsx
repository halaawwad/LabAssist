import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { WorkshopDashboard } from "@/components/WorkshopDashboard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell, Search, ChevronDown, LayoutDashboard, FolderKanban, Box, Cpu, CircuitBoard,
  Package, Users, BookOpen, MessageSquare, FileText, Settings, CalendarDays,
  Clock3, CheckCircle2, CircleAlert, ArrowUpRight, ArrowRight,
  ClipboardList, Send, X, Zap, MoreHorizontal, Check, Menu, GraduationCap,
  Activity, Hand
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import avatar from "@/assets/student-avatar.jpg";

type ModalName = "project" | "issue" | "report" | "notifications" | "profile" | "section" | null;


const initialTasks = [
  { title: "Finalize circuit schematic", date: "Oct 08", kind: "Design" },
  { title: "Test obstacle detection", date: "Oct 11", kind: "Testing" },
];
const initialComponents = [
  { title: "Ultrasonic Sensor HC-SR04", amount: "2 needed", image: "/components/hc-sr04.jpg" },
  { title: "Li-ion Battery 18650", amount: "1 needed", image: "/components/battery-18650.jpg" },
];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HardwareMate | Dashboard" },
    { name: "description", content: "Track your hardware project, milestones, components, feedback, and weekly reports in HardwareMate AI." },
    { property: "og:title", content: "HardwareMate | Dashboard" },
    { property: "og:description", content: "Your hardware project workspace for progress, tasks, components, and feedback." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const [modal, setModal] = useState<ModalName>(null);
  const navigate = useNavigate();
  const [section, setSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [activity, setActivity] = useState([
    { label: "Edited Smart Car circuit", time: "2 hours ago", icon: CircuitBoard, tone: "mint" },
    { label: "Added Ultrasonic Sensor", time: "Yesterday", icon: Cpu, tone: "rose" },
    { label: "Received supervisor feedback", time: "2 days ago", icon: MessageSquare, tone: "blue" },
  ]);
  const [noticeRead, setNoticeRead] = useState(false);

  function openNav(label: string) {
    setSidebarOpen(false);
    setSection(label);
    if (label === "Dashboard") { setModal(null); return; }
    if (label === "My Project") { navigate({ to: "/project" }); return; }
    else if (label === "Reports") { navigate({ to: "/project", search: { action: "report" } }); return; }
    else setModal("section");
  }
  function addIssue() {
    const text = issueText.trim();
    if (!text) return;
    setIssues((current) => [text, ...current]);
    setActivity((current) => [{ label: `Reported issue: ${text}`, time: "Just now", icon: CircleAlert, tone: "rose" }, ...current].slice(0, 4));
    setIssueText(""); setModal(null);
  }
  function submitReport() {
    setReportSubmitted(true);
    setActivity((current) => [{ label: "Submitted weekly report", time: "Just now", icon: FileText, tone: "mint" }, ...current].slice(0, 4));
    setModal(null);
  }
  const searchEntries = ["Smart Car — Autonomous Navigation", ...initialTasks.map((item) => item.title), ...initialComponents.map((item) => item.title), "Weekly Report"];
  const results = searchEntries.filter((item) => item.toLowerCase().includes(search.toLowerCase())).slice(0, 5);

  return (
    <div className="dashboard-background min-h-screen font-sans">
      <div className="mx-auto flex min-h-screen max-w-[1800px] gap-3 p-2.5 lg:h-screen lg:max-h-[1100px] lg:overflow-hidden">
        {sidebarOpen && <div className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        <WorkspaceSidebar active={section} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSelect={openNav} className="lg:static" />

        <main className="dashboard-main min-w-0 flex-1 overflow-y-auto px-1 pb-3 pt-1 lg:overflow-y-auto lg:px-2 lg:pb-1">
          <header className="flex h-12 items-center gap-3 lg:h-[54px]">
            <Button variant="ghost" size="icon" className="glass-panel size-10 shrink-0 rounded-[11px] lg:hidden" aria-label="Open menu" onClick={() => setSidebarOpen(true)}><Menu /></Button>
            <div className="relative w-full max-w-[535px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <input aria-label="Search dashboard" value={search} onFocus={() => setSearchFocused(true)} onBlur={() => setTimeout(() => setSearchFocused(false), 150)} onChange={(event) => setSearch(event.target.value)} placeholder="Search components, tasks, or projects..." className="glass-panel h-11 w-full rounded-[12px] pl-11 pr-4 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40" />
              {search && searchFocused && <div className="glass-panel glass-strong absolute left-0 right-0 top-12 z-20 rounded-[12px] p-2">{results.length ? results.map((item) => <Button variant="ghost" key={item} onMouseDown={() => { setSearch(item); setSearchFocused(false); setModal(item.includes("Report") ? "report" : "project"); }} className="h-9 w-full justify-start truncate text-left text-xs text-foreground">{item}</Button>) : <p className="px-3 py-2 text-xs text-muted-foreground">No matches found</p>}</div>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setModal("notifications"); setNoticeRead(true); }} className="glass-panel relative size-11 shrink-0 rounded-[12px] text-muted-foreground" aria-label="Notifications"><Bell className="!size-[19px]" />{!noticeRead && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] text-destructive-foreground">2</span>}</Button>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="glass-panel h-11 gap-2 rounded-[12px] px-2 text-left shadow-none sm:min-w-[176px] sm:justify-start"><img src={avatar} alt="NOOR OWASSI" width={34} height={34} className="size-8 rounded-full object-cover" /><span className="hidden flex-1 flex-col leading-tight sm:flex"><span className="text-xs font-semibold text-foreground">NOOR OWASSI</span><span className="text-[10px] text-muted-foreground">Student</span></span><ChevronDown className="hidden !size-4 text-muted-foreground sm:block" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem onClick={() => setModal("profile")}><Users /> View profile</DropdownMenuItem><DropdownMenuItem onClick={() => openNav("Settings")}><Settings /> Settings</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </div>
          </header>

          <div className="welcome-block mb-4 mt-5 lg:mb-5 lg:mt-6"><h1 className="flex items-center gap-2 text-[26px] font-bold leading-tight text-foreground lg:text-[29px]">Welcome Back, NOOR OWASSI <Hand aria-hidden="true" className="size-6 rotate-[-18deg] text-primary" /></h1><p className="mt-1 text-[14px] text-muted-foreground">Let’s build something amazing today.</p></div>

          <section aria-label="Project statistics" className="stats-grid mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat icon={Activity} label="Project Progress" value="68%" detail="On track" tone="mint" />
            <Stat icon={Zap} label="Current Milestone" value="03 / 05" detail="Prototype Testing" tone="blue" />
            <Stat icon={CircleAlert} label="Open Issues" value={String(3 + issues.length).padStart(2, "0")} detail="1 needs attention" tone="rose" />
            <Stat icon={CheckCircle2} label="Budget Status" value="74%" detail="$184 of $250 used" tone="amber" />
          </section>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.9fr)_minmax(275px,.85fr)]">
            <div className="min-w-0 space-y-3">
              <section className="project-card glass-panel rounded-[16px] px-4 py-4 sm:px-5" aria-labelledby="project-title">
                <div className="mb-3 flex items-start justify-between gap-2"><div><div className="mb-1 flex items-center gap-2"><span className="rounded-full bg-mint px-2.5 py-0.5 text-[10px] font-bold text-mint-foreground">CURRENT PROJECT</span></div><h2 id="project-title" className="text-[19px] font-bold leading-tight text-foreground">Smart Car — Autonomous Navigation</h2><p className="mt-0.5 text-[11px] text-muted-foreground">An intelligent vehicle that senses and avoids obstacles.</p></div><Button variant="ghost" size="icon" className="size-8 shrink-0 rounded-lg text-muted-foreground" title="Open project" onClick={() => navigate({ to: "/project" })}><ArrowUpRight /></Button></div>
                <div className="mb-3 flex items-center gap-3"><div className="progress-track h-2 flex-1 overflow-hidden rounded-full"><div className="progress-fill h-full w-[68%] rounded-full" /></div><span className="text-xs font-bold text-primary">68%</span></div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t soft-divider pt-3 sm:grid-cols-4">
                  <ProjectDetail icon={Zap} label="Current Milestone" value="Prototype Testing" />
                  <ProjectDetail icon={CalendarDays} label="Deadline" value="Oct 24, 2026" />
                  <ProjectDetail icon={Users} label="Team Members" value="NOOR OWASSI, Omar + 2" />
                  <ProjectDetail icon={GraduationCap} label="Supervisors" value="Dr. Lina Hassan" />
                </div>
              </section>

              <section className="glass-panel rounded-[16px] p-5"><h2 className="text-sm font-bold">Your project workspace</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Team progress, upcoming deadlines, missing components, supervisor feedback, and weekly reports are together in My Project.</p><Button className="mt-4" size="sm" onClick={() => navigate({ to: "/project" })}>View project details<ArrowRight size={15} /></Button></section>
            </div>

            <section className="glass-panel flex min-w-0 flex-col rounded-[16px] px-4 py-4 sm:px-5" aria-labelledby="activity-title"><div className="flex items-center justify-between"><h2 id="activity-title" className="text-[17px] font-bold text-foreground">Recent Activity</h2><MoreHorizontal size={18} className="text-muted-foreground" /></div><div className="mt-4 flex-1">{activity.map(({ label, time, icon: Icon, tone }, index) => <div key={`${label}-${index}`} className="flex gap-3 border-b soft-divider py-3 first:pt-0 last:border-b-0"><span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tone === "mint" ? "bg-mint text-mint-foreground" : tone === "rose" ? "bg-soft-rose text-destructive" : "bg-soft-blue text-primary"}`}><Icon size={19} strokeWidth={2.2} /></span><div className="min-w-0 self-center"><p className="text-[12px] font-medium leading-snug text-foreground">{label}</p><span className="text-[11px] text-muted-foreground">{time}</span></div></div>)}</div><div className="mt-2 flex items-center gap-2 border-t soft-divider pt-3 text-[11px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />Project activity is up to date</div></section>
          </div>

          <WorkshopDashboard />
          <section className="quick-card glass-panel mt-3 rounded-[16px] px-4 py-3.5 sm:px-5" aria-labelledby="actions-title"><h2 id="actions-title" className="mb-2.5 text-[17px] font-bold text-foreground">Quick Actions</h2><div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{[
            { label: "Open Project", icon: FolderKanban, click: () => navigate({ to: "/project" }) },
            { label: "View Team Tasks", icon: Users, click: () => navigate({ to: "/project", hash: "project-team" }) },
            { label: "Add Issue", icon: CircleAlert, click: () => navigate({ to: "/project", search: { action: "issue" } }) },
            { label: "Submit Weekly Report", icon: Send, click: () => navigate({ to: "/project", search: { action: "report" } }) },
          ].map(({ label, icon: Icon, click }) => <Button key={label} variant="ghost" onClick={click} className="quick-button glass-inset flex h-[65px] flex-col gap-1 rounded-[11px] px-2 py-2 text-center text-[11px] font-semibold text-foreground transition-transform hover:-translate-y-0.5 hover:bg-accent/60 sm:h-[68px]"><Icon className="!size-[20px] text-primary" strokeWidth={1.9} /><span className="whitespace-normal leading-tight">{label}</span></Button>)}</div></section>
        </main>
      </div>

      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) setModal(null); }}><DialogContent className="glass-panel glass-strong max-h-[85vh] max-w-md overflow-y-auto rounded-[18px] border-0 p-6 text-foreground shadow-xl"><DialogHeader><DialogTitle className="text-xl">{modal === "project" ? "Smart Car — Autonomous Navigation" : modal === "issue" ? "Add an Issue" : modal === "report" ? "Weekly Report" : modal === "notifications" ? "Notifications" : modal === "profile" ? "Student Profile" : section}</DialogTitle><DialogDescription>{modal === "project" ? "Your current hardware project" : modal === "issue" ? "Record a blocker for your project team." : modal === "report" ? "Week 06 · Due Oct 09, 2026" : modal === "section" ? "Smart Car project workspace" : "HardwareMate AI"}</DialogDescription></DialogHeader>
        {modal === "project" && <div className="space-y-4 text-sm"><div className="glass-inset rounded-xl p-4"><div className="mb-2 flex justify-between font-semibold"><span>Overall progress</span><span className="text-primary">68%</span></div><div className="progress-track h-2 rounded-full"><div className="progress-fill h-2 w-[68%] rounded-full" /></div></div><div className="grid grid-cols-2 gap-3 text-xs"><div><span className="text-muted-foreground">Milestone</span><p className="font-semibold">Prototype Testing</p></div><div><span className="text-muted-foreground">Deadline</span><p className="font-semibold">Oct 24, 2026</p></div><div><span className="text-muted-foreground">Team</span><p className="font-semibold">NOOR OWASSI, Omar + 2</p></div><div><span className="text-muted-foreground">Supervisor</span><p className="font-semibold">Dr. Lina Hassan</p></div></div></div>}
        {modal === "issue" && <div className="space-y-3"><label htmlFor="issue-input" className="text-xs font-semibold">Issue description</label><textarea id="issue-input" value={issueText} onChange={(event) => setIssueText(event.target.value)} placeholder="Describe the issue..." className="glass-inset min-h-24 w-full resize-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /><Button onClick={addIssue} disabled={!issueText.trim()} className="w-full">Add Issue</Button></div>}
        {modal === "report" && <div className="space-y-3"><div className="glass-inset rounded-xl p-4 text-sm"><p className="font-semibold">Week 06 progress report</p><p className="mt-1 text-xs text-muted-foreground">Prototype Testing · 68% project progress · {completedTasks.length} of 2 upcoming tasks completed</p></div><Button onClick={submitReport} disabled={reportSubmitted} className="w-full">{reportSubmitted ? "Report Submitted" : "Submit Weekly Report"}</Button></div>}
        {modal === "notifications" && <div className="space-y-2 text-sm"><div className="glass-inset rounded-xl p-3">Dr. Lina Hassan left feedback on your circuit.<p className="text-xs text-muted-foreground">2 days ago</p></div><div className="glass-inset rounded-xl p-3">Your weekly report is due Oct 09.<p className="text-xs text-muted-foreground">Upcoming deadline</p></div></div>}
        {modal === "profile" && <div className="flex items-center gap-4"><img src={avatar} alt="NOOR OWASSI" width={64} height={64} className="size-16 rounded-full object-cover" /><div><p className="font-semibold">NOOR OWASSI</p><p className="text-sm text-muted-foreground">Student · Smart Car team</p></div></div>}
        {modal === "section" && <div className="glass-inset rounded-xl p-4 text-sm"><p className="font-semibold">{section}</p><p className="mt-1 text-xs text-muted-foreground">This workspace belongs to your Smart Car project.</p></div>}
      </DialogContent></Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string }) {
  return <div className="stat-card glass-panel flex h-[94px] min-w-0 items-center gap-2 rounded-[16px] px-2.5 sm:gap-3 sm:px-4"><span className={`flex size-10 shrink-0 items-center justify-center rounded-[12px] sm:size-12 sm:rounded-[13px] ${tone === "mint" ? "bg-mint text-mint-foreground" : tone === "blue" ? "bg-soft-blue text-primary" : tone === "rose" ? "bg-soft-rose text-destructive" : "bg-soft-amber text-foreground"}`}><Icon size={22} strokeWidth={1.9} /></span><div className="min-w-0"><div className="text-[10px] leading-tight font-medium text-muted-foreground sm:text-[11px]">{label}</div><div className="text-[23px] font-bold leading-tight text-foreground">{value}</div><div className="truncate text-[10px] text-muted-foreground">{detail}</div></div></div>;
}
function ProjectDetail({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="flex min-w-0 items-start gap-1.5"><Icon size={15} className="mt-0.5 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="truncate text-[11px] font-semibold text-foreground" title={value}>{value}</p></div></div>;
}
function SectionTitle({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return <div className="flex items-center gap-2"><Icon size={17} className="shrink-0 text-primary" /><h2 id={title === "Upcoming Tasks & Deadlines" ? "tasks-title" : title === "Missing Components" ? "components-title" : title === "Latest Supervisor Feedback" ? "feedback-title" : "report-title"} className="truncate text-[13px] font-bold text-foreground" title={title}>{title}</h2></div>;
}
