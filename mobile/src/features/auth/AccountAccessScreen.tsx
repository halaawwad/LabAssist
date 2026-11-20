import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { AppText, Button, TextField, LanguageToggle } from "@/components";
import { LabAssistBrand } from "@/components/LabAssistBrand";
import { useLanguage } from "@/i18n";
import { authClient, authMessage } from "./client";
export function AccountAccessScreen({
  mode,
}: {
  mode: "activate" | "forgot-password" | "reset-password";
}) {
  const { language } = useLanguage(),
    ar = language === "ar",
    copy = (en: string, arabic: string) => (ar ? arabic : en);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const lock = useRef(false);
  const title =
    mode === "activate"
      ? copy("Activate your account", "تفعيل حسابك")
      : mode === "forgot-password"
        ? copy("Forgot password", "استعادة كلمة المرور")
        : copy("Choose a new password", "اختر كلمة مرور جديدة");
  async function submit() {
    if (lock.current) return;
    setError("");
    if (mode !== "reset-password" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(copy("Enter your university email.", "أدخل إيميلك الجامعي."));
      return;
    }
    if (mode !== "forgot-password" && !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      setError(
        copy(
          "This link is incomplete. Open the full link from your email.",
          "الرابط غير مكتمل. افتح الرابط كاملًا من بريدك.",
        ),
      );
      return;
    }
    if (
      mode !== "forgot-password" &&
      (password.length < 12 || password.length > 128 || password !== confirm)
    ) {
      setError(
        copy(
          "Use 12–128 characters and match both passwords.",
          "استخدم 12–128 حرفًا وتأكد من تطابق كلمتي المرور.",
        ),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await authClient.publicRequest(
        "/auth/" + mode,
        mode === "forgot-password"
          ? { email: email.trim().toLowerCase() }
          : mode === "activate"
            ? { email: email.trim().toLowerCase(), token, password }
            : { token, password },
      );
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch (e) {
      setError(authMessage(e, ar));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f0" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <LabAssistBrand />
            <LanguageToggle compact />
          </View>
          <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
            <AppText variant="title">{title}</AppText>
            {done ? (
              <>
                <AppText accessibilityRole="alert">
                  {mode === "forgot-password"
                    ? copy(
                        "If an eligible account exists, a reset link will be sent to its email.",
                        "إذا كان الحساب مؤهلًا، سيصل رابط الاستعادة إلى بريده.",
                      )
                    : mode === "activate"
                      ? copy(
                          "Your account is active. You can now sign in.",
                          "تم تفعيل حسابك. يمكنك تسجيل الدخول الآن.",
                        )
                      : copy(
                          "Password updated. Sign in with your new password.",
                          "تم تحديث كلمة المرور. سجل الدخول بالكلمة الجديدة.",
                        )}
                </AppText>
                <Button
                  title={copy("Back to login", "العودة لتسجيل الدخول")}
                  onPress={() => router.replace("/native/login")}
                />
              </>
            ) : (
              <>
                {mode !== "reset-password" && (
                  <TextField
                    label={copy("University email", "الإيميل الجامعي")}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    editable={!busy}
                  />
                )}
                {mode !== "forgot-password" && (
                  <>
                    <TextField
                      label={copy("New password", "كلمة المرور الجديدة")}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!visible}
                      autoCapitalize="none"
                      autoComplete="new-password"
                      editable={!busy}
                    />
                    <TextField
                      label={copy("Confirm password", "تأكيد كلمة المرور")}
                      value={confirm}
                      onChangeText={setConfirm}
                      secureTextEntry={!visible}
                      autoCapitalize="none"
                      editable={!busy}
                    />
                    <Button
                      title={
                        visible
                          ? copy("Hide passwords", "إخفاء كلمات المرور")
                          : copy("Show passwords", "إظهار كلمات المرور")
                      }
                      variant="ghost"
                      onPress={() => setVisible(!visible)}
                    />
                    <AppText variant="caption">
                      {copy("12–128 characters.", "من 12 إلى 128 حرفًا.")}
                    </AppText>
                  </>
                )}
                {!!error && (
                  <AppText tone="danger" accessibilityRole="alert">
                    {error}
                  </AppText>
                )}
                <Button
                  title={
                    mode === "forgot-password"
                      ? copy("Send reset link", "إرسال رابط الاستعادة")
                      : copy("Save", "حفظ")
                  }
                  onPress={() => void submit()}
                  loading={busy}
                />
                <Button
                  title={copy("Back to login", "العودة لتسجيل الدخول")}
                  variant="ghost"
                  onPress={() => router.replace("/native/login")}
                  disabled={busy}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
