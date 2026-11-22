/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function policy() {
  const module = { exports: {} };
  const source = fs.readFileSync(
    path.join(__dirname, "../../../shared/auth/web-session.ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    URL,
    Map,
    window: { location: { origin: "https://supervisor.example.edu" } },
    require: () => ({ SessionClient: class {} }),
  });
  return module.exports;
}

test("every production role destination must be explicitly configured", () => {
  const { portalUrl } = policy();
  for (const role of ["student", "supervisor", "workshop", "department"]) {
    assert.throws(() => portalUrl(role, { DEV: false }), /Configure the portal URL/);
  }
});

test("role links reject executable URLs and embedded credentials", () => {
  const { portalUrl } = policy();
  for (const url of [
    "javascript:alert(1)",
    "file:///tmp/login",
    "https://user:password@example.edu",
  ]) {
    assert.throws(() => portalUrl("student", { VITE_STUDENT_URL: url }), /Invalid portal URL/);
  }
  assert.equal(
    portalUrl("student", { VITE_STUDENT_URL: "https://students.example.edu/" }),
    "https://students.example.edu/login",
  );
});

test("mock mode is explicit and the signed-in account must match its portal role", () => {
  const { apiMode, matchesRole } = policy();
  assert.equal(apiMode({}), true);
  assert.equal(apiMode({ VITE_AUTH_MODE: "demo" }), false);
  assert.equal(matchesRole(null, "student"), false);
  assert.equal(matchesRole({ role: "SUPERVISOR" }, "student"), false);
  assert.equal(matchesRole({ role: "SUPERVISOR" }, "supervisor"), true);
  assert.equal(matchesRole({ role: "DEPARTMENT_HEAD" }, "department"), true);
  assert.equal(matchesRole({ role: "STUDENT" }, "department"), false);
});
