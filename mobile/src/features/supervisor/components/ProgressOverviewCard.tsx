import { ChartPie, TrendingUp } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { AppText, Card, EmptyState, ProgressBar } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";
import type { ProgressOverview } from "@/types/supervisor";

import { ProgressRing } from "./ProgressRing";

type ProgressOverviewCardProps = {
  progress: ProgressOverview;
  onViewAll: () => void;
};

export function ProgressOverviewCard({ progress, onViewAll }: ProgressOverviewCardProps) {
  const { t, isRTL } = useLanguage();

  return (
    <Card
      title={t("supervisor.dashboard.progressTitle")}
      icon={<ChartPie size={18} color={colors.primary} />}
      action={{ label: t("common.viewAll"), onPress: onViewAll }}
    >
      {progress.stages.length === 0 ? (
        <EmptyState
          icon={<ChartPie size={22} color={colors.primary} />}
          title={t("supervisor.dashboard.noProgress.title")}
          message={t("supervisor.dashboard.noProgress.message")}
        />
      ) : (
        <>
          <View style={styles.summary}>
            <ProgressRing value={progress.overall} />
            <View style={styles.summaryText}>
              <AppText variant="label" tone="muted">
                {t("supervisor.dashboard.overallProgress")}
              </AppText>
              <AppText language="en" variant="title">{`${progress.overall}%`}</AppText>
              {progress.trend !== 0 ? (
                <View style={styles.trend}>
                  <TrendingUp
                    size={14}
                    color={colors.primary}
                    style={isRTL ? styles.flipped : undefined}
                  />
                  <AppText language="en" variant="caption" weight="semibold" tone="primary">
                    {`${progress.trend > 0 ? "+" : ""}${progress.trend}%`}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.stages}>
            {progress.stages.map((stage) => (
              <View key={stage.id} style={styles.stage}>
                <View style={styles.stageLabel}>
                  <AppText variant="caption" tone="strong" style={styles.stageName}>
                    {t(`supervisor.dashboard.progressItems.${stage.id}`)}
                  </AppText>
                  <AppText language="en" variant="caption" weight="semibold">
                    {`${stage.value}%`}
                  </AppText>
                </View>
                <ProgressBar value={stage.value} />
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  summaryText: {
    flex: 1,
    gap: spacing.xxs,
  },
  trend: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.primaryPale,
    borderRadius: radius.pill,
  },
  stages: {
    gap: spacing.md,
  },
  stage: {
    gap: spacing.xs,
  },
  stageLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stageName: {
    flex: 1,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
