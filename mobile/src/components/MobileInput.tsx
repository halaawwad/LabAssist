import { forwardRef, type ComponentRef } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useLanguage } from "@/i18n";
import { fontFamilies } from "@/theme";
import { usePreferences } from "@/state/Preferences";

/** Consistent input typography and bounded multiline editing on small phones. */
export const MobileInput = forwardRef<ComponentRef<typeof TextInput>, TextInputProps>(
  function MobileInput({ style, multiline, ...props }, ref) {
    const { language, isRTL } = useLanguage();
    const { preferences } = usePreferences();
    const inputStyle = StyleSheet.flatten(style);
    const minimum =
      typeof inputStyle?.minHeight === "number" ? Math.min(88, inputStyle.minHeight) : 88;
    const maximum =
      typeof inputStyle?.maxHeight === "number" ? Math.min(180, inputStyle.maxHeight) : 180;
    return (
      <TextInput
        {...props}
        ref={ref}
        multiline={multiline}
        selectionColor="#526443"
        style={[
          {
            minWidth: 0,
            fontFamily: fontFamilies[language].regular,
            textAlign: isRTL ? "right" : "left",
          },
          style,
          { fontSize: preferences.largeText ? 18 : 16, minHeight: multiline ? minimum : 48 },
          multiline && { maxHeight: maximum, textAlignVertical: "top" },
        ]}
      />
    );
  },
);
