import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { LogOut } from "lucide-react-native";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { TouchTarget as Pressable } from "./TouchTarget";
import { useNativeSession } from "@/state/NativeSession";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useLanguage } from "@/i18n";
import { router } from "@/native/router";
import { colors } from "@/theme";

/**
 * Ends the local demo session only; workspace records and preferences stay on the device.
 * `row` renders the full-width destructive row used at the bottom of More.
 */
export function SignOutButton({ row = false }: { row?: boolean }) {
  const { signOut } = useNativeSession();
  const { clearError } = useWorkspace();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = ar ? "تسجيل الخروج" : "Log out";
  const press = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
      clearError();
      // Clear pushed sub-pages so Back cannot return into the signed-out workspace.
      // POP_TO_TOP is only valid when the stack has something to pop.
      if (router.canDismiss()) router.dismissAll();
      router.replace("/native/login");
    } catch {
      setError(
        ar ? "تعذّر حفظ تسجيل الخروج. أعد المحاولة." : "Could not save sign-out. Please retry.",
      );
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8 }}>
      {!!error && (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      )}
      {row ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={press}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.dangerText} />
          ) : (
            <LogOut size={19} color={colors.dangerText} />
          )}
          <AppText weight="semibold" tone="danger">
            {title}
          </AppText>
        </Pressable>
      ) : (
        <Button title={title} variant="danger" loading={busy} onPress={press} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.dangerButtonBorder,
    backgroundColor: colors.panelStrong,
  },
  pressed: { backgroundColor: colors.dangerButtonPressed },
});
