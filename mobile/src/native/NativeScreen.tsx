import { SupervisedProjects } from "./SupervisedProjects";
import { demoMode } from "@/features/auth/client";
import { useLanguage } from "@/i18n";
import { useWorkspace, useRole } from "@/state/WorkspaceProvider";
import { FinalReviewScreen } from "@/features/supervisor/screens/FinalReviewScreen";
import { WebWorkshopScreen } from "@/features/workshop/WebWorkshopScreen";
import { WebSupervisorPanels } from "@/features/supervisor/screens/WebSupervisorPanels";
import { usePreferences } from "@/state/Preferences";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText, Button } from "@/components";
import { errorText, useCopy } from "@/components/MobileKit";
import { colors } from "@/theme";
import { StudentDestination } from "./Destinations";
import { SupervisorScreen } from "@/features/supervisor/screens/SupervisorScreen";
import { DashboardScreen } from "@/features/supervisor/screens/DashboardScreen";
import { AttendancePanel, WorkshopScreen } from "@/features/workshop/WorkshopScreen";
import type { SupervisorPageId } from "@/features/supervisor/navigation";
import type { Role } from "@/domain/workspace";
import { router } from "./router";
import { NativeMessages } from "./MessagesScreen";
import StudentDashboard from "./StudentDashboard";
import {
  AppHeader,
  MoreMenu,
  NotificationsButton,
  RoleTabBar,
  ShellFrame,
  backFromSubPage,
} from "./AppShell";
import { findNavItem, isTabPage, pageHref } from "./navigationItems";

const backgrounds: Record<string, number> = {
  messages: require("../../assets/web/messages-desk-background.png"),
  meetings: require("../../assets/web/meetings-light-room-background.png"),
  profile: require("../../assets/web/profile-desk-background.png"),
  team: require("../../assets/web/team-worktable-background.png"),
  reports: require("../../assets/web/reports-workspace-background.png"),
  finalReports: require("../../assets/web/reports-workspace-background.png"),
  settings: require("../../assets/web/settings-controls-background.png"),
  offers: require("../../assets/web/inventory-workshop-background.png"),
  catalog: require("../../assets/web/catalog-white-background.png"),
};
const defaultBackground = require("../../assets/web/project-white-background.png");

export function NativeScreen({ role, page }: { role: Role; page: string }) {
  const { error, retryLoading, saving, clearError } = useWorkspace();
  const copy = useCopy();
  const roleReady = useRole(role);
  const [conversation, setConversation] = useState(false);
  const { preferences } = usePreferences();
  const { language } = useLanguage();
  if (role === "student" && page === "dashboard") return <StudentDashboard />;
  if (!roleReady)
    return (
      <View>
        <AppText>{copy("Opening workspace...", "جارٍ فتح مساحة العمل...")}</AppText>
      </View>
    );
  const item = findNavItem(role, page);
  const title = item ? item[language] : page;
  const tab = isTabPage(role, page);
  // Tab roots: centred logo and the notification bell. Sub-pages: Back and a centred title.
  // An open conversation draws its own header (with Back to the inbox).
  const header =
    page === "messages" && conversation ? null : tab ? (
      <AppHeader brand title={title} trailing={<NotificationsButton role={role} />} />
    ) : (
      <AppHeader title={title} onBack={() => backFromSubPage(role)} />
    );
  return (
    <ShellFrame
      background={preferences.background ? (backgrounds[page] ?? defaultBackground) : undefined}
      header={header}
      tabBar={conversation ? undefined : <RoleTabBar role={role} page={page} />}
    >
      {!!error && (
        // Actionable text for rule refusals (locked, closed day…); records are unchanged.
        <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={s.banner}>
          <AppText tone="danger" style={s.bannerText}>
            {errorText(copy, error)}
          </AppText>
          <View style={s.bannerActions}>
            <Button
              title={copy("Retry loading", "إعادة التحميل")}
              variant="tertiary"
              size="sm"
              onPress={retryLoading}
            />
            <Button
              title={copy("Dismiss", "إخفاء")}
              variant="tertiary"
              size="sm"
              onPress={clearError}
            />
          </View>
        </View>
      )}
      {saving && (
        <AppText accessibilityLiveRegion="polite" style={s.notice}>
          {copy("Saving changes...", "جارٍ حفظ التغييرات...")}
        </AppText>
      )}
      {page === "more" ? (
        <MoreMenu
          role={role}
          onOpen={(id) => router.push(pageHref(role, id) as import("expo-router").Href)}
        />
      ) : page === "messages" ? (
        <NativeMessages embedded onConversationChange={setConversation} />
      ) : role === "student" ? (
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StudentDestination key={page} page={page} />
        </ScrollView>
      ) : role === "supervisor" ? (
        page === "dashboard" ? (
          <DashboardScreen />
        ) : page === "finalReports" ? (
          <FinalReviewScreen />
        ) : page === "projects" && !demoMode ? (
          <ScrollView contentContainerStyle={s.content}>
            <SupervisedProjects />
          </ScrollView>
        ) : ["projects", "students", "progress", "tasks"].includes(page) ? (
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
            <WebSupervisorPanels
              key={page}
              page={page as "projects" | "students" | "progress" | "tasks"}
            />
          </ScrollView>
        ) : (
          <SupervisorScreen key={page} page={page as SupervisorPageId} />
        )
      ) : page === "attendance" ? (
        // Owns its scroll so the present/absent summary stays fixed above the list.
        <AttendancePanel />
      ) : ["dashboard", "map", "handover", "notices", "observations", "notifications"].includes(
          page,
        ) ? (
        <WebWorkshopScreen key={page} page={page} />
      ) : (
        <WorkshopScreen key={page} page={page} />
      )}
    </ShellFrame>
  );
}
const s = StyleSheet.create({
  notice: { paddingHorizontal: 16, paddingTop: 8 },
  banner: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderRadius: 14,
    backgroundColor: colors.dangerSoft,
  },
  bannerText: { fontSize: 14 },
  bannerActions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  content: {
    padding: 14,
    gap: 16,
    paddingBottom: 28,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
});
