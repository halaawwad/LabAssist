import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { MobileModal as Modal } from "@/components/MobileModal";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight, FileText, Home, Menu, MessageSquare, X } from "lucide-react-native";
import { AppText } from "@/components";
import { SignOutButton } from "@/components/SignOutButton";
import { LabAssistBrand } from "@/components/LabAssistBrand";
import { useLanguage } from "@/i18n";
import type { Role } from "@/domain/workspace";
import { router } from "./router";
import { menuItems } from "./navigationItems";

const arabic: Record<string, string> = {
  Home: "الرئيسية",
  Projects: "المشاريع",
  Attendance: "الحضور",
  Messages: "الرسائل",
  More: "المزيد",
  Dashboard: "الرئيسية",
  "My Project": "مشروعي",
  Team: "الفريق",
  "3D Lab": "المختبر ثلاثي الأبعاد",
  "Component Catalog": "دليل المكونات",
  "My Circuits": "دوائري",
  "Workshop Inventory": "مخزون الورشة",
  "Learning Hub": "مركز التعلم",
  Meetings: "الاجتماعات",
  Reports: "التقارير",
  "My Profile": "ملفي الشخصي",
  Settings: "الإعدادات",
  "My Projects": "مشاريعي",
  Students: "الطلاب",
  Progress: "التقدم",
  Tasks: "المهام",
  Issues: "المشكلات",
  "Weekly Reports": "التقارير الأسبوعية",
  "Final Reports": "التقارير النهائية",
  Notifications: "الإشعارات",
  "Workshop Map": "خريطة الورشة",
  "Team Handovers": "تسليمات الفرق",
  Notices: "الإعلانات",
  "Supervisor Notes": "ملاحظات المشرفين",
};
export function navigationLabel(label: string, language: string) {
  return language === "ar" ? (arabic[label] ?? label) : label;
}
export function WorkspaceNavigation({
  role,
  page,
  moreOpen = false,
  onClose,
}: {
  role: Role;
  page: string;
  moreOpen?: boolean;
  onClose?: () => void;
}) {
  const { language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const label = (text: string) => navigationLabel(text, language);
  const close = () => {
    setOpen(false);
    onClose?.();
  };
  const go = (target: string) => {
    close();
    if (target === page) return;
    router.navigate(
      (role === "student" && target === "dashboard"
        ? "/native"
        : `/native/${role}/${target}`) as import("expo-router").Href,
    );
  };
  const tabs = [
    { id: "dashboard", label: "Home", icon: Home },
    {
      id: role === "student" ? "project" : role === "supervisor" ? "projects" : "attendance",
      label: role === "workshop" ? "Attendance" : "Projects",
      icon: FileText,
    },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "more", label: "More", icon: Menu },
  ];
  return (
    <>
      <View accessibilityRole="tablist" style={[s.tabs, isRTL && s.reverse]}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={label(item.label)}
            accessibilityState={{ selected: item.id === page }}
            onPress={() => (item.id === "more" ? setOpen(true) : go(item.id))}
            style={[s.tab, item.id === page && s.selected]}
          >
            <item.icon size={21} color="#526443" />
            <AppText align="center" style={{ fontSize: 12, color: "#35452b" }}>
              {label(item.label)}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Modal visible={open || moreOpen} transparent animationType="slide" onRequestClose={close}>
        <View style={s.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === "ar" ? "إغلاق المزيد" : "Close More"}
            onPress={close}
            style={{ flex: 1 }}
          />
          <SafeAreaView edges={["bottom"]} style={s.sheet}>
            <View style={[s.header, isRTL && s.reverse]}>
              <LabAssistBrand />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={language === "ar" ? "إغلاق القائمة" : "Close menu"}
                onPress={close}
                style={s.close}
              >
                <X color="#526443" />
              </Pressable>
            </View>
            <AppText variant="heading">
              {language === "ar" ? "المزيد والحساب" : "More & account"}
            </AppText>
            <ScrollView
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {menuItems[role].map(([id, text]) => (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: page === id }}
                  onPress={() => go(id)}
                  style={[s.row, isRTL && s.reverse]}
                >
                  <AppText style={{ flex: 1 }}>{label(text)}</AppText>
                  <ChevronRight
                    color="#526443"
                    size={18}
                    style={isRTL ? { transform: [{ rotate: "180deg" }] } : undefined}
                  />
                </Pressable>
              ))}
              <SignOutButton />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  tabs: {
    direction: "ltr",
    flexDirection: "row",
    flexShrink: 0,
    backgroundColor: "#fffffff5",
    borderTopWidth: 1,
    borderColor: "#e1e7d9",
    padding: 4,
  },
  reverse: { direction: "ltr", flexDirection: "row-reverse" },
  tab: {
    flex: 1,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 12,
  },
  selected: { backgroundColor: "#edf2e5" },
  overlay: { flex: 1, backgroundColor: "#14201666" },
  sheet: {
    maxHeight: "85%",
    backgroundColor: "#f8faf3",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50, paddingVertical: 12 },
});
