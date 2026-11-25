const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const ts = require("typescript");
const { DOMParser } = require("@xmldom/xmldom");
const { unzipSync, zipSync, strFromU8, strToU8 } = require("fflate");
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(
    (name) =>
      name.startsWith(".") ? load(path.resolve(path.dirname(file), name + ".ts")) : require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const workbook = load(path.join(__dirname, "../../shared/department/workbook.ts"));
const records = load(path.join(__dirname, "../../shared/department/records.ts"));
const persistence = load(
  path.join(__dirname, "../src/features/department/departmentPersistence.ts"),
);
const native = load(path.join(__dirname, "../src/features/department/departmentData.ts"));
const domain = load(path.join(__dirname, "../../shared/web/domain.ts"));
const parseXml = (text) =>
  new DOMParser({
    onError: () => {
      throw new Error("Bad XML");
    },
  }).parseFromString(text, "application/xml");
const file = (bytes) => ({
  name: "groups.xlsx",
  size: bytes.length,
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});
const book = () => ({
  headers: [...workbook.columns],
  rows: [
    {
      number: 2,
      formula: false,
      values: [
        "P001",
        "",
        "0909",
        "Dr Example",
        "supervisor@example.com",
        "20230001",
        "Older batch",
        "s20230001@stu.najah.edu",
      ],
    },
    {
      number: 3,
      formula: false,
      values: [
        "P001",
        "",
        "0909",
        "Dr Example",
        "supervisor@example.com",
        "20260002",
        "Newer batch",
        "s20260002@stu.najah.edu",
      ],
    },
  ],
});
const plan = (b, accounts = [], groups = [], transfers = false) =>
  records.planImport(
    b,
    workbook.initialMapping(b.headers),
    accounts,
    groups,
    [],
    transfers,
    "pending-drafts",
  );
test("actual XLSX template parses using the native XML adapter; formulas are rejected without executing", async () => {
  const bytes = workbook.createTemplateBytes();
  const parsed = await workbook.readWorkbook(file(bytes), parseXml);
  assert.equal(parsed.rows.length, 2);
  assert.equal(plan(parsed).errors.length, 0);
  const files = unzipSync(bytes);
  files["xl/worksheets/sheet1.xml"] = strToU8(
    strFromU8(files["xl/worksheets/sheet1.xml"]).replace(
      '<c r="A2" t="inlineStr">',
      '<c r="A2" t="inlineStr"><f>HYPERLINK("https://example.invalid")</f>',
    ),
  );
  const invalid = await workbook.readWorkbook(file(zipSync(files)), parseXml);
  assert.ok(plan(invalid).rows[0].errors.some((e) => e.includes("Formula")));
});
test("web and mobile imports create pending accounts, permit mixed batches in drafts, preserve zeros, and are idempotent", () => {
  const b = book(),
    first = plan(b);
  assert.deepEqual(first.errors, []);
  assert.ok(first.rows.every((r) => !r.errors.length));
  assert.equal(first.accounts.length, 3);
  assert.equal(first.groups.length, 1);
  assert.ok(
    first.accounts.every((a) => a.status === "PENDING_ACTIVATION" && !a.active && !a.invited),
  );
  assert.equal(first.accounts[0].number, "0909");
  const again = plan(b, first.accounts, first.groups);
  assert.deepEqual(again.errors, []);
  assert.equal(again.summary.accountsCreated, 0);
  assert.equal(again.summary.groupsCreated, 0);
  assert.equal(again.summary.assignmentsAdded, 0);
  assert.deepEqual(again.groups[0].studentIds, first.groups[0].studentIds);
  assert.equal(again.groups[0].membershipHistory.length, 0);
  assert.ok(again.accounts.every((a) => !a.active));
  assert.throws(
    () =>
      records.validateDepartmentGroup(
        { ...first.groups[0], status: "IN_PROGRESS" },
        [],
        first.accounts,
        "pending-drafts",
      ),
    /active accounts/i,
  );
  const web = records.planImport(b, workbook.initialMapping(b.headers), [], [], [], false);
  assert.deepEqual(web.errors, []);
  assert.ok(
    web.accounts.every((a) => a.status === "PENDING_ACTIVATION" && !a.active && !a.invited),
  );
});
test("web and mobile imports preserve existing account statuses", () => {
  const b = book();
  const original = plan(b).accounts.map((account, index) => ({
    ...account,
    status: index === 0 ? "ACTIVE" : "PENDING_ACTIVATION",
    active: index === 0,
  }));
  original.push({
    ...original[0],
    id: "disabled",
    number: "0910",
    email: "disabled@example.com",
    status: "DISABLED",
    active: false,
    disabledFrom: "PENDING_ACTIVATION",
  });
  original.push({
    ...original[0],
    id: "reference",
    number: "0911",
    email: "reference@example.com",
    status: "REFERENCE_ONLY",
    active: false,
  });
  const before = JSON.stringify(original);
  for (const policy of [undefined, "pending-drafts"]) {
    const review = records.planImport(
      b,
      workbook.initialMapping(b.headers),
      original,
      [],
      [],
      false,
      policy,
    );
    assert.deepEqual(review.errors, []);
    assert.equal(review.summary.accountsCreated, 0);
    for (const account of original) {
      const saved = review.accounts.find((candidate) => candidate.id === account.id);
      assert.equal(saved.status, account.status);
      assert.equal(saved.active, account.active);
      assert.equal(saved.disabledFrom, account.disabledFrom);
    }
  }
  assert.equal(JSON.stringify(original), before);
});
test("mobile role adapters never infer invitation delivery or activate pending records", () => {
  const accounts = [
    {
      id: "pending",
      name: "Pending",
      number: "0909",
      email: "pending@example.com",
      role: "supervisor",
      active: false,
      status: "PENDING_ACTIVATION",
    },
    {
      id: "legacy-active",
      name: "Legacy",
      number: "0910",
      email: "legacy@example.com",
      role: "supervisor",
      active: true,
    },
  ];
  const adapted = native.webAccounts(accounts);
  assert.equal(adapted[0].status, "PENDING_ACTIVATION");
  assert.equal(adapted[0].active, false);
  assert.equal(adapted[0].invited, false);
  assert.equal(adapted[1].status, "ACTIVE");
  assert.equal(adapted[1].invited, false);
  assert.equal(native.mobileAccounts(adapted)[0].status, "PENDING_ACTIVATION");
});
test("Arabic headers and adjustable mappings work; conflicting details, emails and memberships block import", () => {
  const b = book();
  b.headers = [
    "رقم المشروع",
    "اسم المشروع",
    "رقم المشرف",
    "اسم المشرف",
    "بريد المشرف",
    "رقم الطالب",
    "اسم الطالب",
    "بريد الطالب",
  ];
  assert.ok(Object.values(workbook.initialMapping(b.headers)).every((n) => n >= 0));
  b.rows[1].values[4] = "different@example.com";
  assert.ok(plan(b).rows[1].errors.some((e) => e.includes("inconsistent")));
  const unknown = book();
  unknown.headers[0] = "Custom code";
  assert.ok(plan(unknown).errors.some((e) => e.includes("Map")));
  const mapping = { ...workbook.initialMapping(unknown.headers), "Project Number": 0 };
  assert.deepEqual(
    records.planImport(unknown, mapping, [], [], [], false, "pending-drafts").errors,
    [],
  );
  const collision = book();
  collision.rows[1].values[7] = collision.rows[0].values[7];
  assert.ok(plan(collision).rows[1].errors.length > 0);
  const invalid = book();
  invalid.rows[0].values[5] = "123456";
  assert.ok(plan(invalid).rows[0].errors.some((e) => e.includes("8-digit")));
});
test("manual transfer requires confirmation, preserves metadata/history and term scope, and protects source size", () => {
  const first = plan(book()),
    supervisor = first.accounts[0];
  const extra = [3, 4, 5].map((n) => ({
    ...first.accounts[1],
    id: `extra${n}`,
    number: `2026000${n}`,
    name: `Student ${n}`,
    email: `s2026000${n}@stu.najah.edu`,
  }));
  const accounts = [...first.accounts, ...extra];
  const source = {
    ...first.groups[0],
    studentIds: [...first.groups[0].studentIds, extra[0].id],
    legacy: "preserved",
  };
  const target = {
    id: "target",
    termId: domain.demoTerm.id,
    projectNumber: "P002",
    status: "DRAFT",
    studentIds: [extra[1].id, extra[2].id],
    supervisorIds: [supervisor.id],
  };
  const next = { ...target, studentIds: [...target.studentIds, first.accounts[1].id] };
  assert.throws(
    () => records.prepareGroupSave(next, [source, target], accounts, false, "pending-drafts"),
    /Confirm/,
  );
  const moved = records.prepareGroupSave(next, [source, target], accounts, true, "pending-drafts");
  assert.equal(moved[0].studentIds.length, 2);
  assert.equal(moved[0].legacy, "preserved");
  assert.ok(moved[0].membershipHistory[0].endedAt);
  assert.ok(domain.accountHasHistory(first.accounts[1].id, moved));
  assert.throws(
    () =>
      records.prepareGroupSave(next, [first.groups[0], target], accounts, true, "pending-drafts"),
    /2/,
  );
  const otherTerm = { ...source, termId: "previous-term" };
  assert.doesNotThrow(() =>
    records.prepareGroupSave(next, [otherTerm, target], accounts, false, "pending-drafts"),
  );
});
function storage() {
  const data = new Map();
  let partialFailure = false;
  return {
    data,
    failNext: () => {
      partialFailure = true;
    },
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => {
      data.set(k, v);
    },
    removeItem: async (k) => {
      data.delete(k);
    },
    multiRemove: async (keys) => {
      keys.forEach((k) => data.delete(k));
    },
    multiSet: async (rows) => {
      for (const [k, v] of rows) {
        data.set(k, v);
        if (partialFailure) {
          partialFailure = false;
          throw new Error("Save failed");
        }
      }
    },
  };
}
test("existing keys save together; partial failures undo changes and reload retains original data", async () => {
  const store = storage(),
    records = plan(book()),
    initial = {
      accounts: native.mobileAccounts(records.accounts),
      groups: records.groups,
      messages: [],
    };
  const loaded = await persistence.readDepartment(store, initial);
  const raw = await persistence.persistDepartment(store, initial, loaded.raw);
  const next = {
    ...initial,
    accounts: [...initial.accounts, { ...initial.accounts[1], id: "another", number: "20260007" }],
    groups: initial.groups.map((g) => ({ ...g, title: "Changed" })),
  };
  store.failNext();
  await assert.rejects(persistence.persistDepartment(store, next, raw));
  assert.deepEqual((await persistence.readDepartment(store, initial)).data, initial);
  assert.equal(store.data.has("labassist.mobile.department.transaction"), false);
  store.data.set(persistence.departmentKeys[1], "bad saved JSON");
  await assert.rejects(persistence.readDepartment(store, initial));
  assert.equal(store.data.get(persistence.departmentKeys[1]), "bad saved JSON");
});
test("interrupted save recovers old records and concurrent external edits cannot be overwritten", async () => {
  const store = storage(),
    initial = { accounts: [], groups: [], messages: [] };
  const raw = await persistence.persistDepartment(store, initial, [null, null, null]);
  store.data.set(
    "labassist.mobile.department.transaction",
    JSON.stringify(persistence.departmentKeys.map((key, i) => ({ key, value: raw[i] }))),
  );
  store.data.set(persistence.departmentKeys[0], "interrupted");
  assert.deepEqual((await persistence.readDepartment(store, initial)).data, initial);
  store.data.set(
    persistence.departmentKeys[2],
    '[{"id":"message","person":"s1","body":"keep","time":"today"}]',
  );
  await assert.rejects(persistence.persistDepartment(store, initial, raw), /Records changed/);
  assert.match(store.data.get(persistence.departmentKeys[2]), /keep/);
});
test("legacy previews retain identity, disabled/pending state, unknown metadata, messages and history during enrichment", async () => {
  const store = storage(),
    planned = plan(book());
  const accounts = native
    .mobileAccounts(planned.accounts)
    .map((a) => ({ ...a, legacyMetadata: { keep: a.id } }));
  accounts[1] = {
    ...accounts[1],
    status: "DISABLED",
    active: false,
    disabledFrom: accounts[1].status,
  };
  const group = {
    ...planned.groups[0],
    status: "ON_HOLD",
    historicalMetadata: "keep",
    membershipHistory: [
      {
        studentIds: [accounts[1].id],
        supervisorIds: [accounts[0].id],
        endedAt: "2026-01-01T00:00:00Z",
      },
    ],
  };
  delete group.title;
  const messages = [
    {
      id: "legacy-message",
      person: accounts[0].id,
      body: "Keep this",
      time: "09:00",
      legacy: true,
    },
  ];
  const saved = { accounts, groups: [group], messages };
  for (const [i, key] of persistence.departmentKeys.entries())
    store.data.set(key, JSON.stringify([accounts, [group], messages][i]));
  const initial = {
    ...saved,
    accounts: accounts.map((a) => ({ ...a, photo: "existing-photo-uri" })),
    groups: [{ ...group, title: "Workspace title" }],
  };
  const loaded = await persistence.readDepartment(store, initial);
  assert.equal(loaded.data.groups[0].title, "Workspace title");
  assert.equal(loaded.data.groups[0].status, "ON_HOLD");
  assert.deepEqual(loaded.data.groups[0].membershipHistory, group.membershipHistory);
  assert.equal(loaded.data.accounts[1].status, "DISABLED");
  assert.equal(loaded.data.accounts[0].status, "PENDING_ACTIVATION");
  await persistence.persistDepartment(store, loaded.data, loaded.raw);
  const reloaded = await persistence.readDepartment(store, initial);
  assert.equal(reloaded.data.accounts[1].legacyMetadata.keep, accounts[1].id);
  assert.deepEqual(reloaded.data.messages, messages);
  assert.equal(reloaded.data.groups[0].historicalMetadata, "keep");
});
