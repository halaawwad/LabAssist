import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { I18nManager, Platform } from "react-native";

import {
  directionOf,
  isLanguage,
  translate,
  translatePlural,
  type Direction,
  type Language,
  type PluralKey,
  type TranslationKey,
  type TranslationParams,
} from "./dictionary";
import { syncDocumentDirection } from "./direction";
import {
  formatDateTime,
  formatDay,
  formatFileSize,
  formatLongDate,
  formatNumber,
  formatRelative,
  formatTime,
  isolate,
  isolateLtr,
} from "./format";

const STORAGE_KEY = "labassist.language";
const DEFAULT_LANGUAGE: Language = "en";

type LanguageContextValue = {
  language: Language;
  dir: Direction;
  isRTL: boolean;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: TranslationParams) => string;
  tp: (key: PluralKey, count: number, params?: TranslationParams) => string;
  /** "Today", "Tomorrow" or a short date for an ISO calendar day. */
  formatDay: (isoDate: string) => string;
  /** Formats a 24-hour "HH:mm" time. */
  formatTime: (time: string) => string;
  /** "2 hours ago" style text for a past ISO timestamp. */
  formatRelative: (isoTimestamp: string) => string;
  /** "19 November 2026" / "19 نوفمبر 2026". */
  formatLongDate: (value: string | Date, weekday?: boolean) => string;
  formatDateTime: (value: string | Date) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatFileSize: (megabytes: number) => string;
  /** Display-only isolation for Latin tokens (emails, codes, versions) in Arabic text. */
  ltr: (value: string | number) => string;
  /** Display-only isolation for values of unknown direction (names, titles). */
  isolate: (value: string | number) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Keeps the native layout direction in step with the chosen language. React Native applies this
 * only on the next cold start of a build, and Expo Go resets it, so the root view also sets the
 * `direction` style to flip the layout right away.
 */
function syncNativeDirection(rtl: boolean) {
  if (Platform.OS === "web" || I18nManager.isRTL === rtl) return;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => setLanguageState(isLanguage(stored) ? stored : DEFAULT_LANGUAGE))
      .catch(() => setLanguageState(DEFAULT_LANGUAGE));
  }, []);

  useEffect(() => {
    if (!language) return;
    syncNativeDirection(directionOf(language) === "rtl");
    syncDocumentDirection(directionOf(language), language);
  }, [language]);

  // Leaving the native app (for example to the original web preview) restores the default.
  useEffect(() => () => syncDocumentDirection("ltr", DEFAULT_LANGUAGE), []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // The choice still applies for this session; it just won't survive a restart.
    });
  }, []);

  const value = useMemo<LanguageContextValue | null>(() => {
    if (!language) return null;
    const dir = directionOf(language);
    return {
      language,
      dir,
      isRTL: dir === "rtl",
      setLanguage,
      t: (key, params) => translate(language, key, params),
      tp: (key, count, params) => translatePlural(language, key, count, params),
      formatDay: (isoDate) => formatDay(language, isoDate),
      formatTime: (time) => formatTime(language, time),
      formatRelative: (isoTimestamp) => formatRelative(language, isoTimestamp),
      formatLongDate: (value, weekday) => formatLongDate(language, value, weekday),
      formatDateTime: (value) => formatDateTime(language, value),
      formatNumber: (value, options) => formatNumber(language, value, options),
      formatFileSize: (megabytes) => formatFileSize(language, megabytes),
      ltr: isolateLtr,
      isolate,
    };
  }, [language, setLanguage]);

  // Render nothing until the saved language is known, so the app never flashes the wrong one.
  if (!value) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
