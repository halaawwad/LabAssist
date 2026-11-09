export type Portal = "student" | "supervisor" | "workshop";
export const ports: Record<Portal, number> = { student: 8080, supervisor: 5174, workshop: 5175 };
export function hostFromManifest(hostUri?: string) {
  try {
    return new URL(hostUri?.includes("://") ? hostUri : `http://${hostUri || "localhost"}`)
      .hostname;
  } catch {
    return "localhost";
  }
}
export function portalUrl(
  portal: Portal,
  path: string,
  host: string,
  shared?: Partial<Record<Portal, string>>,
) {
  const origin = shared?.[portal] || `http://${host}:${ports[portal]}`;
  return new URL(path.startsWith("/") ? path : "/" + path, origin).href;
}
export function targetForRoute(route: string[]) {
  const first = route[0];
  const portal: Portal = first === "supervisor" || first === "workshop" ? first : "student";
  let rest = route.slice(
    first === "student" || first === "supervisor" || first === "workshop" ? 1 : 0,
  );
  if (rest[0] === "more") rest = rest.slice(1);
  let path = "/" + rest.join("/");
  if (portal === "supervisor")
    path = rest[0] === "login" ? "/login" : "/supervisor/" + (rest.join("/") || "dashboard");
  else if (portal === "workshop" && path === "/") path = "/dashboard";
  else if (path === "/home") path = "/";
  return { portal, path };
}
export type WebsiteProps = { portal?: Portal; path?: string };
export function targetFromLink(url: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const role = parsed.searchParams.get("portal");
    if (role === "supervisor" || role === "workshop" || role === "student")
      return targetForRoute([role]);
    const route = parsed.pathname
      .replace(/^\/--\//, "/")
      .split("/")
      .filter(Boolean);
    if (["supervisor", "workshop", "student"].includes(route[0])) return targetForRoute(route);
  } catch {
    /* Ignore unrelated external links. */
  }
  return null;
}
