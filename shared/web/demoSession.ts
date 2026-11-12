/** Browser-only demo coordination. These editable flags are NOT authentication.
 * Keep credentials and personal data out of navigation and the handoff protocol.
 * This module has no React dependency so each Vite app can run independently.
 */
export const demoRoles = ["student", "supervisor", "workshop", "department"] as const;
export type DemoRole = (typeof demoRoles)[number];
export type DemoEnvironment = { readonly DEV?: boolean; readonly BASE_URL?: string; readonly [key: string]: unknown };

const ports: Record<DemoRole, string> = { student: "8080", supervisor: "5174", workshop: "5175", department: "5176" };
const sessionKeys: Record<DemoRole, string> = {
  student: "labassist.student.session",
  supervisor: "labassist.supervisor.session",
  workshop: "labassist.workshop.signedOut",
  department: "labassist.department.session",
};
const handoffPrefix = "labassist.web.demo.handoff.";
const requestType = "labassist-demo-session-request";
const responseType = "labassist-demo-session-response";
const checks = new Map<DemoRole, Promise<boolean>>();
const watched = new Set<DemoRole>();

export function isDemoRole(value: unknown): value is DemoRole {
  return demoRoles.some((role) => role === value);
}
function setting(env: DemoEnvironment, name: string) {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}
function demoMode(env: DemoEnvironment) {
  if (!env.DEV && setting(env, "VITE_DEMO_MODE") !== "true") {
    throw new Error("Local demo mode is disabled. Set VITE_DEMO_MODE=true in this app to run this backend-free preview. It does not provide real authentication.");
  }
}
function configuredUrl(value: string, name: string) {
  let url: URL;
  try { url = new URL(value, window.location.origin); }
  catch { throw new Error(`Configuration error: ${name} must be a valid application URL.`); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`Configuration error: ${name} must be an HTTP(S) URL without credentials, query parameters or a fragment.`);
  }
  return url;
}
export function applicationRoot(role: DemoRole, env: DemoEnvironment) {
  const name = `VITE_${role.toUpperCase()}_URL`;
  const value = setting(env, name);
  let url: URL;
  if (value) url = configuredUrl(value, name);
  else if (env.DEV) {
    url = new URL(window.location.origin);
    url.port = ports[role];
  } else if (role === "student") {
    // Called by the shared login, which already lives in the Student app.
    url = new URL(env.BASE_URL || "/", window.location.origin);
  } else throw new Error(`Configuration error: set ${name} in the Student login app to the ${role} application's root URL.`);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}
export function dashboardUrl(role: DemoRole, env: DemoEnvironment) {
  return new URL(role === "supervisor" ? "supervisor/dashboard" : role === "workshop" ? "dashboard" : "", applicationRoot(role, env)).href;
}
export function sharedLoginUrl(role: DemoRole, env: DemoEnvironment, signedOut = false) {
  const configured = setting(env, "VITE_LOGIN_URL");
  const student = setting(env, "VITE_STUDENT_URL");
  let url: URL;
  if (configured) url = configuredUrl(configured, "VITE_LOGIN_URL");
  else if (role === "student" || env.DEV || student) {
    url = new URL("login", applicationRoot("student", env));
  } else throw new Error("Configuration error: set VITE_LOGIN_URL to the Student app's shared /login URL (or set VITE_STUDENT_URL to its root URL).");
  url.searchParams.set("role", role);
  if (signedOut) url.searchParams.set("signedOut", "1");
  return url;
}
export function redirectToSharedLogin(role: DemoRole, env: DemoEnvironment, signedOut = false) {
  const url = sharedLoginUrl(role, env, signedOut);
  if (url.origin === window.location.origin && url.pathname === window.location.pathname) {
    throw new Error("Configuration error: the shared login points back to this application's old login route. Set VITE_LOGIN_URL to Noor's /login page in the Student app.");
  }
  window.location.replace(url.href);
}
export function hasDemoSession(role: DemoRole) {
  const raw = localStorage.getItem(sessionKeys[role]);
  if (raw === null) return false;
  try { return JSON.parse(raw) === (role === "workshop" ? false : "signed-in"); }
  catch { return false; }
}
function startDemoSession(role: DemoRole) {
  localStorage.setItem(sessionKeys[role], JSON.stringify(role === "workshop" ? false : "signed-in"));
}
function watchDemoSession(role: DemoRole, env: DemoEnvironment) {
  if (watched.has(role)) return;
  watched.add(role);
  const check = () => {
    try {
      if (hasDemoSession(role)) return;
      const login = sharedLoginUrl(role, env, true);
      if (login.origin !== window.location.origin || login.pathname !== window.location.pathname) window.location.replace(login.href);
    } catch { window.location.reload(); }
  };
  window.addEventListener("pageshow", (event) => { if (event.persisted) check(); });
  window.addEventListener("storage", (event) => { if (event.key === sessionKeys[role] || event.key === null) check(); });
}
export function endDemoSession(role: DemoRole) {
  try {
    localStorage.setItem(sessionKeys[role], JSON.stringify(role === "workshop" ? true : "signed-out"));
    localStorage.removeItem(handoffPrefix + role);
  } catch { /* Existing providers still clear their in-memory session on logout. */ }
}
export function clearPendingDemo(role: DemoRole) {
  localStorage.removeItem(handoffPrefix + role);
}
/** Invoked only after the existing demo credentials have been checked. */
export function prepareDemoSignIn(role: DemoRole, env: DemoEnvironment) {
  demoMode(env);
  const destination = dashboardUrl(role, env);
  try {
    // Allow time for the Department preview export/import flow. This is not a
    // token: only the selected role, expected origin and expiry are persisted.
    localStorage.setItem(handoffPrefix + role, JSON.stringify({ origin: new URL(destination).origin, expiresAt: Date.now() + 30 * 60_000 }));
  } catch { throw new Error("Browser storage is unavailable. Allow local storage for the demo login before continuing."); }
  return destination;
}
export function isDemoBridgeFrame() {
  return typeof window !== "undefined" && window.parent !== window && new URLSearchParams(window.location.search).get("demoBridge") === "1";
}
/** Runs only inside the hidden instance of Noor's existing /login page. */
export function installDemoBridge(env: DemoEnvironment) {
  const replies = new Map<string, object>();
  const receive = (event: MessageEvent) => {
    const data = event.data;
    if (event.source !== window.parent || data?.type !== requestType || !isDemoRole(data.role) || typeof data.id !== "string") return;
    const role: DemoRole = data.role;
    const key = `${event.origin}:${role}:${data.id}`;
    const send = (reply: object) => window.parent.postMessage(reply, event.origin);
    const cached = replies.get(key);
    if (cached) { send(cached); return; }
    let ok = false;
    let error = "";
    try {
      demoMode(env);
      if (event.origin !== applicationRoot(role, env).origin) return;
      const raw = localStorage.getItem(handoffPrefix + role);
      if (raw) {
        const pending = JSON.parse(raw);
        ok = pending?.origin === event.origin && typeof pending.expiresAt === "number" && pending.expiresAt > Date.now();
        localStorage.removeItem(handoffPrefix + role);
      }
    } catch (cause) { error = cause instanceof Error ? cause.message : "The demo handoff could not read browser storage."; }
    const reply = { type: responseType, role, id: data.id, ok, error };
    replies.set(key, reply);
    send(reply);
  };
  window.addEventListener("message", receive);
  return () => window.removeEventListener("message", receive);
}
function receiveDemoSignIn(role: DemoRole, env: DemoEnvironment) {
  return new Promise<boolean>((resolve, reject) => {
    const url = sharedLoginUrl(role, env);
    url.search = "?demoBridge=1"; // Transport mode only; no credentials or session data in URLs.
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.title = "Local demo session handoff";
    frame.setAttribute("aria-hidden", "true");
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const cleanup = () => { clearTimeout(timeout); clearInterval(retry); window.removeEventListener("message", receive); frame.remove(); };
    const receive = (event: MessageEvent) => {
      const reply = event.data;
      if (event.origin !== url.origin || event.source !== frame.contentWindow || reply?.type !== responseType || reply.id !== id || reply.role !== role) return;
      cleanup();
      if (reply.error) reject(new Error(String(reply.error)));
      else resolve(reply.ok === true);
    };
    const request = () => frame.contentWindow?.postMessage({ type: requestType, role, id }, url.origin);
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Cannot reach the shared demo login. Start the Student app, verify VITE_LOGIN_URL and application URL settings, and allow this demo's iframe/storage access. No session was created.")); }, 12_000);
    const retry = setInterval(request, 300);
    window.addEventListener("message", receive);
    frame.addEventListener("load", request);
    frame.src = url.href;
    document.body.append(frame);
  });
}
/** Before mounting destination providers, initialize their existing session flag. */
export function ensureDemoSession(role: DemoRole, env: DemoEnvironment): Promise<boolean> {
  const existing = checks.get(role);
  if (existing) return existing;
  const check = (async () => {
    demoMode(env);
    sharedLoginUrl(role, env); // Validate configuration even when an existing session is used.
    if (role !== "student" && window.location.pathname.replace(/\/$/, "").endsWith("/login")) {
      redirectToSharedLogin(role, env);
      return false;
    }
    try { if (hasDemoSession(role)) { watchDemoSession(role, env); return true; } }
    catch { throw new Error("Browser storage is unavailable. Allow local storage for this demo application."); }
    if (!(await receiveDemoSignIn(role, env))) {
      redirectToSharedLogin(role, env);
      return false;
    }
    try { startDemoSession(role); }
    catch { throw new Error("Could not save this application's demo session. Allow local storage and sign in again."); }
    watchDemoSession(role, env);
    return true;
  })();
  checks.set(role, check);
  void check.finally(() => checks.delete(role)).catch(() => {});
  return check;
}
/** No React dependency or replacement login: errors are shown before app mount. */
export function showDemoEntryError(error: unknown) {
  const panel = document.createElement("main");
  panel.setAttribute("role", "alert");
  panel.style.cssText = "max-width:640px;margin:10vh auto;padding:28px;background:#fffcf5;color:#203125;border:1px solid #bdc6b2;border-radius:18px;font:16px/1.6 system-ui";
  const title = document.createElement("h1"); title.textContent = "Demo login configuration";
  const message = document.createElement("p"); message.textContent = error instanceof Error ? error.message : "The shared demo login could not be opened.";
  const retry = document.createElement("button"); retry.textContent = "Try again"; retry.onclick = () => window.location.reload();
  panel.append(title, message, retry);
  document.getElementById("root")?.replaceChildren(panel);
}
export async function bootstrapDemoApp(role: DemoRole, env: DemoEnvironment, mount: () => void) {
  try { if (await ensureDemoSession(role, env)) mount(); }
  catch (error) { showDemoEntryError(error); }
}
