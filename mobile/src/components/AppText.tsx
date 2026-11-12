import { Text, type TextProps } from "react-native";

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

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  weight?: FontWeight;
  tone?: TextTone;
  /** `start` and `end` follow the layout direction, so they flip in Arabic. */
  align?: "start" | "center" | "end";
  /** Font and writing direction for this text. Defaults to the app language. */
  language?: Language;
};

export function AppText({
  variant = "body",
  weight,
  tone = "default",
  align = "start",
  language,
  style,
  ...rest
}: AppTextProps) {
  const app = useLanguage();
  const textLanguage = language ?? app.language;

  return (
    <Text
      {...rest}
      style={[
        fontStyle(textLanguage, variant, weight),
        {
          color: toneColors[tone],
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
      ]}
    />
  );
}
