import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/theme";

import { AppText } from "./AppText";

const tones = {
  blue: { color: colors.avatarBlue, backgroundColor: colors.avatarBlueSoft },
  green: { color: colors.avatarGreen, backgroundColor: colors.avatarGreenSoft },
  violet: { color: colors.avatarViolet, backgroundColor: colors.avatarVioletSoft },
};

export type AvatarTone = keyof typeof tones;

export type AvatarProps = {
  /** One or two letters. */
  initials: string;
  tone?: AvatarTone;
  size?: number;
};

/** Initials in a tinted circle, as used for people on the web. */
export function Avatar({ initials, tone = "green", size = 40 }: AvatarProps) {
  const { color, backgroundColor } = tones[tone];

  return (
    <View
      style={[styles.avatar, { width: size, height: size, backgroundColor }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {/* Initials are Latin, so they always use the Latin font. */}
      <AppText language="en" variant="label" weight="bold" align="center" style={{ color }}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
});
