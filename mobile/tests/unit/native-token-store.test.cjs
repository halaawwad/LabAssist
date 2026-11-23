/* global __dirname */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function nativeStore(secureStore) {
  let store;
  const source = fs.readFileSync(path.join(__dirname, "../../src/features/auth/client.ts"), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    process: { env: {} },
    __DEV__: true,
    require: (name) => {
      if (name === "expo-constants")
        return { default: { expoConfig: { hostUri: "localhost:8081" } } };
      if (name === "react-native") return { Platform: { OS: "ios" } };
      if (name === "expo-secure-store") return secureStore;
      if (name === "./session-client")
        return {
          SessionClient: class {
            constructor(_url, value) {
              store = value;
            }
          },
        };
      throw Error("Unexpected storage dependency: " + name);
    },
  });
  return store;
}
test("native refresh storage uses device-only unlocked Keychain access", async () => {
  const calls = [];
  const store = nativeStore({
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
    getItemAsync: async (key) => {
      calls.push(["read", key]);
      return "refresh";
    },
    setItemAsync: async (key, value, options) => {
      calls.push(["write", key, value, options.keychainAccessible]);
    },
    deleteItemAsync: async (key) => {
      calls.push(["clear", key]);
    },
  });
  await store.write("refresh");
  assert.equal(await store.read(), "refresh");
  await store.clear();
  assert.deepEqual(calls, [
    ["write", "labassist.refresh.v1", "refresh", 4],
    ["read", "labassist.refresh.v1"],
    ["clear", "labassist.refresh.v1"],
  ]);
});
test("native secure-storage failure propagates without a plaintext fallback", async () => {
  const store = nativeStore({
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
    setItemAsync: async () => {
      throw Error("Keychain unavailable");
    },
    getItemAsync: async () => {
      throw Error("Keychain locked");
    },
    deleteItemAsync: async () => {
      throw Error("Keychain unavailable");
    },
  });
  await assert.rejects(store.write("refresh"), /Keychain unavailable/);
  await assert.rejects(store.read(), /Keychain locked/);
  await assert.rejects(store.clear(), /Keychain unavailable/);
});
