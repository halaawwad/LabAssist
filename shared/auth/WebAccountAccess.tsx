import { useRef, useState } from "react";
import { webClient, webAuthMessage } from "./web-session";
export function WebAccountAccess({ mode: explicit }: { mode?: "activate" | "reset-password" }) {
  const params = new URLSearchParams(window.location.search),
    token = params.get("token") || "";
  const mode = explicit || params.get("access") || "forgot-password";
  const [ar, setAr] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const lock = useRef(false);
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    if (
      mode !== "forgot-password" &&
      (!/^[A-Za-z0-9_-]{43}$/.test(token) ||
        password.length < 12 ||
        password.length > 128 ||
        password !== confirm)
    ) {
      setError(
        t(
          "Use the full email link and matching passwords of 12–128 characters.",
          "استخدم رابط البريد كاملًا وكلمتي مرور متطابقتين من 12 إلى 128 حرفًا.",
        ),
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await webClient(import.meta.env).publicRequest(
        "/auth/" + mode,
        mode === "forgot-password"
          ? { email: email.trim().toLowerCase() }
          : mode === "activate"
            ? { token, email: email.trim().toLowerCase(), password }
            : { token, password },
      );
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch (cause) {
      setError(webAuthMessage(cause, ar));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <main
      dir={ar ? "rtl" : "ltr"}
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: "#edf1e7",
        color: "#293925",
        padding: 24,
        boxSizing: "border-box",
        fontFamily: "system-ui",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#ffffffed",
          padding: 28,
          borderRadius: 26,
          boxShadow: "0 16px 50px #35452b16",
          boxSizing: "border-box",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>LabAssist</strong>
          <button type="button" onClick={() => setAr(!ar)}>
            {ar ? "English" : "العربية"}
          </button>
        </header>
        <h1>
          {mode === "activate"
            ? t("Activate your account", "تفعيل حسابك")
            : mode === "reset-password"
              ? t("Choose a new password", "اختر كلمة مرور جديدة")
              : t("Forgot password", "استعادة كلمة المرور")}
        </h1>
        {done ? (
          <p role="status">
            {mode === "forgot-password"
              ? t(
                  "If an eligible account exists, a reset link will be sent to its email.",
                  "إذا كان الحساب مؤهلًا، سيصل رابط الاستعادة إلى بريده.",
                )
              : t("Saved. You can now sign in.", "تم الحفظ. يمكنك تسجيل الدخول الآن.")}
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            {mode !== "reset-password" && (
              <label>
                {t("University email", "الإيميل الجامعي")}
                <input
                  aria-label={t("University email", "الإيميل الجامعي")}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  required
                  style={input}
                />
              </label>
            )}
            {mode !== "forgot-password" && (
              <>
                <label>
                  {t("New password", "كلمة المرور الجديدة")}
                  <input
                    aria-label={t("New password", "كلمة المرور الجديدة")}
                    type={visible ? "text" : "password"}
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    required
                    style={input}
                  />
                </label>
                <label>
                  {t("Confirm password", "تأكيد كلمة المرور")}
                  <input
                    aria-label={t("Confirm password", "تأكيد كلمة المرور")}
                    type={visible ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={busy}
                    required
                    style={input}
                  />
                </label>
                <button type="button" onClick={() => setVisible(!visible)}>
                  {visible
                    ? t("Hide passwords", "إخفاء كلمات المرور")
                    : t("Show passwords", "إظهار كلمات المرور")}
                </button>
              </>
            )}
            {error && (
              <p role="alert" style={{ color: "#a02e2e" }}>
                {error}
              </p>
            )}
            <button
              disabled={busy}
              style={{ ...input, background: "#526443", color: "white", cursor: "pointer" }}
            >
              {busy
                ? t("Saving…", "جارٍ الحفظ…")
                : mode === "forgot-password"
                  ? t("Send reset link", "إرسال رابط الاستعادة")
                  : t("Save", "حفظ")}
            </button>
          </form>
        )}
        <a href="/login" style={{ display: "block", marginTop: 20, color: "#526443" }}>
          {t("Back to login", "العودة لتسجيل الدخول")}
        </a>
      </section>
    </main>
  );
}
const input = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #c5cfb9",
  borderRadius: 12,
  padding: 13,
  fontSize: 16,
  marginTop: 7,
};
