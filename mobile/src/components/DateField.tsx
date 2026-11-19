import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CalendarDays } from "lucide-react-native";
import { Platform, View } from "react-native";

import { useLanguage } from "@/i18n";
import { colors } from "@/theme";

import { AppText } from "./AppText";
import { TouchTarget as Pressable } from "./TouchTarget";
import {
  dateFieldStyles as styles,
  formatDayLabel,
  fromDay,
  toDay,
  type DateFieldProps,
} from "./dateFieldShared";

export { formatDayLabel, fromDay, toDay, type DateFieldProps } from "./dateFieldShared";

/**
 * Native date picker (`@react-native-community/datetimepicker`, bundled in Expo Go):
 * iOS shows the compact inline picker, Android opens the system calendar dialog.
 * `DateField.web.tsx` uses the browser's own date input.
 */
export function DateField({ label, value, onChange, minimum, maximum, error }: DateFieldProps) {
  const { language } = useLanguage();
  const date = fromDay(value) ?? new Date();
  const bounds = { minimumDate: fromDay(minimum), maximumDate: fromDay(maximum) };
  return (
    <View style={styles.field}>
      <AppText variant="label" tone="strong">
        {label}
      </AppText>
      {Platform.OS === "ios" ? (
        <View style={[styles.box, !!error && styles.invalid]}>
          <CalendarDays size={18} color={colors.primary} />
          <AppText style={styles.value}>{formatDayLabel(value, language)}</AppText>
          <DateTimePicker
            accessibilityLabel={label}
            value={date}
            mode="date"
            display="compact"
            locale={language === "ar" ? "ar" : "en-GB"}
            {...bounds}
            onValueChange={(_, next) => onChange(toDay(next))}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatDayLabel(value, language)}`}
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: "date",
              ...bounds,
              onValueChange: (_, next) => onChange(toDay(next)),
            })
          }
          style={[styles.box, !!error && styles.invalid]}
        >
          <CalendarDays size={18} color={colors.primary} />
          <AppText style={styles.value}>{formatDayLabel(value, language)}</AppText>
        </Pressable>
      )}
      {!!error && (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      )}
    </View>
  );
}
