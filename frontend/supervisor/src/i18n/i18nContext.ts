import { createContext, useContext } from 'react'
import type { en } from './en'

export type Language = 'en' | 'ar'
export type Direction = 'ltr' | 'rtl'

/** Plural forms follow the CLDR categories used by Intl.PluralRules; `other` is the fallback. */
export type PluralForms = {
  other: string
  zero?: string
  one?: string
  two?: string
  few?: string
  many?: string
}

/** The English dictionary defines the shape; every other language must provide the same keys. */
type Widen<T> = T extends string ? string : T extends { other: string } ? PluralForms : { [K in keyof T]: Widen<T[K]> }
export type Dictionary = Widen<typeof en>

type StringPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends PluralForms ? never : `${K}.${StringPaths<T[K]>}`
}[keyof T & string]

type PluralPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends PluralForms ? K : `${K}.${PluralPaths<T[K]>}`
}[keyof T & string]

export type TranslationKey = StringPaths<Dictionary>
export type PluralKey = PluralPaths<Dictionary>
export type TranslationParams = Record<string, string | number>

export type I18nContextValue = {
  language: Language
  dir: Direction
  /** BCP 47 locale used for Intl formatting (Latin digits in both languages). */
  locale: string
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: TranslationParams) => string
  /** Picks the plural form for `count` and exposes it to the template as `{count}`. */
  tp: (key: PluralKey, count: number, params?: TranslationParams) => string
  /** Formats an ISO date (YYYY-MM-DD); defaults to "Oct 6" / "6 أكتوبر". */
  formatDate: (isoDate: string, options?: Intl.DateTimeFormatOptions) => string
  /** Formats a 24-hour "HH:mm" time, e.g. "2:00 PM". */
  formatTime: (time: string) => string
  /** "Today", "Tomorrow" or a full date, relative to `today` (both ISO dates). */
  formatDay: (isoDate: string, today: string) => string
  /** "2 hours ago", "yesterday"... relative to now. */
  formatRelative: (date: Date | string) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>.')
  return context
}
