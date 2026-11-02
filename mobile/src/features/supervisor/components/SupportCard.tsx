import { StyleSheet, View } from "react-native";

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
    <View style={styles.card}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.xl,
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
