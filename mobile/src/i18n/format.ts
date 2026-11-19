import { translate, translatePlural, type Language } from "./dictionary";

// Latin digits in Arabic too, as on the web, so codes like "LA-101" and times read consistently.
const locales: Record<Language, string> = { en: "en-US", ar: "ar-u-nu-latn" };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Hermes may ignore the `nu` extension, so Arabic-Indic digits are converted back as well. */
function latinDigits(text: string) {
  return text.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function format(language: Language, date: Date, options: Intl.DateTimeFormatOptions) {
  return latinDigits(new Intl.DateTimeFormat(locales[language], options).format(date));
}

/** Local calendar day as YYYY-MM-DD. */
export function toIsoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Plain ISO dates are calendar days: read them as local midnight so they never shift a day. */
function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** "Today", "Tomorrow", or a short date such as "Wed, Nov 5". */
export function formatDay(language: Language, isoDate: string, now = new Date()) {
  const date = parseIsoDate(isoDate);
  const today = parseIsoDate(toIsoDate(now));
  const days = Math.round((date.getTime() - today.getTime()) / DAY);
  if (days === 0) return translate(language, "dates.today");
  if (days === 1) return translate(language, "dates.tomorrow");
  return format(language, date, { weekday: "short", month: "short", day: "numeric" });
}

/** Formats a 24-hour "HH:mm" time for the language, e.g. "2:00 PM". */
export function formatTime(language: Language, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return format(language, new Date(2000, 0, 1, hours, minutes), {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "2 hours ago" style text for a past ISO timestamp. */
export function formatRelative(language: Language, isoTimestamp: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(isoTimestamp).getTime());
  if (elapsed < MINUTE) return translate(language, "dates.justNow");
  if (elapsed < HOUR)
    return translatePlural(language, "dates.minutesAgo", Math.floor(elapsed / MINUTE));
  if (elapsed < DAY) return translatePlural(language, "dates.hoursAgo", Math.floor(elapsed / HOUR));
  return translatePlural(language, "dates.daysAgo", Math.floor(elapsed / DAY));
}

const LRI = "⁦"; // left-to-right isolate
const FSI = "⁨"; // first-strong isolate
const PDI = "⁩"; // pop directional isolate

/**
 * Display-only bidi isolation for Latin tokens inside Arabic text (emails, codes, versions,
 * file names, sizes, "HH:mm"). The marks are added when rendering and never stored.
 * Unicode isolates work in both React Native Text and browsers.
 */
export function isolateLtr(value: string | number) {
  return `${LRI}${value}${PDI}`;
}
/** Isolates a value of unknown direction (for example a user-authored name or title). */
export function isolate(value: string | number) {
  return `${FSI}${value}${PDI}`;
}

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseIsoDate(value) : new Date(value);
}

/** "19 November 2026" / "19 نوفمبر 2026"; plain YYYY-MM-DD values stay calendar days. */
export function formatLongDate(language: Language, value: string | Date, weekday = false) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return format(language, date, {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Date and time of an ISO timestamp, e.g. "15 Oct 2026, 14:20". */
export function formatDateTime(language: Language, value: string | Date) {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return format(language, date, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Latin-digit number with grouping, isolated so it never reorders inside Arabic text. */
export function formatNumber(language: Language, value: number, options?: Intl.NumberFormatOptions) {
  return isolateLtr(latinDigits(new Intl.NumberFormat(locales[language], options).format(value)));
}

/** "2.4 MB", kept together and left-to-right in both languages. */
export function formatFileSize(language: Language, megabytes: number) {
  return isolateLtr(`${latinDigits(new Intl.NumberFormat(locales[language]).format(megabytes))} MB`);
}
