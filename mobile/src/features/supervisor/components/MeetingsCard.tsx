import { CalendarDays, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Card, EmptyState } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";
import type { Meeting } from "@/types/supervisor";

// The web .meeting-icon tones.
const toneBackgrounds = {
  green: colors.avatarGreenSoft,
  blue: colors.primaryPale,
};

type MeetingsCardProps = {
  meetings: Meeting[];
  onOpen: () => void;
};

export function MeetingsCard({ meetings, onOpen }: MeetingsCardProps) {
  const { t, isRTL, formatDay, formatTime } = useLanguage();

  return (
    <Card
      title={t("supervisor.dashboard.meetingsTitle")}
      icon={<CalendarDays size={18} color={colors.primary} />}
      action={meetings.length > 0 ? { label: t("common.viewAll"), onPress: onOpen } : undefined}
    >
      {meetings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} color={colors.primary} />}
          title={t("supervisor.dashboard.noMeetings.title")}
          message={t("supervisor.dashboard.noMeetings.message")}
        />
      ) : (
        <View>
          {meetings.map((meeting, index) => {
            const title = t("supervisor.dashboard.meetingProject", { code: meeting.projectCode });
            const day = formatDay(meeting.date);
            const time = formatTime(meeting.time);
            return (
              <Pressable
                key={meeting.id}
                accessibilityRole="button"
                accessibilityLabel={`${title}, ${meeting.team}, ${day} ${time}`}
                onPress={onOpen}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.divided,
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.icon, { backgroundColor: toneBackgrounds[meeting.tone] }]}>
                  <CalendarDays size={20} color={colors.primary} />
                </View>
                <View style={styles.copy}>
                  <AppText variant="label" numberOfLines={1}>
                    {title}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {meeting.team}
                  </AppText>
                </View>
                <View style={styles.when}>
                  <AppText variant="caption" weight="semibold" align="end">
                    {day}
                  </AppText>
                  <AppText variant="caption" tone="muted" align="end">
                    {time}
                  </AppText>
                </View>
                <ChevronRight
                  size={18}
                  color={colors.textFaint}
                  style={isRTL ? styles.flipped : undefined}
                />
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
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  copy: {
    flex: 1,
  },
  when: {
    alignItems: "flex-end",
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
