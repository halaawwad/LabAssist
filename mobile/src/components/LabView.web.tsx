import { useEffect, useMemo, useRef, useState } from "react";
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
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(
    () =>
      labHTML.replace(
        "<body>",
        '<body><script>window.ReactNativeWebView={postMessage:function(data){parent.postMessage({channel:"labassist-model",data:data},"*")}};<\/script>',
      ),
    [],
  );
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || event.data?.channel !== "labassist-model")
        return;
      try {
        if (JSON.parse(event.data.data).type === "ready") setReady(true);
      } catch {
        /* Ignore non-viewer messages. */
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (ready)
      ref.current?.contentWindow?.postMessage(JSON.stringify({ type: "scene", nodes, wires }), "*");
  }, [ready, nodes, wires]);
  return (
    <iframe
      ref={ref}
      title="Interactive component model"
      srcDoc={html}
      sandbox="allow-scripts"
      style={{
        width: "100%",
        height,
        border: 0,
        borderRadius: 22,
        background: "#eef1e9",
        display: "block",
      }}
    />
  );
}
