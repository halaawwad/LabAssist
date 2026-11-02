import { useState } from "react";
import {
  StyleSheet,
  TextInput,
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

export function TextField({
  label,
  error,
  hint,
  containerStyle,
  multiline,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { language, dir } = useLanguage();
  const [focused, setFocused] = useState(false);
  const message = error ?? hint;

  return (
    <View style={[styles.field, containerStyle]}>
      <AppText variant="label" tone="strong">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={message}
        placeholderTextColor={colors.textFaint}
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
            textAlign: "start",
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
}

// Matches the workshop .field and .input classes.
const styles = StyleSheet.create({
  field: {
    gap: 7,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    fontSize: textVariants.body.fontSize,
    color: colors.text,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
  },
  multiline: {
    minHeight: 96,
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
