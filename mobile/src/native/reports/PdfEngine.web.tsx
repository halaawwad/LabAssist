import { useEffect, useRef, useState } from "react";
import { reportEngineHTML } from "./reportEngine.generated";
import type { EngineProps, EngineReply } from "./pdfTypes";
export default function PdfEngine({ request, onResult }: EngineProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow || event.data?.channel !== "labassist-report")
        return;
      const reply = event.data as EngineReply;
      if (reply.type === "ready") setReady(true);
      else onResult(reply);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onResult]);
  useEffect(() => {
    if (ready && request)
      ref.current?.contentWindow?.postMessage({ type: "generate", ...request }, "*");
  }, [ready, request]);
  return (
    <iframe
      ref={ref}
      title="Report PDF renderer"
      srcDoc={reportEngineHTML}
      sandbox="allow-scripts allow-same-origin"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
        border: 0,
      }}
    />
  );
}
