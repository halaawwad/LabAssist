import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { AppText } from "@/components";
import { useLanguage } from "@/i18n";
import { colors } from "@/theme";

const VIEWBOX = 120;
const STROKE = 12;
const RADIUS = (VIEWBOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type ProgressRingProps = {
  /** 0–100. */
  value: number;
  size?: number;
};

/** The web dashboard ring. It fills clockwise, or counter-clockwise in Arabic. */
export function ProgressRing({ value, size = 112 }: ProgressRingProps) {
  const { t, isRTL } = useLanguage();
  const percent = Math.min(100, Math.max(0, value));

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityLabel={t("supervisor.dashboard.overallAria", { value: percent })}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        style={isRTL ? styles.flipped : undefined}
      >
        <Defs>
          <LinearGradient id="progress-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.ringStart} />
            <Stop offset="0.5" stopColor={colors.ringMid} />
            <Stop offset="1" stopColor={colors.ringEnd} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          stroke={colors.track}
          strokeWidth={STROKE}
          fill="none"
        />
        {percent > 0 ? (
          <Circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={RADIUS}
            stroke="url(#progress-ring)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
            fill="none"
            transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}
          />
        ) : null}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <AppText language="en" variant="heading" weight="bold" align="center">
          {`${percent}%`}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
