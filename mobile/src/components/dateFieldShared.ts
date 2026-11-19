import { StyleSheet } from "react-native";

import { colors, radius } from "@/theme";
import { formatLongDate } from "@/i18n/format";

export type DateFieldProps = {
  label: string;
  /** Calendar day as `YYYY-MM-DD`. */
  value: string;
  onChange: (value: string) => void;
  /** Optional `YYYY-MM-DD` bounds. */
  minimum?: string;
  maximum?: string;
  error?: string;
};

export const toDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export function fromDay(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : undefined;
}

export function formatDayLabel(value: string, language: string) {
  const date = fromDay(value);
  return date ? formatLongDate(language === "ar" ? "ar" : "en", date, true) : value;
}

export const dateFieldStyles = StyleSheet.create({
  field: { gap: 7 },
  box: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radius.input,
    backgroundColor: colors.inputBackground,
  },
  value: { flex: 1, minWidth: 0, fontSize: 16 },
  invalid: { borderColor: colors.danger },
});
