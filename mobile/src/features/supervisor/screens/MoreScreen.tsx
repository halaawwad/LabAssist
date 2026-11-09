import { useRouter } from "@/native/router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Card, LanguageToggle, ScreenContainer, ScreenHeader } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";

import { supervisorSections, type SupervisorSection } from "../navigation";

const groups: SupervisorSection["group"][] = ["supervision", "account"];

/** The rest of the web sidebar, which does not fit in the tab bar. */
export function MoreScreen() {
  const { t, isRTL } = useLanguage();
  const router = useRouter();

  return (
    <ScreenContainer scroll edges={["top"]}>
      <ScreenHeader title={t("supervisor.nav.more")} trailing={<LanguageToggle compact />} />

      {groups.map((group) => (
        <View key={group} style={styles.group}>
          <AppText variant="caption" weight="semibold" tone="muted" style={styles.groupLabel}>
            {t(`supervisor.more.${group}`)}
          </AppText>
          <Card style={styles.list}>
            {supervisorSections
              .filter((section) => section.group === group)
              .map((section, index) => (
                <Pressable
                  key={section.id}
                  accessibilityRole="link"
                  onPress={() => router.push(section.href)}
                  style={({ pressed }) => [
                    styles.row,
                    index > 0 && styles.divided,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.icon}>
                    <section.icon size={18} color={colors.primary} />
                  </View>
                  <AppText variant="label" style={styles.label}>
                    {t(`supervisor.nav.${section.id}`)}
                  </AppText>
                  <ChevronRight
                    size={18}
                    color={colors.textFaint}
                    style={isRTL ? styles.flipped : undefined}
                  />
                </Pressable>
              ))}
          </Card>
        </View>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  groupLabel: {
    paddingHorizontal: spacing.xs,
  },
  list: {
    gap: 0,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pressed: {
    opacity: 0.6,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderRadius: radius.pill,
  },
  label: {
    flex: 1,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
