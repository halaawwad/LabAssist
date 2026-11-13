import { router } from "@/native/router";
import { ArrowLeft, Bell, ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  type TextInputProps,
} from "react-native";
import { Circle, Svg } from "react-native-svg";
import { useLanguage } from "@/i18n";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { colors } from "@/theme";
import { AppText } from "./AppText";
import { LanguageToggle } from "./LanguageToggle";
import { ScreenContainer } from "./ScreenContainer";

export function useCopy() {
  const { language } = useLanguage();
  return (en: string, ar: string) => (language === "ar" ? ar : en);
}
export function Portrait({ userId, size = 48 }: { userId: string; size?: number }) {
  const { state } = useWorkspace();
  const user = state.users.find((u) => u.id === userId);
  if (userId === "s1" && !user?.photo)
    return (
      <Image
        source={require("../../assets/web/student-avatar.jpg")}
        style={{ width: size, height: size, borderRadius: size * 0.37 }}
      />
    );
  return user?.photo ? (
    <Image
      source={{ uri: user.photo }}
      style={{ width: size, height: size, borderRadius: size * 0.37 }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.37,
        backgroundColor: colors.primaryPale,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AppText weight="bold">
        {user?.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")}
      </AppText>
    </View>
  );
}
export function Page({
  title,
  children,
  back = true,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
}) {
  const { error, clearError, storageError, retryLoading, saving, actorId, state } = useWorkspace();
  const role = state.users.find((user) => user.id === actorId)?.role ?? "student";
  const unread = state.alerts.filter((alert) => alert.userId === actorId && !alert.read).length;
  const t = useCopy();
  const errors: Record<string, string> = {
    not_allowed: t(
      "This action is not available for this account.",
      "هذه العملية غير متاحة لهذا الحساب.",
    ),
    locked: t("This item is locked.", "هذا العنصر مقفل."),
    required_fields: t("Complete the required fields.", "يرجى إكمال الحقول المطلوبة."),
    invalid_input: t("Check the entered values.", "تحقق من القيم المدخلة."),
    capacity: t("This table is already full.", "هذه الطاولة ممتلئة."),
    closed_day: t(
      "Attendance is only recorded on working days.",
      "يسجل الحضور في أيام الدوام فقط.",
    ),
  };
  return (
    <ScreenContainer scroll edges={["top"]}>
      <View style={kit.row}>
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("Back", "رجوع")}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            style={kit.iconButton}
          >
            <ArrowLeft color={colors.primary} />
          </Pressable>
        )}
        <View style={kit.grow}>
          <AppText variant="caption" tone="muted">
            LabAssist
          </AppText>
          <AppText variant="title">{title}</AppText>
        </View>
        <LanguageToggle compact />
      </View>
      <View style={[kit.row, { justifyContent: "space-between" }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("My profile", "ملفي الشخصي")}
          onPress={() => router.push(`/${role}/more/profile` as import("expo-router").Href)}
          style={kit.row}
        >
          <Portrait userId={actorId} size={38} />
          <View>
            <AppText weight="semibold">
              {state.users.find((user) => user.id === actorId)?.name}
            </AppText>
            <AppText variant="caption" tone="muted">
              {role === "student"
                ? t("Student workspace", "مساحة الطالب")
                : role === "supervisor"
                  ? t("Supervisor workspace", "مساحة المشرف")
                  : t("Workshop workspace", "مساحة الورشة")}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            `Notifications, ${unread} unread`,
            `الإشعارات، ${unread} غير مقروءة`,
          )}
          onPress={() => router.push(`/${role}/more/notifications` as import("expo-router").Href)}
          style={kit.iconButton}
        >
          <Bell size={21} color={colors.primary} />
          {unread > 0 && (
            <View
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                borderRadius: 10,
                backgroundColor: colors.primary,
                paddingHorizontal: 5,
              }}
            >
              <AppText variant="caption" tone="inverse">
                {unread}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>
      {error && (
        <Pressable onPress={clearError} style={kit.error}>
          <AppText tone="danger" accessibilityLiveRegion="assertive">
            {errors[error] ?? error}
          </AppText>
        </Pressable>
      )}
      {storageError && (
        <AppText tone="danger">
          {t(
            "Could not save on this device. Keep the app open and retry.",
            "تعذر الحفظ على الجهاز. اترك التطبيق مفتوحًا وأعد المحاولة.",
          )}
        </AppText>
      )}
      {saving && <AppText accessibilityLiveRegion="polite">Saving changes...</AppText>}
      {storageError && <Pressable onPress={retryLoading}><AppText>Retry loading saved records</AppText></Pressable>}
      {children}
    </ScreenContainer>
  );
}
export function Panel({
  children,
  tint,
  title,
}: {
  children: ReactNode;
  tint?: string;
  title?: string;
}) {
  return (
    <View style={[kit.panel, tint ? { backgroundColor: tint } : undefined]}>
      {title && <AppText variant="heading">{title}</AppText>}
      {children}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { language } = useLanguage();
  return (
    <View style={kit.field}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        style={[
          kit.input,
          { textAlign: language === "ar" ? "right" : "left" },
          props.multiline ? { minHeight: 110, textAlignVertical: "top" } : undefined,
          props.style,
        ]}
      />
    </View>
  );
}
export function Chips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={kit.filters}
    >
      {options.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === value }}
          onPress={() => onChange(o.id)}
          style={[kit.chip, o.id === value && kit.chipActive]}
        >
          <AppText variant="caption" tone={o.id === value ? "inverse" : "default"}>
            {o.label}
          </AppText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function MenuRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { isRTL } = useLanguage();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={kit.menuRow}>
      <View style={kit.grow}>
        <AppText weight="semibold">{title}</AppText>
        {subtitle && (
          <AppText variant="caption" tone="muted">
            {subtitle}
          </AppText>
        )}
      </View>
      <ChevronRight
        color={colors.primary}
        size={18}
        style={isRTL ? { transform: [{ rotate: "180deg" }] } : undefined}
      />
    </Pressable>
  );
}
export function Ring({ value, color = colors.primary }: { value: number; color?: string }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return (
    <View style={{ width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
      <Svg width={104} height={104} style={{ position: "absolute" }}>
        <Circle
          cx={52}
          cy={52}
          r={radius}
          stroke={colors.primaryPale}
          strokeWidth={8}
          fill="none"
        />
        <Circle
          cx={52}
          cy={52}
          r={radius}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - value / 100)}
          transform="rotate(-90 52 52)"
          strokeLinecap="round"
        />
      </Svg>
      <AppText variant="heading">{value}%</AppText>
    </View>
  );
}
export const kit = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  filters: { gap: 8, paddingVertical: 3, alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grow: { flex: 1, minWidth: 0, gap: 4 },
  panel: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  field: { gap: 8 },
  input: {
    backgroundColor: colors.inputBackground,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 48,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 30,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: colors.panelStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  menuRow: {
    minHeight: 56,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  error: { padding: 16, borderRadius: 18, backgroundColor: colors.dangerSoft },
  badge: { padding: 8, borderRadius: 12, backgroundColor: colors.primaryWash },
  muted: { color: colors.textMuted },
  stack: { gap: 14 },
});
