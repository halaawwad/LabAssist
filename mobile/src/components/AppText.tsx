import { usePreferences } from "@/state/Preferences";
import { StyleSheet, Text, type TextProps } from "react-native";

import { directionOf, useLanguage, type Language } from "@/i18n";
import { colors, fontStyle, type FontWeight, type TextVariant } from "@/theme";

const toneColors = {
  default: colors.text,
  strong: colors.textStrong,
  muted: colors.textMuted,
  faint: colors.textFaint,
  primary: colors.primary,
  danger: colors.dangerText,
  inverse: colors.onPrimary,
};

export type TextTone = keyof typeof toneColors;

/** Smallest text size in the app UI (captions, badges, tab labels). */
export const MIN_UI_FONT_SIZE = 12;

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: FontWeight;
  tone?: TextTone;
  /** `start` and `end` follow the layout direction, so they flip in Arabic. */
  align?: "start" | "center" | "end";
  /** Font and writing direction for this text. Defaults to the app language. */
  language?: Language;
  /**
   * `ui` (default) raises sizes below 12px and keeps line height in proportion, so text
   * never clips. `document` keeps exact sizes for paper previews and technical drawings.
   */
  scale?: "ui" | "document";
};

export function AppText({
  variant = "body",
  weight,
  tone = "default",
  align = "start",
  language,
  scale = "ui",
  style,
  ...rest
}: AppTextProps) {
  const app = useLanguage();
  const { preferences } = usePreferences();
  const textLanguage = language ?? app.language;
  const base = fontStyle(textLanguage, variant, weight);
  const own = StyleSheet.flatten(style) ?? {};
  const factor = preferences.largeText ? 1.12 : 1;
  const requested = (own.fontSize ?? base.fontSize ?? 15) * factor;
  const fontSize = scale === "ui" ? Math.max(MIN_UI_FONT_SIZE, requested) : requested;
  const requestedLine = (own.lineHeight ?? base.lineHeight ?? requested * 1.4) * factor;
  // A raised size or a tight custom line height must not cut off ascenders or Arabic marks.
  const minimumLine = Math.round(fontSize * (directionOf(textLanguage) === "rtl" ? 1.45 : 1.25));
  const lineHeight = scale === "ui" ? Math.max(requestedLine, minimumLine) : requestedLine;

  return (
    <Text
      {...rest}
      style={[
        base,
        {
          color: toneColors[tone],
          flexShrink: 1,
          textAlign:
            align === "start"
              ? directionOf(textLanguage) === "rtl"
                ? "right"
                : "left"
              : align === "end"
                ? directionOf(textLanguage) === "rtl"
                  ? "left"
                  : "right"
                : align,
          writingDirection: directionOf(textLanguage),
        },
        style,
        { fontSize, lineHeight },
      ]}
    />
  );
}
