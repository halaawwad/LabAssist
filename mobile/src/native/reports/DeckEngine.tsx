import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import WebView from "react-native-webview";
import { deckEngineHTML } from "./deckEngine.generated";
import type { DeckEngineProps as EngineProps, DeckEngineReply as EngineReply } from "./deckEngineTypes";
export default function PdfEngine({ request, onResult }: EngineProps) {
  const ref = useRef<WebView<unknown>>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready && request)
      ref.current?.postMessage(JSON.stringify({ type: "generate", ...request }));
  }, [ready, request]);
  return (
    <View
      style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
      pointerEvents="none"
    >
      <WebView
        ref={ref}
        source={{ html: deckEngineHTML, baseUrl: "https://report.labassist.local" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        onMessage={(e) => {
          try {
            const data = JSON.parse(e.nativeEvent.data) as EngineReply;
            if (data.type === "ready") setReady(true);
            else onResult(data);
          } catch {
            /* Ignore incomplete bridge messages. */
          }
        }}
      />
    </View>
  );
}
