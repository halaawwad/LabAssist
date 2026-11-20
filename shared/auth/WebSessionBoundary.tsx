import { useEffect, useState, type ReactNode } from "react";
import { apiMode, matchesRole, webClient, webAuthMessage, type WebRole } from "./web-session";
type Environment = Parameters<typeof webClient>[0];
export function WebSessionBoundary({
  role,
  env,
  children,
}: {
  role: WebRole;
  env: Environment;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!apiMode(env)) return;
    let live = true;
    const client = webClient(env);
    async function validate() {
      try {
        let account = client.account;
        if (account) account = await client.me();
        else account = await client.restore();
        if (!live) return;
        if (!matchesRole(account, role)) {
          window.location.replace("/login");
          return;
        }
        setReady(true);
      } catch (e) {
        if (!live) return;
        if ((e as { status?: number })?.status === 401) {
          window.location.replace("/login");
          return;
        }
        setReady(false);
        setError(webAuthMessage(e));
      }
    }
    void validate();
    const onFocus = () => {
      void validate();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [role, env, attempt]);
  if (!apiMode(env) || ready) return children;
  return (
    <main
      style={{
        maxWidth: 600,
        margin: "10vh auto",
        padding: 28,
        color: "#293925",
        background: "#f5f7f0",
        borderRadius: 24,
      }}
    >
      <h1>LabAssist</h1>
      <p role={error ? "alert" : "status"}>{error || "Checking your session…"}</p>
      {error && (
        <>
          <button
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            Retry
          </button>
          <button
            onClick={async () => {
              await webClient(env).logout();
              window.location.replace("/login");
            }}
          >
            Log out
          </button>
        </>
      )}
    </main>
  );
}
