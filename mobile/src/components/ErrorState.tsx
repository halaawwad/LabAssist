import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, radius, spacing } from "@/theme";

import { AppText } from "./AppText";
import { Button } from "./Button";

export type ErrorStateProps = {
  title?: string;
  message?: string;
  /** Shows a retry button when provided. */
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ErrorState({ title, message, onRetry, retryLabel, style }: ErrorStateProps) {
  const { t } = useLanguage();

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={styles.badge}>
        <AppText variant="heading" weight="bold" tone="danger" align="center">
          !
        </AppText>
      </View>
      <AppText variant="heading" align="center">
        {title ?? t("common.errorTitle")}
      </AppText>
      <AppText tone="muted" align="center">
        {message ?? t("common.errorMessage")}
      </AppText>
      {onRetry ? (
        <Button
          title={retryLabel ?? t("common.retry")}
          variant="soft"
          onPress={onRetry}
          style={styles.retry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  badge: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
  },
  retry: {
    alignSelf: "center",
    marginTop: spacing.sm,
  },
});
