import { ArrowRight } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, radius, shadows, spacing } from "@/theme";

import { AppText } from "./AppText";

export type CardAction = {
  label: string;
  onPress: () => void;
};

export type CardProps = {
  title?: string;
  /** An icon element shown before the title, like the web panel headings. */
  icon?: ReactNode;
  /** A text link at the end of the title row, such as "View all". */
  action?: CardAction;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ title, icon, action, children, style }: CardProps) {
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.card, style]}>
      {title ? (
        <View style={styles.titleRow}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <AppText variant="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {action ? (
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={action.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <AppText variant="caption" weight="semibold" tone="primary">
                {action.label}
              </AppText>
              <ArrowRight
                size={15}
                color={colors.primary}
                style={isRTL ? styles.flipped : undefined}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// The web .panel glass, without the backdrop blur.
const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radius.lg,
    ...shadows.panel,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryWash,
    borderRadius: radius.pill,
  },
  title: {
    flex: 1,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actionPressed: {
    opacity: 0.6,
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
