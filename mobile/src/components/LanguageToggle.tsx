import { Pressable, StyleSheet, View } from "react-native";

import { languages, useLanguage } from "@/i18n";
import { colors, radius, shadows, spacing } from "@/theme";

import { AppText } from "./AppText";

export type LanguageToggleProps = {
  /** Short labels ("EN" / "ع") sized for a screen header. */
  compact?: boolean;
};

/** English / Arabic switch, styled like the web .segmented control. */
export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View
      style={[styles.track, compact && styles.compactTrack]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("language.label")}
    >
      {languages.map((option) => {
        const selected = option === language;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={t(`language.${option}`)}
            accessibilityState={{ selected }}
            hitSlop={compact ? 4 : undefined}
            onPress={() => setLanguage(option)}
            style={[styles.option, compact && styles.compactOption, selected && styles.selected]}
          >
            {/* Each name uses its own language's font so "العربية" never renders in Inter. */}
            <AppText
              language={option}
              variant={compact ? "caption" : "button"}
              weight={selected ? "semibold" : "medium"}
              tone={selected ? "default" : "muted"}
              align="center"
            >
              {t(compact ? `language.${option}Short` : `language.${option}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.segmentTrack,
    borderRadius: radius.md,
  },
  compactTrack: {
    alignSelf: "flex-start",
    gap: spacing.xxs,
    padding: 3,
    borderRadius: radius.pill,
  },
  option: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  compactOption: {
    flex: 0,
    minWidth: 40,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  selected: {
    backgroundColor: colors.inputBackground,
    ...shadows.soft,
  },
});
