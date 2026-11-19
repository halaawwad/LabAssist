import { forwardRef, useState, type ComponentRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useLanguage } from "@/i18n";
import { colors, fontFamilies } from "@/theme";
import { usePreferences } from "@/state/Preferences";

/**
 * Consistent input typography, a 48px minimum height, readable placeholders, a visible
 * focus border and bounded multiline editing on small phones.
 */
export const MobileInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(
  function MobileInput({ style, multiline, onFocus, onBlur, ...props }, ref) {
    const { language, isRTL } = useLanguage();
    const { preferences } = usePreferences();
    const [focused, setFocused] = useState(false);
    const inputStyle = StyleSheet.flatten(style);
    const minimum =
      typeof inputStyle?.minHeight === "number" ? Math.min(88, inputStyle.minHeight) : 88;
    const maximum =
      typeof inputStyle?.maxHeight === "number" ? Math.min(180, inputStyle.maxHeight) : 180;
    const bordered = (inputStyle?.borderWidth ?? 0) > 0;
    return (
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        ref={ref}
        multiline={multiline}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          {
            minWidth: 0,
            fontFamily: fontFamilies[language].regular,
            textAlign: isRTL ? "right" : "left",
            color: colors.text,
          },
          style,
          { fontSize: preferences.largeText ? 18 : 16, minHeight: multiline ? minimum : 48 },
          multiline && { maxHeight: maximum, textAlignVertical: "top" },
          focused && bordered && { borderColor: colors.primary },
        ]}
      />
    );
  },
);
