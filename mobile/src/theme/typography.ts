// Per-weight imports so only these eight font files end up in the bundle.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { NotoSansArabic_400Regular } from "@expo-google-fonts/noto-sans-arabic/400Regular";
import { NotoSansArabic_500Medium } from "@expo-google-fonts/noto-sans-arabic/500Medium";
import { NotoSansArabic_600SemiBold } from "@expo-google-fonts/noto-sans-arabic/600SemiBold";
import { NotoSansArabic_700Bold } from "@expo-google-fonts/noto-sans-arabic/700Bold";
import type { TextStyle } from "react-native";

import type { Language } from "@/i18n/dictionary";

// The web apps use Inter for Latin text and fall back to "Noto Sans Arabic" for Arabic.
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
};

type FontName = keyof typeof fontAssets;

export type FontWeight = "regular" | "medium" | "semibold" | "bold";

// Custom fonts ship one file per weight, so the weight picks the family instead of fontWeight.
export const fontFamilies: Record<Language, Record<FontWeight, FontName>> = {
  en: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
  },
  ar: {
    regular: "NotoSansArabic_400Regular",
    medium: "NotoSansArabic_500Medium",
    semibold: "NotoSansArabic_600SemiBold",
    bold: "NotoSansArabic_700Bold",
  },
};

// Arabic script needs more vertical room than Latin at the same size.
const lineHeightRatio: Record<Language, number> = { en: 1.4, ar: 1.65 };

// Sizes follow the web rem values at a 16px root.
export const textVariants = {
  title: { fontSize: 28, weight: "bold" }, // page titles
  heading: { fontSize: 18, weight: "semibold" }, // .panel-header h2
  body: { fontSize: 15, weight: "regular" }, // .input
  label: { fontSize: 14, weight: "semibold" }, // .field-label
  button: { fontSize: 15, weight: "medium" }, // .btn
  caption: { fontSize: 13, weight: "regular" }, // .field-error, hints
} satisfies Record<string, { fontSize: number; weight: FontWeight }>;

export type TextVariant = keyof typeof textVariants;

export function fontStyle(
  language: Language,
  variant: TextVariant,
  weight: FontWeight = textVariants[variant].weight,
): TextStyle {
  const { fontSize } = textVariants[variant];
  return {
    fontFamily: fontFamilies[language][weight],
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio[language]),
  };
}
