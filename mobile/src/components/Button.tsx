import { TouchTarget as Pressable } from "@/components/TouchTarget";
import { createContext, useContext, type ReactNode } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadows, spacing } from "@/theme";

import { AppText, type TextTone } from "./AppText";

/**
 * Shared button hierarchy:
 * - `primary`: olive-filled main action.
 * - `secondary`: olive outline.
 * - `tertiary`: text-only action (still a 44px target).
 * - `danger`: destructive action.
 * `soft` and `ghost` are older names kept for existing screens; they render as
 * `secondary` and `tertiary`.
 */
export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger" | "soft" | "ghost";
export type ButtonSize = "md" | "sm";

type Look = "primary" | "secondary" | "tertiary" | "danger";
const looks: Record<ButtonVariant, Look> = {
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary",
  danger: "danger",
  soft: "secondary",
  ghost: "tertiary",
};

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** Optional leading icon element. */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Forms and sheets set this so their primary action spans the full width. */
export const PrimaryFullWidth = createContext(false);

const labelTones: Record<Look, TextTone> = {
  primary: "inverse",
  secondary: "primary",
  tertiary: "primary",
  danger: "danger",
};

const spinnerColors: Record<Look, string> = {
  primary: colors.onPrimary,
  secondary: colors.primary,
  tertiary: colors.primary,
  danger: colors.dangerText,
};

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth,
  icon,
  disabled,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const look = looks[variant];
  const formDefault = useContext(PrimaryFullWidth);
  const wide = fullWidth ?? (formDefault && look === "primary");
  const inactive = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      {...rest}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        size === "sm" ? styles.small : styles.medium,
        variantStyles[look],
        pressed && pressedStyles[look],
        inactive && (look === "primary" ? styles.inactivePrimary : styles.inactive),
        wide && styles.fullWidth,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={spinnerColors[look]} /> : icon}
      <AppText
        variant="button"
        weight="semibold"
        tone={inactive ? "faint" : labelTones[look]}
        align="center"
        style={[{ flexShrink: 1 }, inactive && look === "primary" && styles.inactiveLabel]}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    maxWidth: "100%",
    flexShrink: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.md,
  },
  medium: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  small: {
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  // Disabled is greyed and flat, so enabled buttons never look like this.
  inactive: {
    backgroundColor: colors.segmentTrack,
    borderColor: "transparent",
    boxShadow: [],
  },
  inactivePrimary: {
    backgroundColor: "#d9ddd3",
    borderColor: "transparent",
    boxShadow: [],
  },
  inactiveLabel: { color: "#6f7768" },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    ...shadows.primaryButton,
  },
  secondary: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.primary,
  },
  tertiary: {
    backgroundColor: "transparent",
    paddingHorizontal: spacing.sm,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerButtonBorder,
  },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryDark },
  secondary: { backgroundColor: colors.primaryWash },
  tertiary: { backgroundColor: colors.primaryWash },
  danger: { backgroundColor: colors.dangerButtonPressed },
});
