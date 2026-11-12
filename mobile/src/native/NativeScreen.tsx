import { useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Home,
  Menu,
  MessageSquare,
  X,
} from "lucide-react-native";
import { AppText } from "@/components";
import { StudentDestination } from "./Destinations";
import { SupervisorScreen } from "@/features/supervisor/screens/SupervisorScreen";
import { DashboardScreen } from "@/features/supervisor/screens/DashboardScreen";
import { WorkshopScreen } from "@/features/workshop/WorkshopScreen";
import type { SupervisorPageId } from "@/features/supervisor/navigation";
import type { Role } from "@/domain/workspace";
import { router } from "./router";
import { NativeMessages } from "./MessagesScreen";
const menuItems = {
  student: [
    ["project", "My Project"],
    ["team", "Team"],
    ["lab", "3D Lab"],
    ["catalog", "Component Catalog"],
    ["circuits", "My Circuits"],
    ["offers", "Inventory"],
    ["learning", "Learning Hub"],
    ["messages", "Messages"],
    ["meetings", "Meetings"],
    ["reports", "Reports"],
    ["profile", "My Profile"],
    ["settings", "Settings"],
  ],
  supervisor: [
    ["dashboard", "Dashboard"],
    ["projects", "My Projects"],
    ["students", "Students"],
    ["progress", "Progress"],
    ["tasks", "Tasks"],
    ["issues", "Issues"],
    ["reports", "Weekly Reports"],
    ["finalReports", "Final Reports"],
    ["meetings", "Meetings"],
    ["messages", "Messages"],
    ["notifications", "Notifications"],
    ["profile", "My Profile"],
    ["settings", "Settings"],
  ],
  workshop: [
    ["dashboard", "Dashboard"],
    ["attendance", "Attendance"],
    ["map", "Workshop Map"],
    ["handover", "Team Handovers"],
    ["notices", "Notices"],
    ["observations", "Supervisor Notes"],
    ["messages", "Messages"],
    ["notifications", "Notifications"],
    ["profile", "My Profile"],
    ["settings", "Settings"],
  ],
};
export function NativeScreen({ role, page }: { role: Role; page: string }) {
  const [menu, setMenu] = useState(false);
  if (page === "messages") return <NativeMessages />;
  const items = menuItems[role];
  const title = items.find((x) => x[0] === page)?.[1] ?? page;
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
                : page === "catalog"
                  ? require("../../assets/web/catalog-white-background.png")
                  : require("../../assets/web/project-white-background.png");
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <ImageBackground source={background} style={s.fill}>
        <View style={s.wash} />
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : go("dashboard"))}
            style={s.icon}
          >
            <ArrowLeft color="#526443" size={22} />
          </Pressable>
          <View style={s.fill}>
            <AppText variant="caption" tone="muted">
              LabAssist
            </AppText>
            <AppText weight="bold">{title}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={() => setMenu(true)}
            style={s.icon}
          >
            <Menu color="#526443" />
          </Pressable>
        </View>
        {role === "student" ? (
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
          ) : (
            <SupervisorScreen key={page} page={page as SupervisorPageId} />
          )
        ) : (
          <WorkshopScreen key={page} page={page} />
        )}
        <View style={s.tabs}>
          {[
            { id: "dashboard", label: "Home", icon: Home },
            {
              id:
                role === "student" ? "project" : role === "supervisor" ? "projects" : "attendance",
              label: role === "workshop" ? "Attendance" : "Projects",
              icon: FileText,
            },
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "more", label: "More", icon: Menu },
          ].map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.id}
              accessibilityLabel={item.label}
              onPress={() => (item.id === "more" ? setMenu(true) : go(item.id))}
              style={s.tab}
            >
              <item.icon color="#526443" size={20} />
              <AppText style={{ fontSize: 10, color: "#687b56" }}>{item.label}</AppText>
            </Pressable>
          ))}
        </View>
      </ImageBackground>
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <View style={s.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu overlay"
            style={StyleSheet.absoluteFill}
            onPress={() => setMenu(false)}
          />
          <SafeAreaView style={s.drawer}>
            <View style={s.header}>
              <AppText variant="heading" style={s.fill}>
                LabAssist
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={() => setMenu(false)}
              >
                <X color="#526443" />
              </Pressable>
            </View>
            <ScrollView>
              {items.map(([id, label]) => (
                <Pressable
                  accessibilityRole="button"
                  key={id}
                  onPress={() => go(id)}
                  style={s.menuRow}
                >
                  <AppText>{label}</AppText>
                  <ChevronRight size={16} color="#839276" />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eee8dc", overflow: "hidden" },
  fill: { flex: 1, minWidth: 0 },
  wash: { position: "absolute", inset: 0, backgroundColor: "#f7f8f159" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    backgroundColor: "#ffffffed",
    borderBottomWidth: 1,
    borderColor: "#e4e9dd",
  },
  icon: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  content: {
    padding: 18,
    gap: 18,
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
