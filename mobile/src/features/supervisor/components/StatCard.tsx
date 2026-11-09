import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Folder,
  TrendingUp,
  TriangleAlert,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, gradients, radius, shadows, spacing } from "@/theme";
import type { DashboardStat } from "@/types/supervisor";

const statIcons = {
  myProjects: Folder,
  delayed: CalendarDays,
  reports: ClipboardList,
  issues: TriangleAlert,
};

// Icon tints from the web .tone-* .stat-icon rules.
const tones = {
  green: { icon: colors.primary, background: colors.primaryPale, trend: colors.primaryMid },
  orange: { icon: colors.warning, background: colors.warningSoft, trend: colors.danger },
  blue: { icon: colors.primaryMid, background: colors.primaryPale, trend: colors.primaryMid },
  red: { icon: colors.dangerText, background: colors.dangerSoft, trend: colors.danger },
};

type StatCardProps = {
  stat: DashboardStat;
  onPress: () => void;
};

export function StatCard({ stat, onPress }: StatCardProps) {
  const { t, isRTL } = useLanguage();
  const Icon = statIcons[stat.id];
  const tone = tones[stat.tone];
  const highlighted = Boolean(stat.highlighted);
  const label = t(`supervisor.dashboard.stats.${stat.id}.label`);
  const foreground = highlighted ? colors.onPrimary : undefined;
  const flip = isRTL ? styles.flipped : undefined;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${t("supervisor.dashboard.openStat", { label })}: ${stat.value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlighted && styles.highlighted,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.icon,
            { backgroundColor: highlighted ? "rgba(255, 255, 255, 0.2)" : tone.background },
          ]}
        >
          <Icon size={20} color={foreground ?? tone.icon} />
        </View>
        <View style={[styles.arrow, highlighted && styles.arrowHighlighted]}>
          <ArrowRight size={16} color={foreground ?? colors.text} style={flip} />
        </View>
      </View>

      <View style={styles.body}>
        <AppText variant="title" tone={highlighted ? "inverse" : "default"}>
          {stat.value}
        </AppText>
        <AppText variant="label" tone={highlighted ? "inverse" : "default"} numberOfLines={2}>
          {label}
        </AppText>
        <View style={styles.trend}>
          <TrendingUp size={14} color={foreground ?? tone.trend} style={flip} />
          <AppText
            variant="caption"
            numberOfLines={1}
            style={[styles.trendText, { color: foreground ?? tone.trend }]}
          >
            {t(`supervisor.dashboard.stats.${stat.id}.trend`)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "45%",
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radius.lg,
    ...shadows.panel,
  },
  highlighted: {
    backgroundColor: colors.primary,
    backgroundImage: gradients.highlight,
    borderColor: "transparent",
  },
  pressed: {
    opacity: 0.85,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
  arrow: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: radius.pill,
  },
  arrowHighlighted: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  body: {
    gap: spacing.xxs,
  },
  trend: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trendText: {
    flexShrink: 1,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
