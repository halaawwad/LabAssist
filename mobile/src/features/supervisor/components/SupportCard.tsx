import { ImageBackground, StyleSheet, View } from "react-native";

import { AppText, Button } from "@/components";
import { useLanguage } from "@/i18n";
import { colors, gradients, radius, shadows, spacing } from "@/theme";

type SupportCardProps = {
  onOpen: () => void;
};

/** The web "Support better projects" card, without its photo. */
export function SupportCard({ onOpen }: SupportCardProps) {
  const { t } = useLanguage();

  return (
    <ImageBackground
      source={require("../../../../assets/web/supervisor-support-portrait.png")}
      imageStyle={{ borderRadius: 28 }}
      style={styles.card}
    >
      <View
        style={{ position: "absolute", inset: 0, backgroundColor: "#1b352980", borderRadius: 28 }}
      />
      <AppText variant="heading" tone="inverse">
        {t("supervisor.dashboard.support.title")}
      </AppText>
      <AppText tone="inverse" style={styles.body}>
        {t("supervisor.dashboard.support.body")}
      </AppText>
      <Button
        title={t("supervisor.dashboard.support.open")}
        variant="ghost"
        size="sm"
        onPress={onOpen}
        style={styles.button}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.xl,
    minHeight: 320,
    justifyContent: "flex-end",
    overflow: "hidden",
    backgroundColor: colors.primary,
    backgroundImage: gradients.highlight,
    borderRadius: radius.xl,
    ...shadows.raised,
  },
  body: {
    opacity: 0.9,
  },
  button: {
    marginTop: spacing.xs,
  },
});
