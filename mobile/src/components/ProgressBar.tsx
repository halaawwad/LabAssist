import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useLanguage } from "@/i18n";
import { colors, gradients, radius } from "@/theme";

export type ProgressBarProps = {
  /** 0–100. */
  value: number;
  style?: StyleProp<ViewStyle>;
};

/** The web .bar-track: fills from the start edge, so it grows right-to-left in Arabic. */
export function ProgressBar({ value, style }: ProgressBarProps) {
  const { isRTL } = useLanguage();
  const percent = Math.min(100, Math.max(0, value));

  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${percent}%`,
            backgroundImage: isRTL ? gradients.progressRtl : gradients.progressLtr,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    overflow: "hidden",
    backgroundColor: colors.track,
    borderRadius: radius.pill,
  },
  fill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
});
