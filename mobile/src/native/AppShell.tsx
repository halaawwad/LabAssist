import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { LabAssistBrand } from "@/components/LabAssistBrand";
import { SignOutButton } from "@/components/SignOutButton";
import { AppText, LanguageToggle } from "@/components";
import { directionStyle, useLanguage } from "@/i18n";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors } from "@/theme";
import type { ReactNode } from "react";
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell, ChevronRight, Languages } from "lucide-react-native";
import { router } from "./router";
import {
  moreSections,
  pageHref,
  roleTabs,
  sectionTitles,
  type NavItem,
  type NavRole,
} from "./navigationItems";

const flip = { transform: [{ scaleX: -1 }] };

/**
 * Shared screen header. Tab roots pass no `onBack`; sub-pages get a Back arrow.
 * The title stays centred between two equal side slots.
 */
export function AppHeader({
  title,
  brand = false,
  onBack,
  trailing,
}: {
  title: string;
  /** Show the LabAssist mark instead of a text title (role home screens). */
  brand?: boolean;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  const { language, isRTL } = useLanguage();
  return (
    <View style={s.header}>
      <View style={s.side}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === "ar" ? "رجوع" : "Back"}
            onPress={onBack}
            style={s.iconButton}
          >
            <ArrowLeft size={22} color={colors.primary} style={isRTL ? flip : undefined} />
          </Pressable>
        )}
      </View>
      <View style={s.titleBox}>
        {brand ? (
          <View accessibilityRole="header" accessibilityLabel={title}>
            <LabAssistBrand size={17} />
          </View>
        ) : (
          <AppText
            accessibilityRole="header"
            weight="semibold"
            align="center"
            numberOfLines={2}
            style={[s.title, { lineHeight: language === "ar" ? 27 : 23 }]}
          >
            {title}
          </AppText>
        )}
      </View>
      <View style={[s.side, s.sideEnd]}>{trailing}</View>
    </View>
  );
}

export function NotificationsButton({ role, onPress }: { role: NavRole; onPress?: () => void }) {
  const { state, actorId } = useWorkspace();
  const { language } = useLanguage();
  const unread =
    role === "department"
      ? 0
      : state.alerts.filter((alert) => alert.userId === actorId && !alert.read).length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        role === "department"
          ? language === "ar"
            ? "الإشعارات"
            : "Notifications"
          : language === "ar"
            ? `الإشعارات، ${unread} غير مقروءة`
            : `Notifications, ${unread} unread`
      }
      onPress={() => {
        if (onPress) onPress();
        else if (role !== "department")
          router.push(pageHref(role, "notifications") as import("expo-router").Href);
      }}
      style={s.iconButton}
    >
      <Bell size={21} color={colors.primary} />
      {unread > 0 && (
        <View style={s.badge}>
          <AppText language="en" style={s.badgeText}>
            {unread > 99 ? "99+" : unread}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Bottom tabs, shared by every role. Pads itself for the home indicator. */
export function TabBar({
  items,
  active,
  onSelect,
}: {
  items: NavItem[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const { language } = useLanguage();
  const { bottom } = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[s.tabs, { paddingBottom: 4 + bottom }]}>
      {items.map((item) => {
        const selected = item.id === active;
        const label = item.tab ? item.tab[language === "ar" ? 1 : 0] : item[language];
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={label}
            // `aria-selected` reaches both platforms; RNW ignores accessibilityState.selected.
            aria-selected={selected}
            onPress={() => onSelect(item.id)}
            style={[s.tab, selected && s.tabSelected]}
          >
            <item.icon size={21} color={colors.primary} strokeWidth={selected ? 2.3 : 1.8} />
            <AppText
              align="center"
              numberOfLines={2}
              weight={selected ? "semibold" : "regular"}
              style={s.tabLabel}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tab bar for routed roles. Switching tabs replaces the stack: tab roots have no Back. */
export function RoleTabBar({ role, page }: { role: Exclude<NavRole, "department">; page: string }) {
  const tabs = roleTabs[role];
  const active = tabs.some((tab) => tab.id === page) ? page : "more";
  return (
    <TabBar
      items={tabs}
      active={active}
      onSelect={(id) => {
        if (id === page) return;
        if (router.canDismiss()) router.dismissAll();
        router.replace(pageHref(role, id) as import("expo-router").Href);
      }}
    />
  );
}

/** Sub-page Back: the previous screen, or More when the page was opened directly. */
export function backFromSubPage(role: Exclude<NavRole, "department">) {
  if (router.canGoBack()) router.back();
  else router.replace(pageHref(role, "more") as import("expo-router").Href);
}

/**
 * Screen frame: header, one body region and the tab bar. The body fills the space
 * between them; the screen inside it owns the only vertical scroll.
 */
export function ShellFrame({
  header,
  tabBar,
  background,
  backgroundColor,
  children,
}: {
  header?: ReactNode;
  /** Omit to hide the tabs (for example inside a conversation). */
  tabBar?: ReactNode;
  background?: ImageSourcePropType;
  backgroundColor?: string;
  children: ReactNode;
}) {
  const { dir } = useLanguage();
  const { bottom } = useSafeAreaInsets();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[s.root, directionStyle(dir)]}>
      <ImageBackground
        source={background}
        resizeMode="cover"
        style={[s.fill, backgroundColor ? { backgroundColor } : undefined]}
        // Without an explicit size, react-native-web gives the image the asset's own
        // pixel size, which overflows the screen and lets the browser shift the shell.
        imageStyle={s.backdrop}
      >
        <View pointerEvents="none" style={s.wash} />
        {header}
        <View style={s.body}>{children}</View>
        {tabBar ?? <View style={{ height: bottom }} />}
      </ImageBackground>
    </SafeAreaView>
  );
}

function MoreRow({
  icon: Icon,
  label,
  onPress,
  trailing,
  first,
}: {
  icon: NavItem["icon"];
  label: string;
  onPress?: () => void;
  trailing?: ReactNode;
  first: boolean;
}) {
  const { isRTL } = useLanguage();
  const content = (
    <>
      <View style={s.rowIcon}>
        <Icon size={18} color={colors.primary} />
      </View>
      <AppText style={s.rowLabel}>{label}</AppText>
      {trailing ??
        (onPress && (
          <ChevronRight size={18} color={colors.textFaint} style={isRTL ? flip : undefined} />
        ))}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.row, !first && s.rowDivider, pressed && s.rowPressed]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={[s.row, !first && s.rowDivider]}>{content}</View>
  );
}

/** More: grouped settings-style rows, then a full-width Log out row. */
export function MoreMenu({ role, onOpen }: { role: NavRole; onOpen: (id: string) => void }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  return (
    <ScrollView contentContainerStyle={s.more} showsVerticalScrollIndicator={false}>
      {moreSections[role].map((section) => (
        <View key={section.id} style={s.section}>
          <AppText variant="caption" weight="semibold" tone="muted" style={s.sectionTitle}>
            {sectionTitles[section.id][ar ? 1 : 0]}
          </AppText>
          <View style={s.group}>
            {section.items.map((item, index) => (
              <MoreRow
                key={item.id}
                icon={item.icon}
                label={item[language]}
                first={index === 0}
                onPress={() => onOpen(item.id)}
              />
            ))}
            {section.id === "account" && (
              <MoreRow
                icon={Languages}
                label={ar ? "اللغة" : "Language"}
                first={section.items.length === 0}
                trailing={<LanguageToggle compact />}
              />
            )}
          </View>
        </View>
      ))}
      <SignOutButton row />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1, minWidth: 0, minHeight: 0 },
  backdrop: { width: "100%", height: "100%" },
  wash: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#f7f8f159",
  },
  body: { flex: 1, minHeight: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#ffffffed",
    borderBottomWidth: 1,
    borderColor: "#e4e9dd",
  },
  side: { width: 52, flexDirection: "row", alignItems: "center" },
  sideEnd: { justifyContent: "flex-end" },
  titleBox: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, color: colors.text },
  iconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  badgeText: { fontSize: 10, lineHeight: 15, color: colors.onPrimary },
  tabs: {
    flexDirection: "row",
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingTop: 4,
    backgroundColor: "#fffffff5",
    borderTopWidth: 1,
    borderColor: "#e1e7d9",
  },
  // Each tab takes its label width plus an equal share of the rest, so a long label
  // ("Attendance") stays whole at 320px without going below the 12px minimum.
  tab: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "auto",
    minWidth: 48,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 2,
    borderRadius: 12,
  },
  tabSelected: { backgroundColor: "#edf2e5" },
  tabLabel: { fontSize: 12, lineHeight: 17, color: "#35452b" },
  more: {
    padding: 16,
    paddingBottom: 28,
    gap: 20,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
  },
  section: { gap: 8 },
  sectionTitle: { paddingHorizontal: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  group: {
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 8 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  rowPressed: { opacity: 0.6 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
  },
  rowLabel: { flex: 1, minWidth: 0 },
});
