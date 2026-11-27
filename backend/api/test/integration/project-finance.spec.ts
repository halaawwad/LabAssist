import "reflect-metadata";
import { Test } from "@nestjs/testing";
import request from "supertest";
import * as argon2 from "argon2";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { Database } from "../../src/database/database.service";
import { Mailer } from "../../src/mail/services/mailer.service";
import { randomUUID } from "node:crypto";
describe("Sprint 2B project finance", () => {
  let app: any, db: Database, pid: string, otherPid: string, bom: any, expense: any;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};
  const call = (
    method: "get" | "post" | "put" | "patch",
    suffix: string,
    who = "a",
    body?: any,
  ) => {
    const r = (request(app.getHttpServer()) as any)[method]("/v1/projects/" + pid + suffix);
    if (who) r.set("Authorization", "Bearer " + tokens[who]);
    return body === undefined ? r : r.send(body);
  };
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("_test"))
      throw Error("Disposable test database required");
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Mailer)
      .useValue({ send: async () => {} })
      .compile();
    app = configureApp(mod.createNestApplication());
    await app.init();
    db = app.get(Database);
    await db.$executeRawUnsafe("TRUNCATE labassist_student.accounts CASCADE");
    const hash = await argon2.hash("FinanceTest123!");
    const head = (
      await db.$queryRaw<
        any[]
      >`INSERT INTO labassist_student.accounts(role,full_name,email,status,password_hash,activated_at) VALUES('DEPARTMENT_HEAD','Head','head@najah.edu','ACTIVE',${hash},now()) RETURNING id`
    )[0].id;
    const sup = (
      await db.$queryRaw<
        any[]
      >`INSERT INTO labassist_student.accounts(role,full_name,email,employee_number,created_by,status,password_hash,activated_at) VALUES('SUPERVISOR','Supervisor','finance.sup@najah.edu','3010',${head}::uuid,'ACTIVE',${hash},now()) RETURNING id`
    )[0].id;
    for (const [name, num] of Object.entries({
      a: "20264001",
      b: "20264002",
      c: "20264003",
      d: "20264004",
    })) {
      ids[name] = (
        await db.$queryRaw<
          any[]
        >`INSERT INTO labassist_student.accounts(role,full_name,email,university_number,created_by,status,password_hash,activated_at) VALUES('STUDENT',${name},${"s" + num + "@stu.najah.edu"},${num},${head}::uuid,'ACTIVE',${hash},now()) RETURNING id`
      )[0].id;
      tokens[name] = (
        await request(app.getHttpServer())
          .post("/v1/auth/login")
          .send({
            role: "STUDENT",
            identifier: "s" + num + "@stu.najah.edu",
            password: "FinanceTest123!",
          })
          .expect(201)
      ).body.accessToken;
    }
    tokens.sup = (
      await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ role: "SUPERVISOR", identifier: "3010", password: "FinanceTest123!" })
        .expect(201)
    ).body.accessToken;
    await db.$transaction(async (tx) => {
      const term = (
        await tx.$queryRaw<
          any[]
        >`INSERT INTO labassist_student.academic_terms(name,starts_on) VALUES('Finance test',current_date) RETURNING id`
      )[0].id;
      await tx.$executeRaw`INSERT INTO labassist_student.term_workshop_capacity(term_id) VALUES(${term}::uuid)`;
      for (const student of Object.values(ids))
        await tx.$executeRaw`INSERT INTO labassist_student.student_enrollments(student_id,term_id) VALUES(${student}::uuid,${term}::uuid)`;
      for (const pair of [
        ["a", "b"],
        ["c", "d"],
      ]) {
        const p = (
          await tx.$queryRaw<
            any[]
          >`INSERT INTO labassist_student.projects(term_id,name,formed_by) VALUES(${term}::uuid,'Finance project',${head}::uuid) RETURNING id`
        )[0].id;
        await tx.$executeRaw`INSERT INTO labassist_student.project_supervisors(project_id,supervisor_id) VALUES(${p}::uuid,${sup}::uuid)`;
        for (const name of pair)
          await tx.$executeRaw`INSERT INTO labassist_student.project_students(project_id,term_id,student_id) VALUES(${p}::uuid,${term}::uuid,${ids[name]}::uuid)`;
        if (pair[0] === "a") pid = p;
        else otherPid = p;
      }
    });
  });
  afterAll(async () => {
    await app?.close();
  });
  it("protects finance from unauthenticated, other-team and supervisor access and starts without invented budget", async () => {
    await call("get", "/finance", "").expect(401);
    await call("get", "/finance", "c").expect(404);
    await call("get", "/finance", "sup").expect(403);
    expect((await call("get", "/finance").expect(200)).body).toMatchObject({
      budget: null,
      bom: [],
      expenses: [],
    });
    await call("post", "/bom", "a", {
      name: "Sensor",
      quantityRequired: 1,
      estimatedUnitPrice: "10.00",
      notes: "",
    }).expect(400);
  });
  it("serializes initial budgets and rejects stale revisions and currency changes", async () => {
    const results = await Promise.all(
      ["a", "b"].map((who) =>
        call("put", "/budget", who, { amount: "100.00", currency: "ILS", expectedRevision: null }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const edits = await Promise.all(
      ["a", "b"].map((who) =>
        call("put", "/budget", who, { amount: "120.00", currency: "ILS", expectedRevision: 0 }),
      ),
    );
    expect(edits.map((r) => r.status).sort()).toEqual([200, 409]);
    await call("put", "/budget", "a", {
      amount: "120.00",
      currency: "USD",
      expectedRevision: 1,
    }).expect(400);
    await call("put", "/budget", "a", {
      amount: "-1",
      currency: "ILS",
      expectedRevision: 1,
    }).expect(400);
  });
  it("shares BOM, allows an unknown estimate and guards concurrent edits", async () => {
    bom = (
      await call("post", "/bom", "a", {
        name: "Light sensor",
        quantityRequired: 3,
        estimatedUnitPrice: "10.00",
        notes: "LDR module",
      }).expect(201)
    ).body;
    const edits = await Promise.all(
      ["a", "b"].map((who) =>
        call("patch", "/bom/" + bom.id, who, {
          expectedRevision: 0,
          name: "Light sensor",
          quantityRequired: 3,
          estimatedUnitPrice: "10.00",
          notes: "Shared note",
          isNeeded: true,
          notNeededReason: "",
        }),
      ),
    );
    expect(edits.map((r) => r.status).sort()).toEqual([200, 409]);
    const unknown = (
      await call("post", "/bom", "b", {
        name: "Enclosure",
        quantityRequired: 1,
        estimatedUnitPrice: null,
        notes: "",
      }).expect(201)
    ).body;
    expect(unknown.estimatedUnitPrice).toBeNull();
    const f = (await call("get", "/finance", "b").expect(200)).body;
    expect(f.bom).toHaveLength(2);
    expect(f.budget).toMatchObject({ amount: "120.00", estimatedKnown: "30.00", unpricedItems: 1 });
  });
  it("posts a simultaneous duplicate purchase once and derives the totals and acquired quantity", async () => {
    const body = {
      requestKey: randomUUID(),
      purchasedOn: "2026-11-01",
      sellerName: "Parts shop",
      lines: [{ bomItemId: bom.id, label: "Light sensor", quantity: 2, unitPrice: "9.50" }],
    };
    const results = await Promise.all([
      call("post", "/expenses", "a", body),
      call("post", "/expenses", "a", body),
    ]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);
    expect(results[0].body.id).toBe(results[1].body.id);
    expense = results[0].body;
    const f = (await call("get", "/finance", "b")).body;
    expect(f.expenses).toHaveLength(1);
    expect(f.budget).toMatchObject({ spent: "19.00", remaining: "101.00" });
    expect(f.bom.find((x: any) => x.id === bom.id)).toMatchObject({
      acquiredQuantity: 2,
      missingQuantity: 1,
      supplyStatus: "PARTIAL",
    });
    await call("post", "/expenses", "a", { ...body, sellerName: "Changed seller" }).expect(409);
  });
  it("rolls back a purchase with an item from a different team and rejects receipt/actor spoofing", async () => {
    await db.$executeRaw`INSERT INTO labassist_student.project_budgets(project_id,currency,amount,created_by,updated_by) VALUES(${otherPid}::uuid,'ILS',100,${ids.c}::uuid,${ids.c}::uuid)`;
    const foreign = (
      await db.$queryRaw<
        any[]
      >`INSERT INTO labassist_student.project_bom_items(project_id,name,quantity_required,created_by,updated_by) VALUES(${otherPid}::uuid,'Foreign part',1,${ids.c}::uuid,${ids.c}::uuid) RETURNING id`
    )[0].id;
    const body = {
      requestKey: randomUUID(),
      purchasedOn: "2026-11-01",
      sellerName: "Shop",
      lines: [{ bomItemId: foreign, label: "Invalid", quantity: 1, unitPrice: "1.00" }],
    };
    await call("post", "/expenses", "a", body).expect(400);
    await call("post", "/expenses", "a", { ...body, createdBy: ids.c }).expect(400);
    await call("post", "/expenses", "a", {
      ...body,
      receiptFileId: randomUUID(),
      lines: [{ label: "Receipt test", quantity: 1, unitPrice: "1.00" }],
    }).expect(400);
    expect((await call("get", "/finance")).body.expenses).toHaveLength(1);
  });
  it("marks a part not needed without deleting purchase history and voids a purchase once", async () => {
    await call("patch", "/bom/" + bom.id, "b", {
      expectedRevision: 1,
      name: "Light sensor",
      quantityRequired: 3,
      estimatedUnitPrice: "10.00",
      notes: "",
      isNeeded: false,
      notNeededReason: "Not required in the final design",
    }).expect(200);
    expect((await call("get", "/finance")).body.budget.spent).toBe("19.00");
    const results = await Promise.all(
      ["a", "b"].map((who) =>
        call("post", "/expenses/" + expense.id + "/void", who, {
          expectedRevision: expense.revision,
          reason: "Returned to supplier",
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const f = (await call("get", "/finance")).body;
    expect(f.budget).toMatchObject({ spent: "0.00", remaining: "120.00", estimatedKnown: "0.00" });
    expect(f.expenses[0]).toMatchObject({ status: "VOIDED", amount: "19.00" });
    expect(f.bom.find((x: any) => x.id === bom.id)).toMatchObject({
      isNeeded: false,
      acquiredQuantity: 0,
      supplyStatus: "NOT_NEEDED",
    });
  });
  it("rejects invalid prices and future purchases and supports a zero budget without hiding overspend", async () => {
    await call("post", "/expenses", "a", {
      requestKey: randomUUID(),
      purchasedOn: "2099-01-01",
      sellerName: "",
      lines: [{ label: "Future", quantity: 1, unitPrice: "1.00" }],
    }).expect(400);
    await call("post", "/expenses", "a", {
      requestKey: randomUUID(),
      purchasedOn: "2026-11-01",
      sellerName: "",
      lines: [{ label: "Invalid price", quantity: 1, unitPrice: "1.001" }],
    }).expect(400);
    await call("put", "/budget", "a", {
      amount: "0.00",
      currency: "ILS",
      expectedRevision: 1,
    }).expect(200);
    await call("post", "/expenses", "a", {
      requestKey: randomUUID(),
      purchasedOn: "2026-11-01",
      sellerName: "",
      lines: [{ label: "Over budget", quantity: 1, unitPrice: "1.00" }],
    }).expect(201);
    expect((await call("get", "/finance")).body.budget).toMatchObject({
      amount: "0.00",
      spent: "1.00",
      remaining: "-1.00",
    });
  });
  it("documents finance contracts and makes archived projects read-only", async () => {
    const docs = (await request(app.getHttpServer()).get("/docs-json").expect(200)).body;
    expect(
      docs.paths["/v1/projects/{projectId}/finance"].get.responses["200"].content[
        "application/json"
      ].schema.$ref,
    ).toContain("ProjectFinanceResponse");
    expect(docs.components.schemas.ExpenseDto.properties.requestKey).toBeDefined();
    await db.$executeRaw`UPDATE labassist_student.projects SET status='ARCHIVED' WHERE id=${pid}::uuid`;
    expect((await call("get", "/finance")).body.readOnly).toBe(true);
    await call("put", "/budget", "a", {
      amount: "10.00",
      currency: "ILS",
      expectedRevision: 2,
    }).expect(403);
  });
});
