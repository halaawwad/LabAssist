import { useWorkspace } from "@/state/WorkspaceProvider";
import { calendarDay, projectProgress } from "@/domain/workspace";
import type { SupervisorDashboard } from "@/types/supervisor";

export function useSupervisorDashboard() {
  const { state, actorId } = useWorkspace();
  const user = state.users.find((u) => u.id === actorId)!;
  const projects = state.projects.filter((p) => p.supervisorIds.includes(actorId));
  const ids = projects.map((p) => p.id);
  const reports = state.reports.filter((r) => ids.includes(r.projectId) && r.status !== "draft");
  const overall = projects.length
    ? Math.round(
        projects.reduce((sum, p) => sum + projectProgress(state, p.id), 0) / projects.length,
      )
    : 0;
  const data: SupervisorDashboard = {
    profile: { id: user.id, name: user.name, email: user.email, specialization: user.bio },
    stats: [
      { id: "myProjects", value: projects.length, tone: "green", highlighted: true },
      {
        id: "delayed",
        value: new Set(
          state.tasks
            .filter(
              (task) =>
                ids.includes(task.projectId) &&
                !task.done &&
                task.dueDate &&
                task.dueDate < calendarDay(),
            )
            .map((task) => task.projectId),
        ).size,
        tone: "orange",
      },
      {
        id: "reports",
        value: reports.filter((r) => r.status === "submitted").length,
        tone: "blue",
      },
      {
        id: "issues",
        value: state.issues.filter((i) => ids.includes(i.projectId) && !i.resolved).length,
        tone: "red",
      },
    ],
    progress: {
      overall,
      trend: 0,
      stages: [
        { id: "tasks", value: overall },
        {
          id: "finalReport",
          value:
            (reports.filter((r) => r.kind === "final" && r.status === "reviewed").length /
              Math.max(1, projects.length)) *
            100,
        },
      ],
    },
    meetings: state.meetings
      .filter(
        (m) =>
          !m.cancelled &&
          m.date >= calendarDay() &&
          (m.creatorId === actorId || m.inviteeIds.includes(actorId)),
      )
      .map((m) => ({
        id: m.id,
        projectCode: m.title,
        team: m.location,
        date: m.date,
        time: m.time,
        tone: "green",
      })),
    activities: reports.slice(0, 5).map((r) => ({
      id: r.id,
      initials: "TM",
      student: state.projects.find((p) => p.id === r.projectId)?.title ?? "",
      project: r.kind,
      occurredAt: r.submittedAt ?? new Date().toISOString(),
      tone: "green",
      status: "report",
    })),
  };
  return {
    status: "ready" as "ready" | "loading" | "error",
    data,
    refreshing: false,
    refresh: () => {},
    retry: () => {},
  };
}
