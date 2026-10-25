import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStored, writeStored } from '../state/storage'
import { ar } from './ar'
import { en } from './en'
import {
  I18nContext,
  type Dictionary,
  type I18nContextValue,
  type Language,
  type PluralForms,
  type TranslationParams,
} from './i18nContext'

const dictionaries: Record<Language, Dictionary> = { en, ar }
// Latin digits in Arabic too, so table codes like "R12" and times read consistently.
const locales: Record<Language, string> = { en: 'en-US', ar: 'ar-u-nu-latn' }

function lookup(dictionary: Dictionary, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dictionary)
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
}

/** Plain ISO dates are calendar days: read them as local midnight so they never shift a day. */
function parseIso(iso: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
}

const relativeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (readStored<string>('language', 'en') === 'ar' ? 'ar' : 'en'))

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    writeStored('language', next)
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = dictionaries[language]
    const locale = locales[language]
    const pluralRules = new Intl.PluralRules(locale)
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

    const t: I18nContextValue['t'] = (key, params) => {
      const entry = lookup(dictionary, key) ?? lookup(en, key)
      return typeof entry === 'string' ? interpolate(entry, params) : key
    }

    const tp: I18nContextValue['tp'] = (key, count, params) => {
      const forms = (lookup(dictionary, key) ?? lookup(en, key)) as PluralForms | undefined
      if (!forms) return key
      const template = forms[pluralRules.select(count)] ?? forms.other
      return interpolate(template, { count, ...params })
    }

    const formatDate: I18nContextValue['formatDate'] = (iso, options = { month: 'short', day: 'numeric' }) =>
      new Intl.DateTimeFormat(locale, options).format(parseIso(iso))

    const formatTime: I18nContextValue['formatTime'] = (time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hours, minutes))
    }

    const formatRelative: I18nContextValue['formatRelative'] = (iso) => {
      const elapsed = parseIso(iso).getTime() - Date.now()
      for (const [unit, size] of relativeUnits) {
        if (Math.abs(elapsed) >= size || unit === 'minute') return relative.format(Math.round(elapsed / size), unit)
      }
      return ''
    }

    return { language, dir: language === 'ar' ? 'rtl' : 'ltr', setLanguage, t, tp, formatDate, formatTime, formatRelative }
  }, [language, setLanguage])

  // Direction lives on <html>, so dialogs and scrollbars flip together with the page.
  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = value.dir
    document.title = value.t('app.title')
  }, [language, value])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
