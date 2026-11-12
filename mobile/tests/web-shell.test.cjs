/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const moduleUnderTest = { exports: {} };
const js = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, "../src/web/targets.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
new Function("exports", js)(moduleUnderTest.exports);
const { targetForRoute, portalUrl, hostFromManifest } = moduleUnderTest.exports;
test("shared previews use each portal's HTTPS origin without falling back to the private network", () => {
  const shared = {
    student: "https://student-example.trycloudflare.com",
    supervisor: "https://supervisor-example.trycloudflare.com",
    workshop: "https://workshop-example.trycloudflare.com",
  };
  assert.equal(
    portalUrl("supervisor", "/supervisor/dashboard", "private-host", shared),
    shared.supervisor + "/supervisor/dashboard",
  );
  assert.equal(portalUrl("workshop", "/map", "private-host", shared), shared.workshop + "/map");
  assert.equal(portalUrl("student", "/", "private-host", shared), shared.student + "/");
});
test("QR links select the portal on cold launch and when Expo Go is already open", () => {
  const { targetFromLink } = moduleUnderTest.exports;
  assert.deepEqual(
    targetFromLink("exp://192.168.1.8:8081/--/?portal=supervisor"),
    targetForRoute(["supervisor"]),
  );
  assert.deepEqual(
    targetFromLink("exp://192.168.1.8:8081/--/?portal=workshop"),
    targetForRoute(["workshop"]),
  );
  assert.deepEqual(
    targetFromLink("exp://192.168.1.8:8081/--/supervisor/dashboard"),
    targetForRoute(["supervisor", "dashboard"]),
  );
  assert.equal(targetFromLink(null), null);
  assert.equal(targetFromLink("exp://192.168.1.8:8081"), null);
});
test("student routes map to the original complete web app, including prior More links", () => {
  assert.deepEqual(targetForRoute(["student", "more", "catalog"]), {
    portal: "student",
    path: "/catalog",
  });
  assert.deepEqual(targetForRoute(["student", "reports"]), { portal: "student", path: "/reports" });
  assert.deepEqual(targetForRoute([]), { portal: "student", path: "/" });
});
test("supervisor and workshop retain their original distinct URL routes", () => {
  assert.deepEqual(targetForRoute(["supervisor", "dashboard"]), {
    portal: "supervisor",
    path: "/supervisor/dashboard",
  });
  assert.deepEqual(targetForRoute(["supervisor", "login"]), {
    portal: "supervisor",
    path: "/login",
  });
  assert.deepEqual(targetForRoute(["workshop", "map"]), { portal: "workshop", path: "/map" });
});
test("device URLs use the Expo computer host and actual original portal ports", () => {
  const host = hostFromManifest("192.168.1.8:8081");
  assert.equal(host, "192.168.1.8");
  assert.equal(portalUrl("student", "/reports", host), "http://192.168.1.8:8080/reports");
  assert.equal(portalUrl("supervisor", "/login", host), "http://192.168.1.8:5174/login");
  assert.equal(portalUrl("workshop", "/dashboard", host), "http://192.168.1.8:5175/dashboard");
});
