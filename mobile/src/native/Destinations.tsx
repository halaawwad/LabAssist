import { View } from "react-native";
import { CatalogPanel, CircuitLabPanel } from "@/features/student/HardwarePanels";
import { LearningPanel, OffersPanel } from "@/features/student/DiscoveryPanels";
import { MessagesPanel, MeetingsPanel } from "@/features/shared/CommunicationPanels";
import {
  ProfilePanel,
  SettingsPanel,
  TeamPanels,
  NotificationsPanel,
  NoticesPanel,
} from "@/features/shared/AccountPanels";
import { ReportsPanel } from "@/features/shared/ReportsPanel";
import { Panel } from "@/components/MobileKit";
import { AppText } from "@/components";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { ReferenceProject } from "./ProjectDetails";
import { TasksPanel, IssuesPanel, FinancePanel } from '@/features/shared/ProjectPanels';
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
  switch (page) {
    case 'tasks':return <TasksPanel/>;
    case 'issues':return <IssuesPanel/>;
    case 'budget':return <FinancePanel/>;
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
      return <MeetingsPanel />;
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
      return <SettingsPanel />;
    case "notifications":
      return <NotificationsPanel />;
    case "workshop":
      return <NoticesPanel />;
    case "circuits":
      return (
        <View style={{ gap: 16 }}>
          <Panel title="My Circuits">
            <AppText>Private, team-shared and published circuit versions.</AppText>
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
              saved circuits
            </AppText>
          </Panel>
          <CircuitLabPanel />
        </View>
      );
    default:
      return <TeamPanels />;
  }
}
