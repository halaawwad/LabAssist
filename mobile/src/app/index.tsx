import { StyleSheet, Text, View } from "react-native";

import { colors, spacing } from "@/theme";
import { t } from "@/i18n";

// Placeholder route so Expo Go has something to render until real screens land.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("en", "app.name")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
  },
});
