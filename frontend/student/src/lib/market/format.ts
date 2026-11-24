import type { PinField } from "./client";
export const formatMoney = (amount: string, currency: string) => `${amount} ${currency}`;
export function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
/** Catalog pin values are never verified; unknown values say so explicitly. */
export function pinValue(field: PinField, unit = "") {
  if (field.status === "UNKNOWN" || field.value === null) return "unknown";
  return `${field.value}${unit} (unverified)`;
}
