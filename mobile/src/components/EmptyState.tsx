import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/theme";

import { AppText } from "./AppText";

export type EmptyStateProps = {
  title: string;
  message?: string;
  /** An icon element, shown in a soft circle above the title. */
  icon?: ReactNode;
  /** Optional call to action, such as a Button. */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EmptyState({ title, message, icon, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <AppText variant="label" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" tone="muted" align="center">
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: colors.primaryWash,
    borderRadius: radius.pill,
  },
});
