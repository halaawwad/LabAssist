const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const code = ts.transpileModule(fs.readFileSync("src/lib/market/client.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = { exports: {} };
vm.runInThisContext(`(function(exports,require,module){${code}\n})`)(mod.exports, require, mod);
const { createMarketClient, SessionUnavailableError, ApiNotConfiguredError } = mod.exports;
const session = {
  getAccessToken: async () => "test-token",
  getCurrentUser: async () => ({ id: "test", role: "STUDENT" }),
};
test("client requires an API address and session without sending requests", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
  };
  await assert.rejects(
    createMarketClient({ baseUrl: null, session, fetchImpl }).parts({}),
    ApiNotConfiguredError,
  );
  await assert.rejects(
    createMarketClient({
      baseUrl: "https://example.test",
      session: { ...session, getAccessToken: async () => null },
      fetchImpl,
    }).parts({}),
    SessionUnavailableError,
  );
  assert.equal(calls, 0);
});
test("client sends the session token and paged query, surfaces API errors and reports unauthorized", async () => {
  let called;
  let unauthorized = 0;
  const fetchImpl = async (url, init) => {
    called = { url, init };
    return { ok: true, json: async () => ({ items: [], nextCursor: "next" }) };
  };
  const client = createMarketClient({ baseUrl: "https://example.test/", session, fetchImpl });
  assert.equal((await client.parts({ search: "uno", cursor: "prior" })).nextCursor, "next");
  assert.equal(called.url, "https://example.test/v1/catalog/parts?search=uno&cursor=prior");
  assert.equal(called.init.headers.Authorization, "Bearer test-token");
  const fail = createMarketClient({
    baseUrl: "https://example.test",
    session: { ...session, onUnauthorized: () => unauthorized++ },
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: "Session expired" }),
    }),
  });
  await assert.rejects(fail.pins("arduino_uno", {}), /Session expired/);
  assert.equal(unauthorized, 1);
});
test("client pages variants and sends only an explicit variant id to exact comparison", async () => {
  const urls = [];
  const client = createMarketClient({
    baseUrl: "https://example.test",
    session,
    fetchImpl: async (url) => {
      urls.push(url);
      return { ok: true, status: 200, json: async () => ({ items: [], nextCursor: null }) };
    },
  });
  await client.variants("arduino_uno", { limit: 24, cursor: "next" });
  await client.compareExact({ variantId: "v-exact", currency: "ILS", limit: 24 });
  assert.equal(
    urls[0],
    "https://example.test/v1/catalog/parts/arduino_uno/variants?limit=24&cursor=next",
  );
  assert.equal(
    urls[1],
    "https://example.test/v1/market/compare/exact?variantId=v-exact&currency=ILS&limit=24",
  );
});
