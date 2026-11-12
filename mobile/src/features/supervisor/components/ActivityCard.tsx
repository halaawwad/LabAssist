import { Box, CheckSquare, FileText, Users } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Avatar, Card, EmptyState } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";
import type { Activity, ActivityStatus } from "@/types/supervisor";

const statusIcons = {
  report: FileText,
  task: CheckSquare,
  model: Box,
};

type ActivityCardProps = {
  activities: Activity[];
  onViewAll: () => void;
  onOpenActivity: (status: ActivityStatus) => void;
};

export function ActivityCard({ activities, onViewAll, onOpenActivity }: ActivityCardProps) {
  const { t, formatRelative } = useLanguage();

  return (
    <Card
      title={t("supervisor.dashboard.activityTitle")}
      icon={<Users size={18} color={colors.primary} />}
      action={
        activities.length > 0 ? { label: t("common.viewAll"), onPress: onViewAll } : undefined
      }
    >
      {activities.length === 0 ? (
        <EmptyState
          icon={<Users size={22} color={colors.primary} />}
          title={t("supervisor.dashboard.noActivity.title")}
          message={t("supervisor.dashboard.noActivity.message")}
        />
      ) : (
        <View>
          {activities.map((activity, index) => {
            const Icon = statusIcons[activity.status];
            const action = t(`supervisor.dashboard.activity.${activity.status}`);
            const when = formatRelative(activity.occurredAt);
            return (
              <Pressable
                key={activity.id}
                accessibilityRole="button"
                accessibilityLabel={`${activity.student} ${action}, ${activity.project}, ${when}`}
                onPress={() => onOpenActivity(activity.status)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.divided,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar initials={activity.initials} tone={activity.tone} />
                <View style={styles.copy}>
                  <AppText variant="caption">
                    <AppText variant="caption" weight="semibold">
                      {activity.student}
                    </AppText>{" "}
                    {action}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {`${activity.project} · ${when}`}
                  </AppText>
                </View>
                <View style={styles.status}>
                  <Icon size={18} color={colors.primary} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pressed: {
    opacity: 0.6,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  status: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderRadius: radius.pill,
  },
});
