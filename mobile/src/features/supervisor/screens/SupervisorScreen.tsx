import { AppText } from "@/components";
import { Page, Panel, Ring, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { projectProgress } from "@/domain/workspace";
import { View } from "react-native";
import { ReportsPanel } from "@/features/shared/ReportsPanel";
import { MessagesPanel, MeetingsPanel } from "@/features/shared/CommunicationPanels";
import {
  ProfilePanel,
  SettingsPanel,
  NotificationsPanel,
  NoticesPanel,
} from "@/features/shared/AccountPanels";
import { TasksPanel, IssuesPanel, SupervisorProjectsPanel } from "@/features/shared/ProjectPanels";
import { useLanguage } from "@/i18n";
import type { SupervisorPageId } from "../navigation";

export function SupervisorScreen({ page }: { page: SupervisorPageId; showBack?: boolean }) {
  const { state, actorId } = useWorkspace();
  const { t } = useLanguage();
  const text = useCopy();
  const projects = state.projects.filter((p) => p.supervisorIds.includes(actorId));
  return (
    <Page title={t(`supervisor.nav.${page}`)}>
      {page === "projects" ? (
        <SupervisorProjectsPanel />
      ) : page === "reports" ? (
        <ReportsPanel supervisor />
      ) : page === "finalReports" ? (
        <ReportsPanel supervisor onlyFinal />
      ) : page === "messages" ? (
        <MessagesPanel />
      ) : page === "meetings" ? (
        <MeetingsPanel />
      ) : page === "tasks" ? (
        <TasksPanel readonly />
      ) : page === "issues" ? (
        <IssuesPanel readonly />
      ) : page === "profile" ? (
        <ProfilePanel key={actorId} />
      ) : page === "settings" ? (
        <SettingsPanel />
      ) : page === "notifications" ? (
        <NotificationsPanel />
      ) : page === "progress" ? (
        <View style={kit.stack}>
          {projects.map((p) => (
            <Panel key={p.id} title={p.title}>
              <Ring value={projectProgress(state, p.id)} />
              <AppText>
                {text("Completion based on team tasks", "نسبة الإنجاز من مهام الفريق")}
              </AppText>
            </Panel>
          ))}
          <NoticesPanel />
        </View>
      ) : page === "students" ? (
        <View style={kit.stack}>
          {projects.map((p) => (
            <Panel key={p.id} title={p.title}>
              {p.studentIds.map((id) => {
                const u = state.users.find((u) => u.id === id)!;
                return (
                  <View key={id} style={kit.stack}>
                    <AppText weight="semibold">{u.name}</AppText>
                    <AppText selectable tone="muted">
                      {u.email}
                    </AppText>
                    <AppText>
                      {text("Table", "الطاولة")}: {p.table || "—"}
                    </AppText>
                  </View>
                );
              })}
            </Panel>
          ))}
        </View>
      ) : null}
    </Page>
  );
}
