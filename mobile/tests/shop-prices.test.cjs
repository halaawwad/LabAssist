// Test-only fixtures for the Technolab / PIC Industrial comparison. Not real shop prices.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  const local = (name) =>
    name.startsWith("./") ? load(`src/lib/market/${name.slice(2)}.ts`) : require(name);
  vm.runInThisContext(`(function(exports,require,module){${code}\n})`)(mod.exports, local, mod);
  return mod.exports;
}
const prices = load("src/lib/market/shopPrices.ts");
const { createMarketClient } = load("src/lib/market/client.ts");
const fresh = new Date().toISOString();
const old = "2026-11-20T09:00:00.000Z";
const row = (shop, o = {}) => ({
  shop,
  priceStatus: "PRICE_FOUND",
  availability: "IN_STOCK",
  price: shop === "TECHNOLAB" ? "45.00" : "42.50",
  currency: "ILS",
  sourceUrl: `https://fixture.test/${shop}`,
  observedAt: fresh,
  lastSuccessfulCheck: fresh,
  stale: false,
  offerId: "o",
  ...o,
});
const missing = (shop, priceStatus) =>
  row(shop, { priceStatus, price: null, currency: null, availability: null, sourceUrl: null, offerId: null });
const data = (o = {}) => ({
  variantId: "v1",
  quantity: 1,
  localShops: [row("TECHNOLAB"), row("PIC_INDUSTRIAL")],
  globalFallbackEligible: false,
  globalReference: null,
  ...o,
});
const cards = (d, lang = "en") => prices.shopCards(d, lang);

test("two local prices: both shown, only the comparable lower one highlighted", () => {
  const [t, p] = cards(data());
  assert.equal(t.name, "Technolab · Nablus");
  assert.equal(p.name, "PIC Industrial · Nablus");
  assert.equal(t.priceText, "45.00 ILS");
  assert.equal(p.priceText, "42.50 ILS");
  assert.equal(p.lower, true);
  assert.equal(t.lower, false);
  assert.equal(t.availability, "In stock");
  assert.match(t.lastCheck, /^Last successful check: /);
});

test("one missing price shows a dash with a reason and never zero", () => {
  const [, p] = cards(data({ localShops: [row("TECHNOLAB"), missing("PIC_INDUSTRIAL", "NO_MATCH")] }));
  assert.equal(p.priceText, "—");
  assert.equal(p.hasPrice, false);
  assert.equal(p.note, "This shop has no matching product.");
  assert.equal(prices.priceAmount(null), null);
  assert.equal(prices.priceAmount(""), null);
  assert.equal(prices.formatShopPrice(null, "ILS", "en"), null);
});

test("global reference only when the backend says eligible; unavailable when none is reliable", () => {
  const both = [missing("TECHNOLAB", "NO_MATCH"), missing("PIC_INDUSTRIAL", "PRICE_NOT_LISTED")];
  const ref = {
    supplier: "Fixture Supplier",
    url: "https://fixture.test/global",
    currency: "USD",
    price: "12.00",
    quantity: 1,
    observedAt: old,
    shippingInclusion: "UNKNOWN",
    taxInclusion: "EXCLUDED",
  };
  const shown = prices.globalCard(data({ localShops: both, globalFallbackEligible: true, globalReference: ref }), "en");
  assert.equal(shown.kind, "reference");
  assert.equal(shown.title, "Global reference price — not a Technolab or PIC price");
  assert.equal(shown.priceText, "12.00 USD");
  assert.equal(shown.shipping, "Shipping: unknown");
  assert.equal(shown.tax, "Tax: not included");
  assert.equal(shown.observed, "Observed 20 Nov 2026");
  const ar = prices.globalCard(data({ localShops: both, globalFallbackEligible: true, globalReference: ref }), "ar");
  assert.equal(ar.title, "سعر عالمي مرجعي — ليس سعر تكنولاب أو PIC");
  assert.equal(prices.globalCard(data({ localShops: both, globalFallbackEligible: true }), "en").kind, "unavailable");
  const failed = [missing("TECHNOLAB", "FETCH_FAILED"), missing("PIC_INDUSTRIAL", "MATCH_UNRESOLVED")];
  assert.equal(
    prices.globalCard(data({ localShops: failed, globalFallbackEligible: false, globalReference: ref }), "en").kind,
    "hidden",
  );
});

test("unresolved mapping is never a confirmed price, availability or link", () => {
  const [t] = cards(
    data({ localShops: [row("TECHNOLAB", { priceStatus: "MATCH_UNRESOLVED", price: null }), missing("PIC_INDUSTRIAL", "MATCH_UNRESOLVED")] }),
  );
  assert.equal(t.priceText, "—");
  assert.equal(t.badge.text, "Match not confirmed");
  assert.equal(t.availability, null);
  assert.equal(t.sourceUrl, null);
});

test("out-of-stock keeps its published price and blocks the lower-price highlight", () => {
  const [t, p] = cards(data({ localShops: [row("TECHNOLAB", { price: "10.00", availability: "OUT_OF_STOCK" }), row("PIC_INDUSTRIAL")] }));
  assert.equal(t.priceText, "10.00 ILS");
  assert.equal(t.availability, "Out of stock");
  assert.equal(t.lower || p.lower, false);
});

test("partial failure retains the last known price with its original date", () => {
  const [t, p] = cards(
    data({
      localShops: [
        row("TECHNOLAB", { priceStatus: "FETCH_FAILED", price: "40.00", observedAt: old, lastSuccessfulCheck: old, stale: true }),
        row("PIC_INDUSTRIAL"),
      ],
    }),
  );
  assert.equal(t.priceText, "40.00 ILS");
  assert.equal(t.badge.text, "Update failed");
  assert.equal(t.priceDate, "20 Nov 2026");
  assert.match(t.note, /last known price from 20 Nov 2026/);
  assert.equal(t.lower || p.lower, false);
});

test("different currencies or stale prices are not compared", () => {
  assert.equal(prices.lowerLocalShop([row("TECHNOLAB"), row("PIC_INDUSTRIAL", { currency: "USD" })]), null);
  assert.equal(prices.currencyMismatch([row("TECHNOLAB"), row("PIC_INDUSTRIAL", { currency: "USD" })]), true);
  assert.equal(prices.lowerLocalShop([row("TECHNOLAB", { stale: true }), row("PIC_INDUSTRIAL")]), null);
});

test("Arabic labels, Latin digits and isolates for Latin text", () => {
  const [t, p] = cards(data({ localShops: [row("TECHNOLAB", { observedAt: old }), missing("PIC_INDUSTRIAL", "NO_MATCH")] }), "ar");
  assert.equal(t.name, "تكنولاب · نابلس");
  assert.equal(p.name, "PIC Industrial · نابلس");
  assert.equal(t.availability, "متوفر");
  assert.match(t.priceDate, /20 نوفمبر 2026/);
  assert.equal(prices.isolate("45.00 ILS"), "⁨45.00 ILS⁩");
});

test("client calls the comparison route with the session token and rejects malformed bodies", async () => {
  const calls = [];
  const session = { getAccessToken: async () => "test-token", getCurrentUser: async () => ({ id: "a", role: "STUDENT" }) };
  const respond = (body) => async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  };
  const ok = createMarketClient({ baseUrl: "https://api.test/", session, fetchImpl: respond(data()) });
  const result = await ok.shopPrices({ variantId: "v1", quantity: 1 });
  assert.equal(result.localShops.length, 2);
  assert.equal(calls[0].url, "https://api.test/v1/market/prices/compare?variantId=v1&quantity=1");
  assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
  const bad = createMarketClient({ baseUrl: "https://api.test", session, fetchImpl: respond({ items: [] }) });
  await assert.rejects(bad.shopPrices({ variantId: "v1", quantity: 1 }), /unexpected response/);
});
