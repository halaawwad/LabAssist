import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { LabAssistBrand } from "../../../../shared/web/LabAssistBrand";
import { ensureDemoSession } from "../../../../shared/web/demoSession";

/** The login (including its hidden demo handoff) always stays public. */
export function StudentDemoSession({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const publicPage = path.replace(/\/$/, "") === "/login";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (publicPage) return;
    let current = true;
    setReady(false);
    setError("");
    void ensureDemoSession("student", import.meta.env).then((allowed) => {
      if (current) setReady(allowed);
    }).catch((cause: unknown) => {
      if (current) setError(cause instanceof Error ? cause.message : "The demo session could not be opened.");
    });
    return () => { current = false; };
  }, [publicPage]);
  if (publicPage || ready) return children;
  return (
    <main className="mx-auto my-16 max-w-xl rounded-2xl bg-card p-8 text-foreground" role={error ? "alert" : "status"}>
      <LabAssistBrand />
      <h1 className="text-xl font-bold">{error ? "Demo login configuration" : "Opening your demo workspace…"}</h1>
      {error && <><p className="my-4">{error}</p><button onClick={() => window.location.reload()}>Try again</button></>}
    </main>
  );
}
