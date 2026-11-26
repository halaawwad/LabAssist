const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const code = ts.transpileModule(fs.readFileSync("src/lib/market/offerStock.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
vm.runInThisContext(`(function(exports,require,module){${code}\n})`)(mod.exports, require, mod);
const t = (en) => en;
const offer = { seller: { kind: "SHOP" }, quantity: 7, stockAvailability: "IN_STOCK", stockCheckedAt: "2026-11-25T12:00:00Z" };
test("shop stock displays supported count, boolean, unknown and date", () => {
  assert.match(mod.exports.offerStock(offer, t), /^7 available · Stock last checked:/);
  assert.match(mod.exports.offerStock({ ...offer, quantity: null }, t), /^Available · Stock last checked:/);
  assert.match(mod.exports.offerStock({ ...offer, quantity: null, stockAvailability: "OUT_OF_STOCK" }, t), /^Unavailable · Stock last checked:/);
  assert.equal(mod.exports.offerStock({ ...offer, stockCheckedAt: null }, t), "Availability unknown · Stock last checked: Unknown");
  assert.equal(mod.exports.offerStock({ ...offer, seller: { kind: "STUDENT" } }, t), "Quantity: 7");
});
