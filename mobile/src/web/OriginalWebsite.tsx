import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { hostFromManifest, portalUrl, ports, type WebsiteProps } from "./targets";
import { websiteBridge } from "./bridge";

export default function OriginalWebsite({ portal = "student", path = "/" }: WebsiteProps) {
  const host = hostFromManifest(Constants.expoConfig?.hostUri);
  const shared = Constants.expoConfig?.extra?.sharedPortals;
  const uri = portalUrl(portal, path, host, shared);
  const source = useMemo(() => ({ uri }), [uri]);
  const origins = useMemo(
    () =>
      Object.keys(ports).map(
        (role) => new URL(portalUrl(role as keyof typeof ports, "/", host, shared)).origin,
      ),
    [host, shared],
  );
  const ref = useRef<WebView<unknown>>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const trusted = (url: string) => {
    try {
      return origins.includes(new URL(url).origin);
    } catch {
      return false;
    }
  };
  async function message(event: WebViewMessageEvent) {
    if (!trusted(event.nativeEvent.url)) return;
    try {
      const value = JSON.parse(event.nativeEvent.data);
      if (value.channel !== "labassist.web") return;
      if (value.type === "download" && typeof value.data === "string") {
        setSaving(true);
        const name = String(value.name || "LabAssist-file")
          .replace(/[\\/:*?"<>|]/g, "-")
          .slice(0, 160);
        const file = new File(Paths.cache, `${Date.now()}-${name}`);
        await file.create({ overwrite: true });
        await file.write(value.data, { encoding: "base64" });
        if (await Sharing.isAvailableAsync())
          await Sharing.shareAsync(file.uri, {
            mimeType: value.mime || "application/octet-stream",
            dialogTitle: name,
          });
        else Alert.alert("LabAssist", "المشاركة غير متاحة على هذا الجهاز.");
      } else if (value.type === "print" && typeof value.html === "string") {
        await Print.printAsync({ html: value.html });
      } else if (value.type === "error") Alert.alert("LabAssist", String(value.message));
    } catch {
      Alert.alert("LabAssist", "تعذر تجهيز الملف. يرجى إعادة المحاولة.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      {error ? (
        <View style={s.error}>
          <Text style={s.title}>تعذر فتح الواجهة الأصلية</Text>
          <Text style={s.body}>
            تأكدي أن الكمبيوتر والآيفون على نفس الشبكة وأن سيرفر الويب شغّال.
          </Text>
          <Pressable accessibilityRole="button" style={s.button} onPress={() => setError(false)}>
            <Text style={s.buttonText}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      ) : (
        <WebView<unknown>
          key={uri}
          ref={ref}
          source={source}
          style={s.web}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          sharedCookiesEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          setSupportMultipleWindows={false}
          startInLoadingState
          renderLoading={() => (
            <View style={s.loading}>
              <ActivityIndicator size="large" color="#526443" />
            </View>
          )}
          originWhitelist={["http://*", "https://*", "about:blank", "blob:*", "data:*"]}
          injectedJavaScriptBeforeContentLoaded={websiteBridge}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          onMessage={message}
          onError={() => setError(true)}
          onShouldStartLoadWithRequest={(request) => {
            if (
              request.isTopFrame === false ||
              trusted(request.url) ||
              /^(about:blank|blob:|data:)/.test(request.url)
            )
              return true;
            Linking.openURL(request.url).catch(() => Alert.alert("LabAssist", "تعذر فتح الرابط."));
            return false;
          }}
          onOpenWindow={(event) => {
            if (trusted(event.nativeEvent.targetUrl))
              ref.current?.injectJavaScript(
                `location.href=${JSON.stringify(event.nativeEvent.targetUrl)};true;`,
              );
            else
              Linking.openURL(event.nativeEvent.targetUrl).catch(() =>
                Alert.alert("LabAssist", "تعذر فتح الرابط."),
              );
          }}
        />
      )}
      {saving && (
        <View style={s.loading}>
          <ActivityIndicator size="large" color="#526443" />
        </View>
      )}
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eee8dc" },
  web: { flex: 1, backgroundColor: "#eee8dc" },
  loading: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(238,232,220,.65)",
  },
  error: { flex: 1, padding: 28, gap: 18, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", textAlign: "right", color: "#0d1528" },
  body: { fontSize: 16, lineHeight: 26, textAlign: "right", color: "#526443" },
  button: { padding: 16, borderRadius: 16, backgroundColor: "#526443" },
  buttonText: { color: "white", textAlign: "center", fontSize: 16 },
});
