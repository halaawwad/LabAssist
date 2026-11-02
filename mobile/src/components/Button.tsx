import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadows, spacing } from "@/theme";

import { AppText, type TextTone } from "./AppText";

export type ButtonVariant = "primary" | "soft" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const labelTones: Record<ButtonVariant, TextTone> = {
  primary: "inverse",
  soft: "default",
  ghost: "default",
  danger: "danger",
};

const spinnerColors: Record<ButtonVariant, string> = {
  primary: colors.onPrimary,
  soft: colors.primary,
  ghost: colors.primary,
  danger: colors.dangerText,
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      {...rest}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.small : styles.medium,
        variantStyles[variant],
        pressed && pressedStyles[variant],
        inactive && styles.inactive,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColors[variant]} /> : null}
      <AppText variant="button" tone={labelTones[variant]} numberOfLines={1}>
        {title}
      </AppText>
    </Pressable>
  );
}

// Matches the workshop .btn classes.
const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.sm,
  },
  medium: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  small: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  inactive: {
    opacity: 0.45,
    boxShadow: [],
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    ...shadows.primaryButton,
  },
  soft: {
    backgroundColor: colors.softButton,
    borderColor: colors.softButtonBorder,
  },
  ghost: {
    backgroundColor: colors.ghostButton,
    borderColor: colors.ghostButtonBorder,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerButtonBorder,
  },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryDark },
  soft: { backgroundColor: colors.softButtonPressed },
  ghost: { backgroundColor: colors.inputBackground, borderColor: "rgba(82, 100, 67, 0.25)" },
  danger: { backgroundColor: colors.dangerButtonPressed },
});
