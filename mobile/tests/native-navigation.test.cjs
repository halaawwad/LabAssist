/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

test("native Back and dismissal use Expo's initialized router, preserving route mapping", () => {
  const unavailable = () => {
    throw new Error("Router not initialized");
  };
  const expo = Object.fromEntries(
    [
      "back",
      "canGoBack",
      "dismissAll",
      "canDismiss",
      "dismiss",
      "dismissTo",
      "push",
      "replace",
      "navigate",
    ].map((name) => [name, unavailable]),
  );
  const module = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/native/router.ts"), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(
    () => ({ router: expo, useRouter: () => expo }),
    module,
    module.exports,
  );
  const calls = [];
  for (const name of Object.keys(expo))
    expo[name] = (...args) => {
      calls.push([name, ...args]);
      return true;
    };
  const { router, nativeHref } = module.exports;
  assert.equal(router.canGoBack(), true);
  router.back();
  router.dismissAll();
  assert.equal(router.canDismiss(), true);
  router.dismiss(2);
  router.dismissTo("/student/settings");
  router.push("/supervisor/more/reports");
  router.replace("/native/login");
  router.navigate("/");
  assert.deepEqual(calls, [
    ["canGoBack"],
    ["back"],
    ["dismissAll"],
    ["canDismiss"],
    ["dismiss", 2],
    ["dismissTo", "/native/student/settings"],
    ["push", "/native/supervisor/reports"],
    ["replace", "/native/login"],
    ["navigate", "/native"],
  ]);
  assert.deepEqual(nativeHref({ pathname: "/student/profile", params: { section: "account" } }), {
    pathname: "/native/student/profile",
    params: { section: "account" },
  });
});
