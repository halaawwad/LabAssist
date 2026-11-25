import { afterEach, expect, it, vi } from "vitest";
import { SessionClient } from "../../../shared/auth/session-client";
import {
  apiMode,
  homePath,
  matchesRole,
  portalUrl,
  roleCode,
  webAuthMessage,
  webClient,
} from "../../../shared/auth/web-session";
const account = {
  id: "test",
  role: "STUDENT",
  status: "ACTIVE",
  fullName: "Test",
  email: "s12345678@stu.najah.edu",
} as const;
const response = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
it("rotates one stored refresh for parallel protected requests and clears it on logout", async () => {
  let saved: string | null = null,
    rotations = 0;
  const store = {
    read: async () => saved,
    write: async (v: string) => {
      saved = v;
    },
    clear: async () => {
      saved = null;
    },
  };
  const transport = vi.fn(async (url: string, options: RequestInit) => {
    if (url.endsWith("/login"))
      return response(201, { account, accessToken: "old", refreshToken: "first" });
    if (url.endsWith("/refresh")) {
      rotations++;
      await new Promise((r) => setTimeout(r, 5));
      return response(201, { account, accessToken: "new", refreshToken: "second" });
    }
    if (url.endsWith("/logout")) return response(201, {});
    return response(
      (options.headers as Record<string, string>).Authorization === "Bearer new" ? 200 : 401,
      { ok: true },
    );
  });
  const c = new SessionClient("http://api.test", store, transport);
  await c.login("STUDENT", account.email, "example");
  expect(saved).toBe("first");
  await Promise.all([c.authorizedRequest("/protected"), c.authorizedRequest("/protected")]);
  expect(rotations).toBe(1);
  expect(saved).toBe("second");
  await c.logout();
  expect(saved).toBeNull();
  expect(c.account).toBeNull();
});
it("preserves a refresh on network failure and clears it only on explicit rejection", async () => {
  let saved: string | null = "existing",
    offline = true;
  const c = new SessionClient(
    "http://api.test",
    {
      read: async () => saved,
      write: async (v) => {
        saved = v;
      },
      clear: async () => {
        saved = null;
      },
    },
    async () => {
      if (offline) throw Error("offline");
      return response(401, { requestId: "unsafe", detail: "private" });
    },
  );
  await expect(c.restore()).rejects.toMatchObject({ status: 0 });
  expect(saved).toBe("existing");
  offline = false;
  expect(await c.restore()).toBeNull();
  expect(saved).toBeNull();
});
it("never accepts a malformed session or replays an ambiguous mutation", async () => {
  let saved: string | null = null;
  const store = {
    read: async () => saved,
    write: async (v: string) => {
      saved = v;
    },
    clear: async () => {
      saved = null;
    },
  };
  const bad = new SessionClient("http://api.test", store, async () => response(201, { account }));
  await expect(bad.login("STUDENT", account.email, "example")).rejects.toMatchObject({
    status: 401,
  });
  expect(saved).toBeNull();
  const transport = vi.fn(async (url: string) => {
    if (url.endsWith("/login"))
      return response(201, { account, accessToken: "access", refreshToken: "refresh" });
    throw Error("offline");
  });
  const c = new SessionClient("http://api.test", store, transport);
  await c.login("STUDENT", account.email, "example");
  await expect(c.authorizedRequest("/accounts", "POST", {})).rejects.toMatchObject({ status: 0 });
  expect(transport).toHaveBeenCalledTimes(2);
});
it("requires explicit production role destinations and rejects unsafe URLs", () => {
  expect(apiMode({ VITE_AUTH_MODE: "demo" })).toBe(false);
  expect(apiMode({})).toBe(true);
  for (const role of ["student", "supervisor", "workshop", "department"] as const) {
    expect(matchesRole({ ...account, role: roleCode[role] }, role)).toBe(true);
    expect(matchesRole(null, role)).toBe(false);
    expect(() => portalUrl(role, { DEV: false })).toThrow();
    expect(portalUrl(role, { DEV: true })).toContain("/login");
    expect(homePath(role)).toBeTruthy();
  }
  expect(() => portalUrl("student", { VITE_STUDENT_URL: "javascript:alert(1)" })).toThrow();
  expect(() =>
    portalUrl("student", { VITE_STUDENT_URL: "https://user:pass@example.edu" }),
  ).toThrow();
  expect(
    portalUrl("student", { VITE_STUDENT_URL: "https://example.edu/student" }, "activate"),
  ).toBe("https://example.edu/student/activate");
  for (const status of [0, 400, 401, 429, 500])
    for (const ar of [false, true])
      expect(webAuthMessage({ status }, ar)).not.toContain("undefined");
});
it("web storage persists only refresh material and removes it on logout", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      response(
        201,
        url.endsWith("/login")
          ? { account, accessToken: "memory-access", refreshToken: "stored-refresh" }
          : { ok: true },
      ),
    ),
  );
  const c = webClient({ VITE_API_URL: "https://web-store.test/v1" });
  await c.login("STUDENT", account.email, "not-persisted");
  expect(sessionStorage.getItem("labassist.web.refresh.v1")).toBe("stored-refresh");
  expect(JSON.stringify(sessionStorage)).not.toContain("memory-access");
  expect(JSON.stringify(sessionStorage)).not.toContain("not-persisted");
  await c.logout();
  expect(sessionStorage.getItem("labassist.web.refresh.v1")).toBeNull();
});
