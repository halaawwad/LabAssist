import "reflect-metadata";
import request from "supertest";
import { randomBytes, createHash } from "node:crypto";
import * as argon2 from "argon2";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { Database } from "../../src/database/database.service";
import { Mailer } from "../../src/mail/services/mailer.service";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const password = "Noor123!Secure";
describe("Sprint 1 real PostgreSQL API", () => {
  let app: any, db: Database, head: any, student: any, headAccess: string;
  const mail: { email: string; url: string }[] = [];
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("_test"))
      throw Error("Dedicated test database required");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Mailer)
      .useValue({
        send: async (email: string, url: string) => {
          mail.push({ email, url });
        },
      })
      .compile();
    app = configureApp(module.createNestApplication(), { logRequest: () => {} });
    await app.init();
    db = app.get(Database);
    await db.$executeRawUnsafe("TRUNCATE labassist_student.accounts CASCADE");
    const encoded = await argon2.hash(password, { type: argon2.argon2id });
    [head] = await db.$queryRaw<
      any[]
    >`INSERT INTO labassist_student.accounts(role,full_name,email,employee_number,status,password_hash,activated_at) VALUES('DEPARTMENT_HEAD','Department Head','head@najah.edu','0','ACTIVE',${encoded},now()) RETURNING id,email`;
    const login = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ role: "DEPARTMENT_HEAD", identifier: head.email, password });
    expect(login.status).toBe(201);
    headAccess = login.body.accessToken;
  });
  afterAll(async () => {
    if (app) await app.close();
  });
  const post = (url: string, data: any, token?: string) => {
    const req = request(app.getHttpServer()).post("/v1" + url);
    if (token) req.set("Authorization", "Bearer " + token);
    return req.send(data);
  };
  it("allows head login with reserved number zero and rejects it for other roles", async () => {
    expect(
      (await post("/auth/login", { role: "DEPARTMENT_HEAD", identifier: "0", password })).status,
    ).toBe(201);
    for (const role of ["STUDENT", "SUPERVISOR", "WORKSHOP_MANAGER"])
      expect((await post("/auth/login", { role, identifier: "0", password })).status).toBe(401);
  });
  it("rejects missing authorization and unknown DTO fields", async () => {
    expect(
      (await post("/accounts", { role: "STUDENT", fullName: "Noor", universityNumber: "12345678" }))
        .status,
    ).toBe(401);
    expect(
      (
        await post(
          "/accounts",
          { role: "STUDENT", fullName: "Noor", universityNumber: "12345678", password: "secret" },
          headAccess,
        )
      ).status,
    ).toBe(400);
  });
  it("creates pending student with generated email and no password or token in response", async () => {
    const r = await post(
      "/accounts",
      { role: "STUDENT", fullName: "Noor Owaissi", universityNumber: "12345678" },
      headAccess,
    );
    expect(r.status).toBe(201);
    student = r.body;
    expect(student.email).toBe("s12345678@stu.najah.edu");
    expect(student.passwordHash).toBeUndefined();
    expect(student.token).toBeUndefined();
    expect(mail.at(-1)?.email).toBe(student.email);
  });
  it("activation is single-use even across two simultaneous connections", async () => {
    const token = new URL(mail.find((m) => m.email === student.email)!.url).searchParams.get(
      "token",
    );
    const results = await Promise.all(
      [1, 2].map(() => post("/auth/activate", { token, email: student.email, password })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const rows = await db.$queryRaw<
      any[]
    >`SELECT status,password_hash FROM labassist_student.accounts WHERE id=${student.id}::uuid`;
    expect(rows[0].status).toBe("ACTIVE");
    expect(rows[0].password_hash).not.toBe(password);
    expect(await argon2.verify(rows[0].password_hash, password)).toBe(true);
  });
  it("student cannot provision another account and me never returns password hashes", async () => {
    const r = await post("/auth/login", { role: "STUDENT", identifier: student.email, password });
    expect(r.status).toBe(201);
    expect(
      (
        await post(
          "/accounts",
          { role: "STUDENT", fullName: "Other", universityNumber: "12345679" },
          r.body.accessToken,
        )
      ).status,
    ).toBe(403);
    const me = await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + r.body.accessToken);
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(student.id);
    expect(JSON.stringify(me.body)).not.toContain("password");
  });
  it("two concurrent provisions create one account and one controlled conflict", async () => {
    const results = await Promise.all(
      [1, 2].map(() =>
        post(
          "/accounts",
          { role: "STUDENT", fullName: "Race", universityNumber: "12345679" },
          headAccess,
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const rows = await db.$queryRaw<
      any[]
    >`SELECT count(*)::int n FROM labassist_student.accounts WHERE university_number='12345679'`;
    expect(rows[0].n).toBe(1);
  });
  it("wrong password, wrong role and disabled accounts cannot sign in", async () => {
    expect(
      (
        await post("/auth/login", {
          role: "STUDENT",
          identifier: student.email,
          password: "wrong-password",
        })
      ).status,
    ).toBe(401);
    expect(
      (await post("/auth/login", { role: "SUPERVISOR", identifier: student.email, password }))
        .status,
    ).toBe(401);
    // Historical disabled state remains denied; no public status-changing API.
    await db.$executeRaw`UPDATE labassist_student.accounts SET status='DISABLED' WHERE id=${student.id}::uuid`;
    try {
      expect(
        (await post("/auth/login", { role: "STUDENT", identifier: student.email, password }))
          .status,
      ).toBe(401);
      await request(app.getHttpServer())
        .patch("/v1/accounts/" + student.id + "/status")
        .set("Authorization", "Bearer " + headAccess)
        .send({ status: "ACTIVE" })
        .expect(404);
    } finally {
      await db.$executeRaw`UPDATE labassist_student.accounts SET status='ACTIVE' WHERE id=${student.id}::uuid`;
    }
  });
  it("staff use their university number; refresh rotates once and logout revokes access", async () => {
    for (const [role, employeeNumber] of [
      ["SUPERVISOR", "1024"],
      ["WORKSHOP_MANAGER", "10001"],
    ]) {
      const email = role.toLowerCase() + "@najah.edu";
      expect(
        (await post("/accounts", { role, employeeNumber, email, fullName: role }, headAccess))
          .status,
      ).toBe(201);
      const token = new URL(mail.find((m) => m.email === email)!.url).searchParams.get("token");
      expect((await post("/auth/activate", { email, token, password })).status).toBe(201);
      const login = await post("/auth/login", { role, identifier: employeeNumber, password });
      expect(login.status).toBe(201);
      const race = await Promise.all(
        [1, 2].map(() => post("/auth/refresh", { refreshToken: login.body.refreshToken })),
      );
      expect(race.map((r) => r.status).sort()).toEqual([201, 401]);
      const winner = race.find((r) => r.status === 201)!;
      expect((await post("/auth/logout", {}, winner.body.accessToken)).status).toBe(201);
      await request(app.getHttpServer())
        .get("/v1/auth/me")
        .set("Authorization", "Bearer " + winner.body.accessToken)
        .expect(401);
    }
  });
  it("password reset is generic, single-use and revokes existing sessions", async () => {
    const login = await post("/auth/login", {
      role: "STUDENT",
      identifier: student.email,
      password,
    });
    const known = await post("/auth/forgot-password", { email: student.email }),
      unknown = await post("/auth/forgot-password", { email: "unknown@najah.edu" });
    expect(known.body).toEqual(unknown.body);
    const token = new URL(
      mail.filter((m) => m.email === student.email).at(-1)!.url,
    ).searchParams.get("token");
    const replacement = "NewPassword123!";
    expect((await post("/auth/reset-password", { token, password: replacement })).status).toBe(201);
    expect((await post("/auth/reset-password", { token, password: replacement })).status).toBe(400);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + login.body.accessToken)
      .expect(401);
    expect(
      (await post("/auth/login", { role: "STUDENT", identifier: student.email, password })).status,
    ).toBe(401);
    expect(
      (
        await post("/auth/login", {
          role: "STUDENT",
          identifier: student.email,
          password: replacement,
        })
      ).status,
    ).toBe(201);
  });
  it("expired invitations are refused and can be reissued by the head", async () => {
    const pending = await post(
      "/accounts",
      { role: "STUDENT", fullName: "Expired", universityNumber: "12345680" },
      headAccess,
    );
    const old = new URL(mail.at(-1)!.url).searchParams.get("token");
    await db.$executeRaw`UPDATE labassist_student.activation_invitations SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE student_id=${pending.body.id}::uuid`;
    expect(
      (await post("/auth/activate", { token: old, email: pending.body.email, password })).status,
    ).toBe(400);
    expect(
      (await post("/accounts/" + pending.body.id + "/invitation", {}, headAccess)).status,
    ).toBe(201);
    const token = new URL(mail.at(-1)!.url).searchParams.get("token");
    expect(token).not.toBe(old);
    expect(
      (await post("/auth/activate", { token, email: pending.body.email, password })).status,
    ).toBe(201);
  });
  it("expired access requires refresh, rotation invalidates old access, and expired refresh is refused", async () => {
    const login = await post("/auth/login", { role: "SUPERVISOR", identifier: "1024", password });
    expect(login.status).toBe(201);
    await db.$executeRaw`UPDATE labassist_student.auth_sessions SET access_expires_at=now()-interval '1 minute' WHERE access_hash=${hash(login.body.accessToken)}`;
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + login.body.accessToken)
      .expect(401);
    const rotated = await post("/auth/refresh", { refreshToken: login.body.refreshToken });
    expect(rotated.status).toBe(201);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + rotated.body.accessToken)
      .expect(200);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + login.body.accessToken)
      .expect(401);
    await db.$executeRaw`UPDATE labassist_student.auth_sessions SET expires_at=now()-interval '1 minute' WHERE refresh_hash=${hash(rotated.body.refreshToken)}`;
    expect((await post("/auth/refresh", { refreshToken: rotated.body.refreshToken })).status).toBe(
      401,
    );
  });
  it("all three non-head roles are denied account administration even with valid sessions", async () => {
    for (const [role, identifier, pw] of [
      ["STUDENT", student.email, "NewPassword123!"],
      ["SUPERVISOR", "1024", password],
      ["WORKSHOP_MANAGER", "10001", password],
    ]) {
      const login = await post("/auth/login", { role, identifier, password: pw });
      expect(login.status).toBe(201);
      const bearer = "Bearer " + login.body.accessToken;
      await request(app.getHttpServer())
        .get("/v1/accounts")
        .set("Authorization", bearer)
        .expect(403);
      await request(app.getHttpServer())
        .patch("/v1/accounts/" + student.id)
        .set("Authorization", bearer)
        .send({ fullName: "Forbidden rename" })
        .expect(403);
      expect(
        (await post("/accounts/" + student.id + "/invitation", {}, login.body.accessToken)).status,
      ).toBe(403);
    }
  });
  it("a committed rotation with a lost response rejects the old tokens and permits fresh login", async () => {
    const created = await post(
      "/accounts",
      { role: "STUDENT", fullName: "Rotation recovery", universityNumber: "12345990" },
      headAccess,
    );
    expect(created.status).toBe(201);
    const token = new URL(
      mail.filter((m) => m.email === created.body.email).at(-1)!.url,
    ).searchParams.get("token");
    expect(
      (await post("/auth/activate", { email: created.body.email, token, password })).status,
    ).toBe(201);
    const signedIn = await post("/auth/login", {
      role: "STUDENT",
      identifier: created.body.email,
      password,
    });
    expect(signedIn.status).toBe(201);
    // The server commits; the client is assumed to have lost this response.
    const rotated = await post("/auth/refresh", { refreshToken: signedIn.body.refreshToken });
    expect(rotated.status).toBe(201);
    expect((await post("/auth/refresh", { refreshToken: signedIn.body.refreshToken })).status).toBe(
      401,
    );
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + signedIn.body.accessToken)
      .expect(401);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + rotated.body.accessToken)
      .expect(200);
    expect(
      (await post("/auth/login", { role: "STUDENT", identifier: created.body.email, password }))
        .status,
    ).toBe(201);
  });
  it("logout revokes only its session and a fresh login never revives logged-out tokens", async () => {
    const sessions = await Promise.all(
      [1, 2].map(() =>
        post("/auth/login", {
          role: "SUPERVISOR",
          identifier: "1024",
          password,
        }),
      ),
    );
    for (const s of sessions) expect(s.status).toBe(201);
    expect((await post("/auth/logout", {}, sessions[0].body.accessToken)).status).toBe(201);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + sessions[0].body.accessToken)
      .expect(401);
    expect(
      (await post("/auth/refresh", { refreshToken: sessions[0].body.refreshToken })).status,
    ).toBe(401);
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + sessions[1].body.accessToken)
      .expect(200);
    expect(
      (await post("/auth/login", { role: "SUPERVISOR", identifier: "1024", password })).status,
    ).toBe(201);
    expect(
      (await post("/auth/refresh", { refreshToken: sessions[0].body.refreshToken })).status,
    ).toBe(401);
  });
  it("concurrent password-reset consumers have one winner and revoke every prior session", async () => {
    const login = await post("/auth/login", { role: "SUPERVISOR", identifier: "1024", password });
    const email = login.body.account.email;
    await post("/auth/forgot-password", { email });
    const token = new URL(mail.filter((m) => m.email === email).at(-1)!.url).searchParams.get(
      "token",
    );
    const passwords = ["WinnerPassword123!", "OtherPassword123!"];
    const results = await Promise.all(
      passwords.map((password) => post("/auth/reset-password", { token, password })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
    const winner = results.findIndex((r) => r.status === 201);
    const [saved] = await db.$queryRaw<
      any[]
    >`SELECT password_hash FROM labassist_student.accounts WHERE id=${login.body.account.id}::uuid`;
    expect(await argon2.verify(saved.password_hash, passwords[winner])).toBe(true);
    expect(await argon2.verify(saved.password_hash, passwords[1 - winner])).toBe(false);
    expect((await post("/auth/refresh", { refreshToken: login.body.refreshToken })).status).toBe(
      401,
    );
    expect(
      (
        await post("/auth/login", {
          role: "SUPERVISOR",
          identifier: "1024",
          password: passwords[winner],
        })
      ).status,
    ).toBe(201);
  });
  it("sets browser security headers and only grants CORS to configured origins", async () => {
    const origin = (process.env.CORS_ORIGINS ?? "http://localhost:8081").split(",")[0];
    const allowed = await request(app.getHttpServer())
      .get("/v1/health")
      .set("Origin", origin)
      .expect(200);
    expect(allowed.headers["access-control-allow-origin"]).toBe(origin);
    expect(allowed.headers["x-content-type-options"]).toBe("nosniff");
    expect(allowed.headers["content-security-policy"]).toContain("default-src 'self'");
    const blocked = await request(app.getHttpServer())
      .get("/v1/health")
      .set("Origin", "https://untrusted.invalid");
    expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
  });
  it("prevents browsers from caching account identities and authentication failures", async () => {
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .set("Authorization", "Bearer " + headAccess)
      .expect(200)
      .expect("Cache-Control", "no-store");
    await request(app.getHttpServer())
      .get("/v1/auth/me")
      .expect(401)
      .expect("Cache-Control", "no-store");
  });
  it("correlates API errors with a safe request ID and documents response DTOs in Swagger", async () => {
    const id = "7c195459-977d-449d-aab2-5cc71a724574";
    const invalid = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .set("X-Request-ID", id)
      .send({ password: "do-not-echo-this" })
      .expect(400);
    expect(invalid.headers["x-request-id"]).toBe(id);
    expect(invalid.body.requestId).toBe(id);
    expect(JSON.stringify(invalid.body)).not.toContain("do-not-echo-this");
    const docs = await request(app.getHttpServer()).get("/docs-json").expect(200);
    expect(
      docs.body.components.schemas.AccountResponseDto.properties.password_hash,
    ).toBeUndefined();
    expect(
      docs.body.paths["/v1/auth/login"].post.responses["201"].content["application/json"].schema
        .$ref,
    ).toContain("SessionResponseDto");
  });
  it("head updates an account name without changing login identity or activation", async () => {
    const created = await post(
      "/accounts",
      { role: "STUDENT", fullName: "Original Name", universityNumber: "99112233" },
      headAccess,
    );
    expect(created.status).toBe(201);
    await request(app.getHttpServer())
      .patch(`/v1/accounts/${created.body.id}`)
      .set("Authorization", "Bearer " + headAccess)
      .send({ fullName: "  Updated Name  " })
      .expect(200);
    const rows = await db.$queryRaw<
      any[]
    >`SELECT full_name,email,university_number,status,password_hash FROM labassist_student.accounts WHERE id=${created.body.id}::uuid`;
    expect(rows[0]).toMatchObject({
      full_name: "Updated Name",
      email: "s99112233@stu.najah.edu",
      university_number: "99112233",
      status: "PENDING_ACTIVATION",
      password_hash: null,
    });
    const audit = await db.$queryRaw<
      any[]
    >`SELECT actor_id FROM labassist_student.audit_events WHERE event_key='ACCOUNT_NAME_CHANGED' AND subject_id=${created.body.id}::uuid`;
    expect(audit).toEqual([{ actor_id: head.id }]);
    for (const body of [
      { fullName: " " },
      { fullName: "Another Name", role: "DEPARTMENT_HEAD" },
      { fullName: "Another Name", email: "other@najah.edu" },
    ])
      await request(app.getHttpServer())
        .patch(`/v1/accounts/${created.body.id}`)
        .set("Authorization", "Bearer " + headAccess)
        .send(body)
        .expect(400);
    await request(app.getHttpServer())
      .patch(`/v1/accounts/${head.id}`)
      .set("Authorization", "Bearer " + headAccess)
      .send({ fullName: "Other Head" })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/v1/accounts/${created.body.id}`)
      .send({ fullName: "Unauthorized" })
      .expect(401);
    const list = await request(app.getHttpServer())
      .get("/v1/accounts")
      .set("Authorization", "Bearer " + headAccess)
      .expect(200);
    expect(list.body.find((a: any) => a.id === created.body.id).fullName).toBe("Updated Name");
    expect(JSON.stringify(list.body)).not.toContain("password_hash");
  });
});
