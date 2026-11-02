import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { useLanguage } from "@/i18n";
import { colors, spacing } from "@/theme";

export type ScreenContainerProps = {
  children: ReactNode;
  /** Wrap the content in a ScrollView. */
  scroll?: boolean;
  /** Pull-to-refresh, only used with `scroll`. */
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Screens inside a tab bar pass `["top"]`; the tab bar covers the bottom inset. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export function ScreenContainer({
  children,
  scroll = false,
  refreshControl,
  edges = ["top", "bottom"],
  contentStyle,
}: ScreenContainerProps) {
  const { dir } = useLanguage();

  return (
    // The root layout already sets the direction; setting it again keeps a screen correct
    // when a native container (like a navigator screen) starts a new layout tree.
    <SafeAreaView edges={edges} style={[styles.safeArea, { direction: dir }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.content, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
