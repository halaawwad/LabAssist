import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { AppText } from "@/components";
import { colors } from "@/theme";
import { labHTML } from "@/lib/labViewer.generated";
import type { Circuit } from "@/domain/workspace";
type Nodes = Circuit["versions"][number]["nodes"];
type Wires = Circuit["versions"][number]["wires"];
export function LabView({
  nodes,
  wires = [],
  height = 320,
}: {
  nodes: Nodes;
  wires?: Wires;
  height?: number;
}) {
  const ref = useRef<WebView<unknown>>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (ready) ref.current?.postMessage(JSON.stringify({ type: "scene", nodes, wires }));
  }, [nodes, wires, ready]);
  return (
    <View
      style={{ height, borderRadius: 22, overflow: "hidden", backgroundColor: colors.primaryWash }}
    >
      {error ? (
        <AppText tone="danger">{error}</AppText>
      ) : (
        <WebView<unknown>
          ref={ref}
          source={{ html: labHTML, baseUrl: "https://labassist.invalid/" }}
          originWhitelist={["https://labassist.invalid"]}
          onShouldStartLoadWithRequest={(request) =>
            request.url === "about:blank" || request.url === "https://labassist.invalid/"
          }
          javaScriptEnabled
          scrollEnabled={false}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === "ready") setReady(true);
              if (message.type === "error") setError(message.message);
            } catch {
              setError("Unable to read the 3D viewer response.");
            }
          }}
          onError={() => setError("Could not load the 3D viewer.")}
          style={{ backgroundColor: "transparent" }}
        />
      )}
    </View>
  );
}
