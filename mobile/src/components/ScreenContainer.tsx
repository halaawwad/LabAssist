import type { ReactElement, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Image,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { usePathname } from "@/native/router";

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
  const path = usePathname();
  const backdrop = path.includes("/team")
    ? require("../../assets/web/team-worktable-background.png")
    : path.includes("/profile")
      ? require("../../assets/web/profile-desk-background.png")
      : path.includes("/messages")
        ? require("../../assets/web/messages-desk-background.png")
        : path.includes("/meetings")
          ? require("../../assets/web/meetings-light-room-background.png")
          : path.includes("/reports")
            ? require("../../assets/web/reports-workspace-background.png")
            : path.includes("/settings")
              ? require("../../assets/web/settings-controls-background.png")
              : path.includes("/catalog")
                ? require("../../assets/web/catalog-white-background.png")
                : path.includes("/offers")
                  ? require("../../assets/web/inventory-workshop-background.png")
                  : require("../../assets/web/project-white-background.png");

  return (
    // The root layout already sets the direction; setting it again keeps a screen correct
    // when a native container (like a navigator screen) starts a new layout tree.
    <SafeAreaView
      edges={edges}
      style={[
        styles.safeArea,
        { direction: dir },
        path.startsWith("/native/") && { backgroundColor: "transparent" },
      ]}
    >
      {path.startsWith("/student") && (
        <>
          <Image
            pointerEvents="none"
            source={backdrop}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(247,248,241,0.36)" }]}
          />
        </>
      )}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets
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
    flexGrow: 1,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
