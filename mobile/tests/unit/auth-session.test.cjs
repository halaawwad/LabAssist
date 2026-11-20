/* global __dirname */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  ts = require("typescript");
function load() {
  const m = { exports: {} };
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../../../shared/auth/session-client.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  vm.runInThisContext(`(function(module,exports){${code}})`)(m, m.exports);
  return m.exports;
}
const account = {
  id: "student-1",
  role: "STUDENT",
  fullName: "Test Student",
  email: "s12345678@stu.najah.edu",
  status: "ACTIVE",
};
function fixture(fetcher) {
  let saved = null;
  const storage = {
    read: async () => saved,
    write: async (v) => {
      saved = v;
    },
    clear: async () => {
      saved = null;
    },
  };
  return {
    client: new (load().SessionClient)("http://api.test/v1", storage, fetcher),
    storage,
    get saved() {
      return saved;
    },
  };
}
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const tokens = (n = 1) => ({ accessToken: "access" + n, refreshToken: "refresh" + n, account });
test("login sends role and identifier; persists only refresh token", async () => {
  let request;
  const f = fixture(async (u, o) => {
    request = JSON.parse(o.body);
    return response(201, tokens());
  });
  assert.deepEqual(await f.client.login("STUDENT", "s12345678@stu.najah.edu", "secret"), account);
  assert.deepEqual(request, {
    role: "STUDENT",
    identifier: "s12345678@stu.najah.edu",
    password: "secret",
  });
  assert.equal(f.saved, "refresh1");
});
test("wrong credentials never persist a session", async () => {
  const f = fixture(async () => response(401, {}));
  await assert.rejects(f.client.login("STUDENT", "wrong", "wrong"), (e) => e.status === 401);
  assert.equal(f.saved, null);
});

test("API errors retain a safe reference ID without exposing response internals", async () => {
  const id = "7c195459-977d-449d-aab2-5cc71a724574";
  const f = fixture(async () =>
    response(500, { requestId: id, message: "PRIVATE_BACKEND_DETAIL" }),
  );
  await assert.rejects(f.client.login("STUDENT", "id", "pw"), (error) => {
    assert.equal(error.status, 500);
    assert.equal(error.requestId, id);
    assert.equal(error.message.includes("PRIVATE_BACKEND_DETAIL"), false);
    return true;
  });
});

test("malformed error payloads keep the HTTP status and ignore unsafe reference IDs", async () => {
  const f = fixture(async () => response(429, { requestId: "PRIVATE_TOKEN\nforged-log" }));
  await assert.rejects(
    f.client.login("STUDENT", "id", "pw"),
    (error) => error.status === 429 && error.requestId === undefined,
  );
});

test("two logout clicks both wait for revocation instead of redirecting early", async () => {
  let release,
    revocations = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(async (url) => {
    if (url.endsWith("/login")) return response(201, tokens());
    revocations++;
    await pending;
    return response(201, { ok: true });
  });
  await f.client.login("STUDENT", "id", "pw");
  const first = f.client.logout();
  let secondDone = false;
  const second = f.client.logout().then(() => {
    secondDone = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const completedBeforeRevocation = secondDone;
  release();
  await Promise.all([first, second]);
  assert.equal(completedBeforeRevocation, false);
  assert.equal(revocations, 1);
  assert.equal(f.saved, null);
});

test("a new login waits until the previous logout has finished", async () => {
  let release,
    logins = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(async (url) => {
    if (url.endsWith("/login")) return response(201, tokens(++logins));
    await pending;
    return response(201, { ok: true });
  });
  await f.client.login("STUDENT", "id", "pw");
  const leaving = f.client.logout();
  const entering = f.client.login("STUDENT", "id", "pw");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const startedBeforeRevocation = logins;
  release();
  await Promise.all([leaving, entering]);
  assert.equal(startedBeforeRevocation, 1);
  assert.equal(logins, 2);
  assert.equal(f.saved, "refresh2");
});
test("parallel expired requests share one refresh and retry with rotated access", async () => {
  let refreshes = 0;
  const f = fixture(async (u, o) => {
    if (u.endsWith("/login")) return response(201, tokens());
    if (u.endsWith("/refresh")) {
      refreshes++;
      await new Promise((r) => setTimeout(r, 10));
      return response(201, tokens(2));
    }
    return o.headers.Authorization === "Bearer access2"
      ? response(200, account)
      : response(401, {});
  });
  await f.client.login("STUDENT", "id", "pw");
  await Promise.all([f.client.me(), f.client.me()]);
  assert.equal(refreshes, 1);
  assert.equal(f.saved, "refresh2");
});
test("restore validates stored refresh with server", async () => {
  const f = fixture(async (u) =>
    u.endsWith("/refresh") ? response(201, tokens(2)) : response(200, account),
  );
  await f.storage.write("previous");
  assert.deepEqual(await f.client.restore(), account);
  assert.equal(f.saved, "refresh2");
});
test("revoked refresh clears local credentials", async () => {
  const f = fixture(async () => response(401, {}));
  await f.storage.write("revoked");
  assert.equal(await f.client.restore(), null);
  assert.equal(f.saved, null);
});
test("temporary restore network failure keeps stored credential for retry", async () => {
  const f = fixture(async () => {
    throw Error("offline");
  });
  await f.storage.write("keep");
  await assert.rejects(f.client.restore());
  assert.equal(f.saved, "keep");
});
test("logout clears credentials even if network unavailable", async () => {
  let calls = 0;
  const f = fixture(async () => {
    if (calls++) throw Error("offline");
    return response(201, tokens());
  });
  await f.client.login("STUDENT", "id", "pw");
  await f.client.logout();
  assert.equal(f.saved, null);
  assert.equal(f.client.account, null);
});
test("public activation request does not send bearer credentials", async () => {
  let headers;
  const f = fixture(async (u, o) => {
    headers = o.headers;
    return response(200, { ok: true });
  });
  await f.client.publicRequest("/auth/activate", { token: "one", email: "x", password: "pw" });
  assert.equal(headers.Authorization, undefined);
});

test("default fetch is not invoked with the session client as its receiver", async () => {
  const previous = global.fetch;
  try {
    global.fetch = function () {
      if (this && this.constructor?.name === "SessionClient") throw Error("Illegal invocation");
      return Promise.resolve(response(201, tokens()));
    };
    const store = { read: async () => null, write: async () => {}, clear: async () => {} };
    const c = new (load().SessionClient)("http://api.test/v1", store);
    assert.deepEqual(await c.login("STUDENT", "id", "pw"), account);
  } finally {
    global.fetch = previous;
  }
});
