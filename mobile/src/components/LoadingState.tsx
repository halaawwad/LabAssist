import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, spacing } from "@/theme";

import { AppText } from "./AppText";

export type LoadingStateProps = {
  /** Defaults to the generic "Loading…" text. */
  message?: string;
  style?: StyleProp<ViewStyle>;
};

export function LoadingState({ message, style }: LoadingStateProps) {
  const { t } = useLanguage();
  const text = message ?? t("common.loading");

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={text}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText tone="muted" align="center">
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xxl,
  },
});
