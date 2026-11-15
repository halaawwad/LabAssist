import { useState } from "react";
import { View } from "react-native";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { useNativeSession } from "@/state/NativeSession";
import { useWorkspace } from "@/state/WorkspaceProvider";
import { useLanguage } from "@/i18n";
import { router } from "@/native/router";

export function SignOutButton() {
  const { signOut } = useNativeSession();
  const { clearError } = useWorkspace();
  const { language } = useLanguage();
  const ar = language === "ar";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 8 }}>
      {!!error && (
        <AppText tone="danger" accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Button
        title={ar ? "تسجيل الخروج" : "Log out"}
        variant="ghost"
        disabled={busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          try {
            await signOut();
            clearError();
            router.dismissAll();
            router.replace("/native/login");
          } catch {
            setError(
              ar
                ? "تعذّر حفظ تسجيل الخروج. أعد المحاولة."
                : "Could not save sign-out. Please retry.",
            );
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
