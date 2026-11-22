import { SessionClient, type Account } from "./session-client";
export type WebRole = "student" | "supervisor" | "workshop" | "department";
type Environment = { readonly DEV?: boolean; readonly [key: string]: unknown };
const clients = new Map<string, SessionClient>();
export const apiMode = (env: Environment) => env["VITE_AUTH_MODE"] !== "demo";
export const roleCode = {
  student: "STUDENT",
  supervisor: "SUPERVISOR",
  workshop: "WORKSHOP_MANAGER",
  department: "DEPARTMENT_HEAD",
} as const;
export function webClient(env: Environment) {
  const url = String(env["VITE_API_URL"] || (env.DEV ? "http://127.0.0.1:3100/v1" : "")).replace(
    /\/$/,
    "",
  );
  if (!clients.has(url))
    clients.set(
      url,
      new SessionClient(url, {
        read: async () => sessionStorage.getItem("labassist.web.refresh.v1"),
        write: async (token) => {
          sessionStorage.setItem("labassist.web.refresh.v1", token);
        },
        clear: async () => {
          sessionStorage.removeItem("labassist.web.refresh.v1");
        },
      }),
    );
  return clients.get(url)!;
}
export function portalUrl(role: WebRole, env: Environment, path = "login") {
  const configured = env[`VITE_${role.toUpperCase()}_URL`];
  const base = new URL(
    typeof configured === "string" && configured ? configured : window.location.origin,
  );
  if (!configured) {
    if (!env.DEV) throw Error("Configure the portal URL");
    base.port = { student: "8080", supervisor: "5174", workshop: "5175", department: "5176" }[role];
  }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
    throw Error("Invalid portal URL");
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return new URL(path, base).href;
}
export const homePath = (role: WebRole) =>
  role === "student" || role === "department"
    ? "/"
    : role === "supervisor"
      ? "/supervisor/dashboard"
      : "/dashboard";
export const matchesRole = (account: Account | null, role: WebRole) =>
  account?.role === roleCode[role];
export function webAuthMessage(error: unknown, ar = false) {
  const status = (error as { status?: number })?.status;
  return status === 401
    ? ar
      ? "تأكد من بيانات الدخول والدور وتفعيل حسابك."
      : "Check your credentials, selected role and account activation."
    : status === 400
      ? ar
        ? "تأكد من البيانات؛ الرابط قد يكون مستخدمًا أو منتهيًا."
        : "Check the details. This link may be expired or already used."
      : status === 429
        ? ar
          ? "محاولات كثيرة. انتظر قليلًا."
          : "Too many attempts. Wait and try again."
        : status === 0
          ? ar
            ? "تعذر الاتصال بالخادم. أعد المحاولة."
            : "Cannot reach the server. Please retry."
          : ar
            ? "تعذر إكمال العملية. أعد المحاولة."
            : "Could not complete the request. Please retry.";
}
export async function logoutWeb(env: Environment) {
  await webClient(env).logout();
  window.location.replace("/login");
}
