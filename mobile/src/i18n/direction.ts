import { Platform, type ViewStyle } from "react-native";

import type { Direction } from "./dictionary";

/**
 * Layout direction for a subtree.
 *
 * Native (Yoga) reads the `direction` style. react-native-web rejects that style
 * ("Invalid style property of direction") and drops it, so on the web the HTML `dir`
 * attribute is used instead: `LanguageProvider` sets it on the document, and
 * `directionProps` sets it on a single view (for example a modal or a Latin brand mark).
 */
export function directionStyle(dir: Direction): ViewStyle | undefined {
  return Platform.OS === "web" ? undefined : { direction: dir };
}

/** Spread onto a `View`: `<View {...directionProps("ltr")} style={…} />`. */
export function directionProps(dir: Direction): { dir?: Direction; style?: ViewStyle } {
  return Platform.OS === "web" ? { dir } : { style: { direction: dir } };
}

/** Keeps the browser document's direction and language in step with the app language. */
export function syncDocumentDirection(dir: Direction, language: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  document.documentElement.dir = dir;
  document.documentElement.lang = language;
}
