const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${js}\n})`, { filename: file })(
    (name) => load(path.resolve(path.dirname(file), name + ".ts")),
    module,
    module.exports,
  );
  return module.exports;
}
const { createWorkspace, applyAction, projectProgress, canSeeProject, calendarDay } = load(
  path.join(__dirname, "../src/domain/workspace.ts"),
);
const now = new Date("2026-11-05T10:00:00Z");
let sequence = 0;
const seed = () => createWorkspace(now);
const act = (s, u, a) => applyAction(s, u, a, "id" + ++sequence, now);
test("final report preserves structured chapters, images and tables in drafts and submitted versions", () => {
  let s = seed();
  const report = s.reports.find((r) => r.projectId === "p1" && r.kind === "final");
  const { sectionTemplate } = load(path.join(__dirname, "../src/domain/finalReport.ts"));
  const document = {
    meta: {
      title: "Smart Car",
      specialization: "Computer",
      department: "Computer",
      supervisor: "Dr. Ahmad",
      date: "2026-11-05",
      students: [
        { name: "Noor", number: "12000001" },
        { name: "Hala", number: "12000002" },
      ],
    },
    sections: sectionTemplate.map((section) => ({
      ...section,
      blocks: [
        { id: section.id + "-text", kind: "paragraph", text: "Original paragraph ".repeat(600) },
      ],
    })),
  };
  document.sections
    .find((x) => x.id === "methodology")
    .blocks.push(
      {
        id: "figure",
        kind: "image",
        url: "data:image/png;base64,aGVsbG8=",
        text: "Wiring",
        size: "large",
      },
      {
        id: "table",
        kind: "table",
        text: "Readings",
        rows: [
          ["Light", "Current"],
          ["15%", "20 mA"],
        ],
      },
    );
  const fields = Object.fromEntries(
    Object.keys(report.fields).map((key) => [key, "Complete section"]),
  );
  assert.throws(
    () => act(s, "s4", { type: "report.save", id: report.id, fields, document }),
    /not_allowed/,
  );
  s = act(s, "s1", { type: "report.save", id: report.id, fields, document });
  assert.deepEqual(
    JSON.parse(JSON.stringify(s)).reports.find((r) => r.id === report.id).document,
    document,
  );
  s = act(s, "s1", { type: "report.submit", id: report.id });
  assert.deepEqual(s.reports.find((r) => r.id === report.id).history.at(-1).document, document);
  assert.throws(
    () => act(s, "s1", { type: "report.save", id: report.id, fields, document }),
    /locked/,
  );
});
test("all final report sections retain the original web structure and optional flags", () => {
  const { sectionTemplate } = load(path.join(__dirname, "../src/domain/finalReport.ts"));
  const source = fs.readFileSync(
    path.join(__dirname, "../../frontend/student/src/lib/reports.tsx"),
    "utf8",
  );
  const parsed = ts.createSourceFile("reports.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let array;
  function find(node){if(ts.isVariableDeclaration(node)&&node.name.getText(parsed)==="sectionTemplate")array=node.initializer.getText(parsed);ts.forEachChild(node,find);}
  find(parsed);
  assert.ok(array,"Web report section template must be present");
  assert.deepEqual(sectionTemplate, JSON.parse(JSON.stringify(vm.runInNewContext(array))));
});
test("seed: 23 teams, 54 unique 8-digit students, 2–3 students/team, max 4 projects/supervisor", () => {
  const s = seed();
  assert.equal(s.projects.length, 23);
  assert.equal(s.users.filter((u) => u.role === "student").length, 54);
  assert(s.projects.every((p) => p.studentIds.length >= 2 && p.studentIds.length <= 3));
  const students = s.users.filter((u) => u.role === "student");
  assert(
    students.every(
      (u) =>
        /^\d{8}$/.test(u.universityNumber) && u.email === `s${u.universityNumber}@stu.najah.edu`,
    ),
  );
  assert.equal(new Set(students.map((u) => u.universityNumber)).size, 54);
  assert(
    s.users
      .filter((u) => u.role === "supervisor")
      .every((u) => s.projects.filter((p) => p.supervisorIds.includes(u.id)).length <= 4),
  );
});
test("project visibility is scoped to team members and linked supervisors", () => {
  const s = seed();
  assert(canSeeProject(s, "s1", "p1"));
  assert(canSeeProject(s, "d1", "p1"));
  assert(!canSeeProject(s, "s4", "p1"));
  assert(!canSeeProject(s, "d2", "p1"));
});
test("only task owner can mark completion; project progress updates without mutating input", () => {
  const s = seed();
  const before = JSON.stringify(s);
  assert.throws(() => act(s, "s2", { type: "task.toggle", id: "task-s1" }), /not_allowed/);
  const n = act(s, "s1", { type: "task.toggle", id: "task-s1" });
  assert.equal(projectProgress(n, "p1"), 67);
  assert.equal(JSON.stringify(s), before);
});
test("teammates may add tasks for each other, never for another team", () => {
  const s = seed();
  assert(
    act(s, "s1", { type: "task.add", projectId: "p1", title: "Test", ownerId: "s2" }).tasks.some(
      (t) => t.title === "Test",
    ),
  );
  assert.throws(
    () => act(s, "s1", { type: "task.add", projectId: "p1", title: "Test", ownerId: "s4" }),
    /not_allowed/,
  );
});
test("supervisor can view project work but cannot edit student tasks or project fields", () => {
  const s = seed();
  assert.throws(
    () => act(s, "d1", { type: "project.edit", id: "p1", title: "X", description: "Y" }),
    /not_allowed/,
  );
  assert.throws(() => act(s, "d1", { type: "task.toggle", id: "task-s1" }), /not_allowed/);
});
test("one shared weekly draft per project/week; incomplete submission refused", () => {
  const s = act(seed(), "s1", { type: "weekly.create", projectId: "p1", week: 2 });
  assert.throws(
    () => act(s, "s2", { type: "weekly.create", projectId: "p1", week: 2 }),
    /invalid_input/,
  );
  const r = s.reports.at(-1);
  assert.throws(() => act(s, "s1", { type: "report.submit", id: r.id }), /required_fields/);
});
test("student submission → supervisor review → shared feedback and notification", () => {
  let s = act(seed(), "s1", { type: "weekly.create", projectId: "p1", week: 2 });
  const id = s.reports.at(-1).id;
  s = act(s, "s2", {
    type: "report.save",
    id,
    fields: {
      completed: "Built prototype",
      progress: "Calibrated",
      tasks: "3 tests",
      delays: "",
      problems: "",
      plan: "Retest",
    },
  });
  s = act(s, "s1", { type: "report.submit", id });
  const frozen = JSON.stringify(s.reports.find((r) => r.id === id).history);
  assert.throws(() => act(s, "s1", { type: "report.submit", id }), /locked/);
  assert.throws(
    () => act(s, "d2", { type: "report.review", id, body: "No", section: "", status: "reviewed" }),
    /not_allowed/,
  );
  s = act(s, "d1", { type: "report.view", id });
  assert.throws(() => act(s, "s1", { type: "report.withdraw", id }), /locked/);
  s = act(s, "d1", {
    type: "report.review",
    id,
    body: "Add calibration results.",
    section: "Results",
    status: "reviewed",
  });
  assert.equal(s.reports.find((r) => r.id === id).feedback[0].body, "Add calibration results.");
  assert.equal(JSON.stringify(s.reports.find((r) => r.id === id).history), frozen);
  assert(s.alerts.some((a) => a.userId === "s2" && a.body.includes("feedback")));
});
test("weekly withdrawal allowed until opened; final always requires supervisor reopening", () => {
  let s = seed();
  s = act(s, "s1", { type: "report.withdraw", id: "p1-weekly" });
  assert.equal(s.reports.find((r) => r.id === "p1-weekly").status, "draft");
  s = act(s, "s1", {
    type: "report.save",
    id: "p1-final",
    fields: { Abstract: "a", Introduction: "b" },
  });
  s = act(s, "s1", { type: "report.submit", id: "p1-final" });
  assert.throws(() => act(s, "s1", { type: "report.withdraw", id: "p1-final" }), /locked/);
  s = act(s, "d1", { type: "report.reopen", id: "p1-final" });
  s = act(s, "s2", {
    type: "report.save",
    id: "p1-final",
    fields: { Abstract: "changed", Introduction: "b" },
  });
  assert.equal(s.reports.find((r) => r.id === "p1-final").history[0].fields.Abstract, "a");
});
test("closed final submission window rejects saves and submissions", () => {
  let s = act(seed(), "d1", { type: "project.gate", id: "p1", kind: "final", open: false });
  assert.throws(
    () => act(s, "s1", { type: "report.save", id: "p1-final", fields: { Abstract: "x" } }),
    /locked/,
  );
});
test("self conversation contains only the current student; message-star and conversation-star are independent", () => {
  let s = seed();
  assert.deepEqual(s.threads.find((t) => t.id === "self-s1").memberIds, ["s1"]);
  s = act(s, "s1", { type: "message.send", threadId: "self-s1", body: "My notes" });
  const id = s.messages.at(-1).id;
  s = act(s, "s1", { type: "message.star", id });
  assert(s.messages.at(-1).starredBy.includes("s1"));
  assert.equal(s.threads.find((t) => t.id === "self-s1").starredBy.length, 0);
  assert.throws(
    () => act(s, "s2", { type: "message.send", threadId: "self-s1", body: "No" }),
    /not_allowed/,
  );
});
test("direct message deduplicates the pair; reply target must belong to same conversation", () => {
  let s = act(seed(), "s1", { type: "thread.create", userId: "d2" });
  const count = s.threads.length;
  s = act(s, "s1", { type: "thread.create", userId: "d2" });
  assert.equal(s.threads.length, count);
  assert.throws(
    () =>
      act(s, "s1", {
        type: "message.send",
        threadId: "self-s1",
        body: "Reply",
        replyTo: "welcome-p1",
      }),
    /not_allowed/,
  );
});
test("message deletion requires its sender and preserves unrelated messages", () => {
  let s = act(seed(), "s1", { type: "message.send", threadId: "thread-p1", body: "test" });
  const id = s.messages.at(-1).id;
  assert.throws(() => act(s, "s2", { type: "message.delete", id }), /not_allowed/);
  const n = act(s, "s1", { type: "message.delete", id });
  assert.equal(n.messages.length, s.messages.length - 1);
  assert(n.messages.some((m) => m.id === "welcome-p1"));
});
test("meeting requires invitees; acceptance/decline only by invitee; cancellation only by creator", () => {
  let s = seed();
  assert.throws(
    () =>
      act(s, "s1", {
        type: "meeting.create",
        title: "Test",
        inviteeIds: [],
        date: "2026-11-06",
        time: "13:00",
        agenda: "",
        location: "",
      }),
    /required_fields/,
  );
  assert.throws(
    () => act(s, "s4", { type: "meeting.respond", id: "meet1", response: "accepted" }),
    /not_allowed/,
  );
  s = act(s, "s1", { type: "meeting.respond", id: "meet1", response: "accepted" });
  assert.equal(s.meetings[0].responses.s1, "accepted");
  assert.throws(() => act(s, "s1", { type: "meeting.cancel", id: "meet1" }), /not_allowed/);
  s = act(s, "d1", { type: "meeting.cancel", id: "meet1" });
  assert.throws(
    () => act(s, "s2", { type: "meeting.respond", id: "meet1", response: "declined" }),
    /not_allowed/,
  );
});
test("attendance: manager only, present/absent only, closed-day and 7-day edit window", () => {
  let s = seed();
  const a = { type: "attendance.set", date: "2026-11-05", userId: "s1", present: false };
  assert.throws(() => act(s, "s1", a), /not_allowed/);
  s = act(s, "w1", { type: "day.set", date: "2026-11-05", open: false });
  assert.throws(() => act(s, "w1", a), /closed_day/);
  s = act(s, "w1", { type: "day.set", date: "2026-10-20", open: true });
  assert.throws(() => act(s, "w1", { ...a, date: "2026-10-20" }), /locked/);
  assert.throws(
    () => act(s, "w1", { type: "day.set", date: "2026-02-30", open: true }),
    /invalid_input/,
  );
});
test("absence policy starts unset; emits one student/supervisor alert per repeated absence", () => {
  let s = seed();
  assert.equal(s.absenceThreshold, null);
  s = act(s, "w1", { type: "threshold.set", value: 30 });
  s = act(s, "w1", { type: "attendance.set", date: "2026-11-05", userId: "s1", present: false });
  const count = s.alerts.length;
  s = act(s, "w1", { type: "attendance.set", date: "2026-11-05", userId: "s1", present: false });
  assert.equal(s.alerts.length, count);
  assert.equal(count, 2);
});
test("table capacity: one team per rectangle, two per round table", () => {
  let s = seed();
  assert.throws(
    () => act(s, "w1", { type: "table.assign", projectId: "p1", table: "R02" }),
    /capacity/,
  );
  s = act(s, "w1", { type: "table.assign", projectId: "p1", table: "C1" });
  s = act(s, "w1", { type: "table.assign", projectId: "p2", table: "C1" });
  assert.throws(
    () => act(s, "w1", { type: "table.assign", projectId: "p3", table: "C1" }),
    /capacity/,
  );
});
test("tool returns cannot exceed issue quantity; missing items remain outstanding", () => {
  let s = seed();
  assert.throws(
    () =>
      act(s, "w1", { type: "tool.return", id: "p1-tool0", returned: 1, damaged: 1, missing: 0 }),
    /invalid_input/,
  );
  s = act(s, "w1", { type: "tool.return", id: "p1-tool0", returned: 0, damaged: 0, missing: 1 });
  const tool = s.tools.find((t) => t.id === "p1-tool0");
  assert.equal(tool.quantity - tool.returned - tool.damaged, 1);
});
test("observations route only to supervisors, not student accounts", () => {
  const s = act(seed(), "w1", {
    type: "notice.add",
    body: "Visit table",
    projectId: "p1",
    supervisors: true,
    kind: "observation",
  });
  assert.equal(s.alerts.length, 1);
  assert.equal(s.alerts[0].userId, "d1");
  assert.throws(() => act(s, "s1", { type: "notice.view", id: s.notices[0].id }), /not_allowed/);
});
test("new team validates eight digits, uniqueness and 2–3 members; creates automatic conversation", () => {
  let s = seed();
  const a = {
    type: "project.create",
    title: "New team",
    students: [
      { name: "A", number: "13000001" },
      { name: "B", number: "13000002" },
    ],
  };
  assert.throws(() => act(s, "d1", a), /capacity/);
  assert.throws(
    () => act(s, "d6", { ...a, students: [{ name: "A", number: "123" }] }),
    /invalid_input/,
  );
  s = act(s, "d6", a);
  assert.equal(s.projects.length, 24);
  const p = s.projects.at(-1);
  assert.equal(s.threads.find((t) => t.projectId === p.id).memberIds.length, 3);
  assert.throws(() => act(s, "d6", a), /capacity|invalid_input/);
});
test("negative or non-finite budgets and quantities are rejected", () => {
  const s = seed();
  assert.throws(
    () => act(s, "s1", { type: "expense.add", projectId: "p1", title: "Test", amount: NaN }),
    /invalid_input/,
  );
  assert.throws(
    () =>
      act(s, "s1", {
        type: "part.add",
        projectId: "p1",
        name: "Motor",
        quantity: 1.5,
        unitPrice: 1,
      }),
    /invalid_input/,
  );
  assert.throws(
    () => act(s, "s4", { type: "part.status", id: "part1", status: "unused" }),
    /not_allowed/,
  );
});
test("saved learning bookmarks remain private per student", () => {
  let s = act(seed(), "s1", { type: "bookmark.toggle", id: "led" });
  s = act(s, "s2", { type: "bookmark.toggle", id: "led" });
  s = act(s, "s1", { type: "bookmark.toggle", id: "led" });
  assert.deepEqual(s.bookmarks, ["s2:led"]);
});
test("circuit versions, team sharing and public copies never mutate the source snapshot", () => {
  let s = act(seed(), "s1", {
    type: "circuit.save",
    name: "Demo",
    nodes: [{ model: "led-red", x: 0, z: 0 }],
    wires: [],
  });
  const id = s.circuits[0].id;
  assert.throws(
    () => act(s, "s2", { type: "circuit.save", id, name: "Other", nodes: [], wires: [] }),
    /not_allowed/,
  );
  s = act(s, "s1", { type: "circuit.share", id, shared: true, published: "copy" });
  const publicId = s.circuits[0].publishedVersionId;
  s = act(s, "s2", {
    type: "circuit.save",
    id,
    name: "Demo",
    nodes: [{ model: "led-green", x: 1, z: 0 }],
    wires: [],
  });
  assert.equal(s.circuits[0].versions.length, 2);
  assert.equal(s.circuits[0].publishedVersionId, publicId);
  s = act(s, "s4", { type: "circuit.copy", id });
  assert.equal(s.circuits.at(-1).versions.length, 1);
  assert.equal(s.circuits.at(-1).versions[0].nodes[0].model, "led-red");
  assert.equal(s.circuits.at(-1).ownerId, "s4");
  assert.throws(() => act(s, "d1", { type: "circuit.copy", id }), /not_allowed/);
});
test("invalid pins and cable connectors are rejected even when bypassing the UI", () => {
  const s = seed();
  const action = {
    type: "circuit.save",
    name: "Bad",
    nodes: [
      { model: "led-red", x: 0, z: 0 },
      { model: "arduino-uno", x: 3, z: 0 },
    ],
    wires: [{ from: 0, fromPin: 999, to: 1, toPin: 0, color: "#e5484d", kind: "power" }],
  };
  assert.throws(() => act(s, "s1", action), /invalid_input/);
  assert.throws(
    () =>
      act(s, "s1", { ...action, wires: [{ ...action.wires[0], fromPin: 0, kind: "jumper-mm" }] }),
    /invalid_input/,
  );
});
test("JSON storage round-trip retains reports, messages, revisions and actor-specific stars", () => {
  const s = act(seed(), "s1", { type: "message.send", threadId: "self-s1", body: "Saved" });
  const restored = JSON.parse(JSON.stringify(s));
  assert.equal(restored.messages.at(-1).body, "Saved");
  const update = { type: "task.toggle", id: "task-s1" };
  assert.deepEqual(
    applyAction(restored, "s1", update, "roundtrip", now),
    applyAction(s, "s1", update, "roundtrip", now),
  );
  assert.equal(calendarDay(now), "2026-11-05");
});
/* global __dirname */
test("student table moves affect only own team and require manager verification", () => {
  let s = act(seed(), "s1", { type: "table.assign", projectId: "p1", table: "R24" });
  assert.equal(s.projects[0].tableVerified, false);
  assert.throws(
    () => act(s, "s1", { type: "table.assign", projectId: "p2", table: "R25" }),
    /not_allowed/,
  );
  assert.throws(() => act(s, "s1", { type: "table.verify", projectId: "p1" }), /not_allowed/);
  s = act(s, "w1", { type: "table.verify", projectId: "p1" });
  assert.equal(s.projects[0].tableVerified, true);
});
test("manager can issue tools, then record partial returns while tracking remaining quantities", () => {
  let s = act(seed(), "w1", {
    type: "tool.issue",
    projectId: "p1",
    name: "Probe set",
    quantity: 4,
  });
  const tool = s.tools.at(-1);
  s = act(s, "w1", { type: "tool.return", id: tool.id, returned: 2, damaged: 1, missing: 1 });
  const saved = s.tools.at(-1);
  assert.equal(saved.quantity - saved.returned - saved.damaged, 1);
});
test("native catalog, floor and presentation templates retain the web source structure", () => {
  const hardware = require("../assets/data/hardware.json");
  const templates = require("../assets/data/templates.json");
  const floor = require("../assets/data/floor.json");
  assert.equal(hardware.parts.length, 43);
  assert.equal(hardware.models.length, 54);
  assert(
    hardware.parts.every(
      (p) => hardware.models.some((m) => m.id === p.model) && p.def.pins.length > 0,
    ),
  );
  assert.equal(templates.length, 20);
  assert.equal(new Set(templates.map((t) => JSON.stringify(t.composition.shapes))).size, 20);
  assert.equal(floor.tables.filter((t) => t.shape === "rect").length, 25);
  assert.equal(floor.tables.filter((t) => t.shape === "round").length, 3);
});

test("meeting times use Palestine timezone and reject impossible dates", () => {
  const { meetingInstant, meetingDay } = load(path.join(__dirname, "../src/domain/meetingTime.ts"));
  assert.equal(
    new Date(meetingInstant("2026-11-06", "13:00")).toISOString(),
    "2026-11-06T11:00:00.000Z",
  );
  assert.equal(
    new Date(meetingInstant("2026-07-15", "13:00")).toISOString(),
    "2026-07-15T10:00:00.000Z",
  );
  assert(Number.isNaN(meetingInstant("2026-02-30", "13:00")));
  assert(Number.isNaN(meetingInstant("2026-11-06", "24:00")));
  assert.equal(meetingDay(new Date(meetingInstant("2026-11-06", "00:15"))), "2026-11-06");
});
test("meeting changes require the organizer and changed times reset invitation responses", () => {
  let s = act(seed(), "s1", {
    type: "meeting.create",
    title: "Calibration",
    inviteeIds: ["s2"],
    date: "2026-11-06",
    time: "13:00",
    duration: 45,
    location: "Lab 204",
    agenda: "Check readings",
    meetingType: "individual",
  });
  const id = s.meetings.at(-1).id;
  s = act(s, "s2", { type: "meeting.respond", id, response: "accepted" });
  const update = {
    type: "meeting.update",
    id,
    title: "Calibration updated",
    inviteeIds: ["s2"],
    date: "2026-11-07",
    time: "14:00",
    duration: 60,
    location: "Lab 204",
    agenda: "Check readings",
    meetingType: "individual",
  };
  assert.throws(() => act(s, "s2", update), /not_allowed/);
  const old = JSON.stringify(s);
  const n = act(s, "s1", update);
  assert.deepEqual(n.meetings.find((m) => m.id === id).responses, {});
  assert.equal(n.meetings.find((m) => m.id === id).duration, 60);
  assert.equal(JSON.stringify(s), old);
  assert.throws(() => act(s, "s1", { ...update, duration: 241 }), /invalid_input/);
  assert.throws(() => act(s, "s1", { ...update, date: "2026-02-30" }), /invalid_input/);
});
test("meeting notes remain participant-only and completed invitations cannot change", () => {
  let s = seed();
  assert.throws(
    () => act(s, "s4", { type: "meeting.notes", id: "meet1", notes: "No access" }),
    /not_allowed/,
  );
  s = act(s, "s1", { type: "meeting.notes", id: "meet1", notes: "Check supply stability" });
  assert.equal(s.meetings[0].notes, "Check supply stability");
  assert.throws(() => act(s, "s1", { type: "meeting.complete", id: "meet1" }), /not_allowed/);
  s = act(s, "d1", { type: "meeting.complete", id: "meet1" });
  assert.equal(s.meetings[0].completed, true);
  assert.throws(
    () => act(s, "s1", { type: "meeting.respond", id: "meet1", response: "accepted" }),
    /not_allowed/,
  );
});
test("meeting preview examples are added once without replacing notes or existing meetings", () => {
  const { addMeetingPreviewData } = load(path.join(__dirname, "../src/domain/meetingPreview.ts"));
  const s = seed();
  s.meetings[0].notes = "My original notes";
  const n = addMeetingPreviewData(s, now);
  assert.equal(n.meetings.find((m) => m.id === "meet1").notes, "My original notes");
  assert(n.meetings.some((m) => m.completed && m.sample));
  assert.equal(addMeetingPreviewData(n, now), n);
  assert.equal(s.meetingPreviewRevision, undefined);
});
test("presentation draft and submitted snapshot retain template, theme and movable image/text objects", () => {
  const { starterDeck, validDeck } = load(
    path.join(__dirname, "../src/domain/presentation/presentations.ts"),
  );
  const { patchSlideObject, slideScene } = load(
    path.join(__dirname, "../src/domain/presentation/presentationScene.ts"),
  );
  let s = seed();
  const report = s.reports.find((r) => r.projectId === "p1" && r.kind === "presentation");
  const deck = starterDeck("Smart Car");
  deck.template = "margin";
  deck.slides[0] = patchSlideObject(deck.slides[0], "title", { x: 150, y: 90, w: 500, h: 100 });
  deck.slides[0].objects = [
    {
      id: "own-image",
      kind: "image",
      src: "data:image/png;base64,aGVsbG8=",
      x: 200,
      y: 160,
      w: 320,
      h: 180,
      fit: "contain",
      z: 20,
    },
  ];
  assert.equal(validDeck(deck), true);
  let saved = act(s, "s1", {
    type: "report.save",
    id: report.id,
    deck,
    fields: { slide: "Smart Car" },
    template: "margin",
    color: "#738e61",
  });
  s = saved;
  const stored = s.reports.find((r) => r.id === report.id);
  assert.equal(stored.deck.slides[0].objects[0].x, 200);
  const scene = slideScene(stored.deck, stored.deck.slides[0], 0);
  assert.equal(scene.objects.find((o) => o.id === "title").x, 150);
  deck.slides[0].objects[0].x = 777;
  assert.equal(stored.deck.slides[0].objects[0].x, 200);
  const submitted = act(s, "s1", { type: "report.submit", id: report.id });
  assert.equal(
    submitted.reports.find((r) => r.id === report.id).history.at(-1).deck.slides[0].objects[0].x,
    200,
  );
});
test("workshop table moves are atomic, preserve other teams and enforce rectangular/round capacity",()=>{
 const {assignWorkshopTeam,removeWorkshopTeam}=load(path.join(__dirname,"../src/domain/workshopAllocation.ts"));
 const tables=[{code:"R1",shape:"rect",teamIds:["G01"]},{code:"R2",shape:"rect",teamIds:["G02"]},{code:"C1",shape:"round",teamIds:["G03"]}];
 assert.throws(()=>assignWorkshopTeam(tables,"G01","R2"),/full/);assert.deepEqual(tables[0].teamIds,["G01"]);
 const moved=assignWorkshopTeam(tables,"G01","C1");assert.deepEqual(moved[0].teamIds,[]);assert.deepEqual(moved[2].teamIds,["G03","G01"]);assert.deepEqual(tables[0].teamIds,["G01"]);
 assert.throws(()=>assignWorkshopTeam(moved,"G02","C1"),/full/);
 const removed=removeWorkshopTeam(moved,"G01","C1");assert.deepEqual(removed[2].teamIds,["G03"]);assert.deepEqual(removed[1].teamIds,["G02"]);
});
