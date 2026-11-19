import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, fontFamilies } from "@/theme";

import { AppText } from "./AppText";
import { dateFieldStyles as styles, formatDayLabel, type DateFieldProps } from "./dateFieldShared";

export { formatDayLabel, fromDay, toDay, type DateFieldProps } from "./dateFieldShared";

/** Web fallback: the browser's native date input (calendar popup and keyboard entry). */
export function DateField({ label, value, onChange, minimum, maximum, error }: DateFieldProps) {
  const { language, isRTL } = useLanguage();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label" tone="strong">
        {label}
      </AppText>
      <View
        style={[styles.box, focused && { borderColor: colors.primary }, !!error && styles.invalid]}
      >
        <CalendarDays size={18} color={colors.primary} />
        <input
          type="date"
          aria-label={label}
          aria-invalid={!!error}
          value={value}
          min={minimum}
          max={maximum}
          lang={language}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            border: 0,
            outline: "none",
            background: "transparent",
            color: colors.text,
            fontSize: 16,
            fontFamily: fontFamilies[language].regular,
            direction: isRTL ? "rtl" : "ltr",
          }}
        />
      </View>
      <AppText variant="caption" tone="muted">
        {formatDayLabel(value, language)}
      </AppText>
      {!!error && (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      )}
    </View>
  );
}
