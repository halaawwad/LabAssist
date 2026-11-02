import { ar } from "./ar";
import { en } from "./en";

export type Language = "en" | "ar";

/** The English dictionary defines the shape; Arabic must provide the same keys. */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };
export type Dictionary = Widen<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = Paths<Dictionary>;

const dictionaries: Record<Language, Dictionary> = { en, ar };

export const isRtl = (language: Language) => language === "ar";

export function t(language: Language, key: TranslationKey): string {
  const value = key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dictionaries[language]);
  return typeof value === "string" ? value : key;
}
