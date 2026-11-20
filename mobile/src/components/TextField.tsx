import { MobileInput as TextInput } from "@/components/MobileInput";
import { forwardRef, useState, type ComponentRef } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

import { useLanguage } from "@/i18n";
import { colors, fontFamilies, radius, shadows, spacing, textVariants } from "@/theme";

import { AppText } from "./AppText";

export type TextFieldProps = TextInputProps & {
  label: string;
  /** Shown under the field in red; also marks the field invalid. */
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Labelled input; the ref reaches the input so forms can focus the first invalid field. */
export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, hint, containerStyle, multiline, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { language, dir } = useLanguage();
  const [focused, setFocused] = useState(false);
  const message = error ?? hint;

  return (
    <View style={[styles.field, containerStyle]}>
      <AppText variant="label" tone="strong">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        aria-invalid={!!error}
        accessibilityHint={message}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        {...rest}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            fontFamily: fontFamilies[language].regular,
            textAlign: dir === "rtl" ? "right" : "left",
            writingDirection: dir,
          },
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.invalid : null,
          style,
        ]}
      />
      {message ? (
        <AppText variant="caption" tone={error ? "danger" : "muted"}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
});

// Matches the workshop .field and .input classes.
const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    fontSize: Math.max(16, textVariants.body.fontSize),
    color: colors.text,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  multiline: {
    minHeight: 88,
    maxHeight: 160,
    paddingVertical: 11,
    textAlignVertical: "top",
  },
  focused: {
    borderColor: colors.primary,
    ...shadows.focusRing,
  },
  invalid: {
    borderColor: colors.danger,
  },
});
