import { ar } from "./ar";
import { en } from "./en";

export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

export const languages: Language[] = ["en", "ar"];

/** Plural forms follow the CLDR categories; `other` is the fallback. */
export type PluralForms = {
  other: string;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
};
type PluralCategory = keyof PluralForms;

/** The English dictionary defines the shape; Arabic must provide the same keys. */
type Widen<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralForms
    : { [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof en>;

type StringPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends PluralForms
      ? never
      : `${K}.${StringPaths<T[K]>}`;
}[keyof T & string];

type PluralPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends PluralForms
      ? K
      : `${K}.${PluralPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = StringPaths<Dictionary>;
export type PluralKey = PluralPaths<Dictionary>;
export type TranslationParams = Record<string, string | number>;

const dictionaries: Record<Language, Dictionary> = { en, ar };

export const isLanguage = (value: unknown): value is Language =>
  languages.includes(value as Language);

export const directionOf = (language: Language): Direction => (language === "ar" ? "rtl" : "ltr");

function lookup(dictionary: Dictionary, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      dictionary,
    );
}

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * CLDR plural rules for the two app languages, written out because Hermes does not reliably
 * ship Intl.PluralRules.
 */
function pluralCategory(language: Language, count: number): PluralCategory {
  if (language === "en") return count === 1 ? "one" : "other";
  const lastTwo = count % 100;
  if (count === 0) return "zero";
  if (count === 1) return "one";
  if (count === 2) return "two";
  if (lastTwo >= 3 && lastTwo <= 10) return "few";
  if (lastTwo >= 11 && lastTwo <= 99) return "many";
  return "other";
}

export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const entry = lookup(dictionaries[language], key) ?? lookup(en, key);
  return typeof entry === "string" ? interpolate(entry, params) : key;
}

/** Picks the plural form for `count` and exposes it to the template as `{count}`. */
export function translatePlural(
  language: Language,
  key: PluralKey,
  count: number,
  params?: TranslationParams,
): string {
  const forms = (lookup(dictionaries[language], key) ?? lookup(en, key)) as PluralForms | undefined;
  if (!forms) return key;
  const template = forms[pluralCategory(language, count)] ?? forms.other;
  return interpolate(template, { count, ...params });
}
