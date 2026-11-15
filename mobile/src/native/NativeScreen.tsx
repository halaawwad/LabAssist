import { LabAssistBrand } from "@/components/LabAssistBrand";
import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { WorkspaceNavigation, navigationLabel } from "./WorkspaceNavigation";
import { menuItems } from "./navigationItems";
import { useLanguage } from "@/i18n";
import { useWorkspace, useRole } from "@/state/WorkspaceProvider";
import { FinalReviewScreen } from "@/features/supervisor/screens/FinalReviewScreen";
import { WebWorkshopScreen } from "@/features/workshop/WebWorkshopScreen";
import { WebSupervisorPanels } from "@/features/supervisor/screens/WebSupervisorPanels";
import { usePreferences } from "@/state/Preferences";
import { useState } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Menu } from "lucide-react-native";
import { AppText } from "@/components";
import { StudentDestination } from "./Destinations";
import { SupervisorScreen } from "@/features/supervisor/screens/SupervisorScreen";
import { DashboardScreen } from "@/features/supervisor/screens/DashboardScreen";
import { WorkshopScreen } from "@/features/workshop/WorkshopScreen";
import type { SupervisorPageId } from "@/features/supervisor/navigation";
import type { Role } from "@/domain/workspace";
import { router } from "./router";
import { NativeMessages } from "./MessagesScreen";
import StudentDashboard from "./StudentDashboard";
export function NativeScreen({ role, page }: { role: Role; page: string }) {
  const { error, retryLoading, saving } = useWorkspace();
  const roleReady = useRole(role);
  const [menu, setMenu] = useState(false);
  const [conversation, setConversation] = useState(false);
  const { preferences } = usePreferences();
  const { language, isRTL } = useLanguage();
  if (role === "student" && page === "dashboard") return <StudentDashboard />;
  const items = menuItems[role];
  const title = navigationLabel(items.find((x) => x[0] === page)?.[1] ?? page, language);
  const go = (target: string) => {
    setMenu(false);
    router.push(
      (role === "student" && target === "dashboard"
        ? "/native"
        : `/native/${role}/${target}`) as import("expo-router").Href,
    );
  };
  const background =
    page === "messages"
      ? require("../../assets/web/messages-desk-background.png")
      : page === "meetings"
        ? require("../../assets/web/meetings-light-room-background.png")
        : page === "profile"
          ? require("../../assets/web/profile-desk-background.png")
          : page === "team"
            ? require("../../assets/web/team-worktable-background.png")
            : page === "reports" || page === "finalReports"
              ? require("../../assets/web/reports-workspace-background.png")
              : page === "settings"
                ? require("../../assets/web/settings-controls-background.png")
                : page === "offers"
                  ? require("../../assets/web/inventory-workshop-background.png")
                  : page === "catalog"
                    ? require("../../assets/web/catalog-white-background.png")
                    : require("../../assets/web/project-white-background.png");
  if (!roleReady)
    return (
      <View>
        <AppText>Opening workspace...</AppText>
      </View>
    );
  return (
    <SafeAreaView style={[s.root, { direction: isRTL ? "rtl" : "ltr" }]} edges={["top", "bottom"]}>
      <ImageBackground source={preferences.background ? background : undefined} style={s.fill}>
        <View style={s.wash} />
        {page !== "messages" && (
          <View style={[s.header, isRTL && { flexDirection: "row-reverse" }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "ar" ? "رجوع" : "Back"}
              onPress={() => (router.canGoBack() ? router.back() : go("dashboard"))}
              style={s.icon}
            >
              <ArrowLeft
                color="#526443"
                size={22}
                style={isRTL ? { transform: [{ rotate: "180deg" }] } : undefined}
              />
            </Pressable>
            <View style={s.fill}>
              <LabAssistBrand size={12} />
              <AppText weight="bold">{title}</AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={language === "ar" ? "المزيد والحساب" : "More & account"}
              onPress={() => setMenu(true)}
              style={s.icon}
            >
              <Menu color="#526443" />
            </Pressable>
          </View>
        )}
        {!!error && (
          <View accessibilityRole="alert">
            <AppText tone="danger">{error}</AppText>
            <Pressable onPress={retryLoading}>
              <AppText>Retry loading / Allow storage first</AppText>
            </Pressable>
          </View>
        )}
        {saving && <AppText accessibilityLiveRegion="polite">Saving changes...</AppText>}
        {page === "messages" ? (
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
          ) : ["projects", "students", "progress", "tasks"].includes(page) ? (
            <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
              <WebSupervisorPanels
                key={page}
                page={page as "projects" | "students" | "progress" | "tasks"}
              />
            </ScrollView>
          ) : (
            <SupervisorScreen key={page} page={page as SupervisorPageId} />
          )
        ) : [
            "dashboard",
            "map",
            "handover",
            "notices",
            "observations",
            "notifications",
            "attendance",
          ].includes(page) ? (
          <WebWorkshopScreen key={page} page={page} />
        ) : (
          <WorkshopScreen key={page} page={page} />
        )}
        {!conversation && (
          <WorkspaceNavigation
            role={role}
            page={page}
            moreOpen={menu}
            onClose={() => setMenu(false)}
          />
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#ffffff", overflow: "hidden" },
  fill: { flex: 1, minWidth: 0 },
  wash: { position: "absolute", inset: 0, backgroundColor: "#f7f8f159" },
  header: {
    direction: "ltr",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    backgroundColor: "#ffffffed",
    borderBottomWidth: 1,
    borderColor: "#e4e9dd",
  },
  icon: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  content: {
    padding: 14,
    gap: 16,
    paddingBottom: 28,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fffffff0",
    borderTopWidth: 1,
    borderColor: "#e1e7d9",
    paddingVertical: 10,
  },
  tab: { flex: 1, alignItems: "center", gap: 4 },
  overlay: { flex: 1, backgroundColor: "#14201666" },
  drawer: {
    width: "85%",
    maxWidth: 330,
    height: "100%",
    backgroundColor: "#f8faf3",
    paddingHorizontal: 18,
  },
  menuRow: {
    paddingVertical: 15,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
