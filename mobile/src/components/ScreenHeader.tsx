import ChevronLeft from "lucide-react-native/icons/chevron-left";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";

import { AppText } from "./AppText";

export type ScreenHeaderProps = {
  title: string;
  /** Small line above the title, such as a greeting. */
  eyebrow?: string;
  subtitle?: string;
  /** Shown at the end edge, for example a language toggle. */
  trailing?: ReactNode;
  /** Shows a back button at the start edge. */
  onBack?: () => void;
};

export function ScreenHeader({ title, eyebrow, subtitle, trailing, onBack }: ScreenHeaderProps) {
  const { t, isRTL } = useLanguage();

  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={8}
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          >
            <ChevronLeft size={22} color={colors.text} style={isRTL ? styles.flipped : undefined} />
          </Pressable>
        ) : null}
        <View style={styles.titles}>
          {eyebrow ? <AppText tone="muted">{eyebrow}</AppText> : null}
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
        </View>
        {trailing}
      </View>
      {subtitle ? <AppText tone="muted">{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  titles: {
    flex: 1,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.panelStrong,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
  },
  backPressed: {
    backgroundColor: colors.inputBackground,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
