import { View } from "react-native";
import { AppText, Button } from "@/components";
import { useCopy } from "@/components/MobileKit";
import type { LoadStatus } from "@/lib/market/useMarketData";
export function MarketState({
  status,
  message,
  retry,
}: {
  status: LoadStatus;
  message: string;
  retry: () => void;
}) {
  const t = useCopy();
  if (status === "ready" || status === "idle") return null;
  return (
    <View style={{ gap: 8, padding: 12 }} accessibilityLiveRegion="polite">
      <AppText>
        {status === "loading"
          ? t("Loading…", "جارٍ التحميل…")
          : status === "session"
            ? t(
                "Sign in with a LabAssist session to see live data.",
                "سجّل الدخول بحساب LabAssist لعرض البيانات المباشرة.",
              )
            : status === "unconfigured"
              ? t("API address is not configured.", "عنوان واجهة البيانات غير مضبوط.")
              : message}
      </AppText>
      {status !== "loading" && (
        <Button title={t("Retry", "إعادة المحاولة")} variant="soft" onPress={retry} />
      )}
    </View>
  );
}
export function More({
  next,
  loading,
  error,
  load,
  label,
}: {
  next: string | null;
  loading: boolean;
  error: string;
  load: () => void;
  label?: string;
}) {
  const t = useCopy();
  return (
    <View style={{ gap: 8 }}>
      {!!error && <AppText tone="danger">{error}</AppText>}
      {!!next && (
        <Button
          title={loading ? t("Loading…", "جارٍ التحميل…") : t("Load more", "عرض المزيد")}
          accessibilityLabel={
            label
              ? loading
                ? t(`Loading more ${label}`, `جارٍ تحميل المزيد: ${label}`)
                : t(`Load more ${label}`, `عرض المزيد: ${label}`)
              : undefined
          }
          disabled={loading}
          variant="soft"
          onPress={load}
        />
      )}
    </View>
  );
}
