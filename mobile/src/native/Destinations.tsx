import { LiveFinancePanel } from "./ProjectFinance";
import { StudentSettings } from "@/features/student/StudentSettings";
import { StudentMeetingsPanel } from "@/features/student/StudentMeetingsPanel";
import { View } from "react-native";
import { CatalogPanel, CircuitLabPanel } from "@/features/student/HardwarePanels";
import { LearningPanel, OffersPanel } from "@/features/student/DiscoveryPanels";
import { MessagesPanel } from "@/features/shared/CommunicationPanels";
import {
  ProfilePanel,
  TeamPanels,
  NotificationsPanel,
  NoticesPanel,
} from "@/features/shared/AccountPanels";
import { ReportsPanel } from "@/features/shared/ReportsPanel";
import { Panel, useCopy } from "@/components/MobileKit";
import { AppText } from "@/components";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { ReferenceProject } from "./ProjectDetails";
import { LiveProjectIssues } from "./ProjectWorkForms";
import { demoMode } from "@/features/auth/client";
import { TasksPanel, IssuesPanel, FinancePanel } from "@/features/shared/ProjectPanels";
export const studentDestinations: Record<string, string> = {
  "My Project": "project",
  Team: "team",
  Components: "parts",
  "View BOM": "parts",
  Reports: "reports",
  "Weekly report": "reports",
  "3D Lab": "lab",
  "My Circuits": "circuits",
  "Component Catalog": "catalog",
  Inventory: "offers",
  "Learning Hub": "learning",
  Messages: "messages",
  Meetings: "meetings",
  "My Profile": "profile",
  Settings: "settings",
  Notifications: "notifications",
};
export function StudentDestination({ page }: { page: string }) {
  const { state, actorId } = useWorkspace();
  const t = useCopy();
  switch (page) {
    case "tasks":
      return demoMode ? <TasksPanel /> : <ReferenceProject initial="Team & Tasks" />;
    case "issues":
      return demoMode ? <IssuesPanel /> : <LiveProjectIssues />;
    case "budget":
      return demoMode ? <FinancePanel /> : <LiveFinancePanel />;
    case "project":
      return <ReferenceProject />;
    case "team":
      return <ReferenceProject initial="Team & Tasks" />;
    case "parts":
      return <ReferenceProject initial="Components" />;
    case "reports":
      return <ReportsPanel />;
    case "messages":
      return <MessagesPanel />;
    case "meetings":
      return <StudentMeetingsPanel />;
    case "catalog":
      return <CatalogPanel />;
    case "lab":
      return <CircuitLabPanel />;
    case "learning":
      return <LearningPanel />;
    case "offers":
      return <OffersPanel />;
    case "profile":
      return <ProfilePanel key={actorId} />;
    case "settings":
      return <StudentSettings />;
    case "notifications":
      return <NotificationsPanel />;
    case "workshop":
      return <NoticesPanel />;
    case "circuits":
      return (
        <View style={{ gap: 16 }}>
          <Panel>
            <AppText>
              {t(
                "Private, team-shared and published circuit versions.",
                "نسخ الدوائر الخاصة والمشارَكة مع الفريق والمنشورة.",
              )}
            </AppText>
            <AppText>
              {
                state.circuits.filter(
                  (x) =>
                    x.ownerId === actorId ||
                    (x.shared &&
                      state.projects.some(
                        (p) => p.id === x.projectId && p.studentIds.includes(actorId),
                      )),
                ).length
              }{" "}
              {t("saved circuits", "دوائر محفوظة")}
            </AppText>
          </Panel>
          <CircuitLabPanel />
        </View>
      );
    default:
      return <TeamPanels />;
  }
}
