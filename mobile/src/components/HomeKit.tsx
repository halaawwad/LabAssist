import { ArrowRight, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, radius, shadows } from "@/theme";

import { AppText } from "./AppText";
import { TouchTarget as Pressable } from "./TouchTarget";

/** Shared Home pattern: greeting → StatGrid → card/list sections. */
export function Greeting({ name, subtitle }: { name: string; subtitle?: string }) {
  const { language, isolate } = useLanguage();
  const hour = new Date().getHours();
  const ar = language === "ar";
  const greeting =
    hour < 12
      ? ar
        ? "صباح الخير،"
        : "Good morning,"
      : hour < 18
        ? ar
          ? "مساء الخير،"
          : "Good afternoon,"
        : ar
          ? "مساء الخير،"
          : "Good evening,";
  return (
    <View style={styles.greeting}>
      <AppText tone="muted">{greeting}</AppText>
      <AppText variant="heading" accessibilityRole="header" style={styles.name}>
        {isolate(name)}
      </AppText>
      {!!subtitle && (
        <AppText variant="caption" tone="muted">
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

export type StatTone = "olive" | "orange" | "blue" | "red" | "violet";
const tones: Record<StatTone, { icon: string; wash: string; value: string; note: string }> = {
  olive: {
    icon: colors.primary,
    wash: colors.primaryPale,
    value: colors.primary,
    note: colors.primaryMid,
  },
  orange: {
    icon: colors.warning,
    wash: colors.warningSoft,
    value: "#b4612a",
    note: colors.warningText,
  },
  blue: { icon: "#527c9d", wash: "#e2edf6", value: "#3f6584", note: "#4f6f8a" },
  red: {
    icon: colors.dangerText,
    wash: colors.dangerSoft,
    value: colors.dangerText,
    note: colors.dangerText,
  },
  violet: { icon: "#81699e", wash: "#eee7f6", value: "#6d5689", note: "#6d5689" },
};

export type StatItem = {
  id: string;
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Opens the related screen; the card then shows an arrow. */
  onPress?: () => void;
};

export function StatCard({ item }: { item: StatItem }) {
  const { isRTL } = useLanguage();
  const tone = tones[item.tone ?? "olive"];
  const body = (
    <>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: tone.wash }]}>
          <item.icon size={20} color={tone.icon} />
        </View>
        {item.onPress && (
          <ArrowRight
            size={16}
            color={colors.textMuted}
            style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
          />
        )}
      </View>
      <AppText weight="bold" style={[styles.value, { color: tone.value }]}>
        {item.value}
      </AppText>
      <AppText weight="semibold" numberOfLines={2} style={styles.label}>
        {item.label}
      </AppText>
      {!!item.note && (
        <AppText variant="caption" style={{ color: tone.note }}>
          {item.note}
        </AppText>
      )}
    </>
  );
  const label = `${item.label}: ${item.value}${item.note ? `, ${item.note}` : ""}`;
  return item.onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={item.onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={label} style={styles.card}>
      {body}
    </View>
  );
}

/** Two-column grid of stat cards (one column when text is scaled very large). */
export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <StatCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 2 },
  name: { fontSize: 22, lineHeight: 30 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 130,
    gap: 6,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.stroke,
    ...shadows.panel,
  },
  pressed: { backgroundColor: colors.primaryWash },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 26, lineHeight: 32 },
  label: { fontSize: 14 },
});
