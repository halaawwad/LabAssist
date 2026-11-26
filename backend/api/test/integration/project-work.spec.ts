import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { Database } from "../../src/database/database.service";
import { Mailer } from "../../src/mail/services/mailer.service";
import { MailQueue } from "../../src/mail/services/mail-queue.service";

describe("Sprint 2A project workspace", () => {
  let app: INestApplication;
  let projectId: string;
  let teammateId: string;
  let outsiderId: string;
  const tokens: Record<string, string> = {};
  const password = "WorkspaceTest123!";
  const call = (method: "get" | "post" | "patch", path: string, user?: string) => {
    const req = request(app.getHttpServer())[method]("/v1/projects" + path);
    return user ? req.set("Authorization", "Bearer " + tokens[user]) : req;
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("_test"))
      throw Error("Dedicated test database required");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Mailer)
      .useValue({ send: async () => undefined })
      .overrideProvider(MailQueue)
      .useValue({})
      .compile();
    app = configureApp(module.createNestApplication());
    await app.init();
    const db = app.get(Database);
    await db.$executeRawUnsafe("TRUNCATE labassist_student.accounts CASCADE");
    const hash = await argon2.hash(password);
    const createAccount = async (
      role: string,
      name: string,
      email: string,
      creator: string | null,
      university: string | null = null,
      employee: string | null = null,
    ) => {
      const [row] = await db.$queryRaw<{ id: string }[]>`
        INSERT INTO labassist_student.accounts
          (role, full_name, email, university_number, employee_number, created_by,
           status, password_hash, activated_at)
        VALUES (${role}, ${name}, ${email}, ${university}, ${employee}, ${creator}::uuid,
          'ACTIVE', ${hash}, now())
        RETURNING id
      `;
      return row.id;
    };
    const head = await createAccount("DEPARTMENT_HEAD", "Head", "head@najah.edu", null);
    const advisor = await createAccount(
      "SUPERVISOR",
      "Advisor",
      "advisor@najah.edu",
      head,
      null,
      "3010",
    );
    const accounts = new Map<string, string>();
    for (const [name, number] of Object.entries({
      member: "20263001",
      teammate: "20263002",
      outsider: "20263003",
      other: "20263004",
    })) {
      const email = "s" + number + "@stu.najah.edu";
      accounts.set(name, await createAccount("STUDENT", name, email, head, number));
      const res = await request(app.getHttpServer())
        .post("/v1/auth/login")
        .send({ role: "STUDENT", identifier: email, password })
        .expect(201);
      tokens[name] = res.body.accessToken;
    }
    const supervisor = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ role: "SUPERVISOR", identifier: "3010", password })
      .expect(201);
    tokens.advisor = supervisor.body.accessToken;
    teammateId = accounts.get("teammate")!;
    outsiderId = accounts.get("outsider")!;

    await db.$transaction(async (tx) => {
      const [term] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO labassist_student.academic_terms(name, starts_on)
        VALUES ('Workspace term', (now() AT TIME ZONE 'Asia/Hebron')::date) RETURNING id
      `;
      await tx.$executeRaw`INSERT INTO labassist_student.term_workshop_capacity(term_id) VALUES (${term.id}::uuid)`;
      for (const student of accounts.values()) {
        await tx.$executeRaw`
          INSERT INTO labassist_student.student_enrollments(student_id, term_id)
          VALUES (${student}::uuid, ${term.id}::uuid)
        `;
      }
      const makeTeam = async (name: string, students: string[]) => {
        const [project] = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO labassist_student.projects(term_id, name, formed_by)
          VALUES (${term.id}::uuid, ${name}, ${head}::uuid) RETURNING id
        `;
        await tx.$executeRaw`
          INSERT INTO labassist_student.project_supervisors(project_id, supervisor_id)
          VALUES (${project.id}::uuid, ${advisor}::uuid)
        `;
        for (const student of students) {
          await tx.$executeRaw`
            INSERT INTO labassist_student.project_students(project_id, term_id, student_id)
            VALUES (${project.id}::uuid, ${term.id}::uuid, ${student}::uuid)
          `;
        }
        return project.id;
      };
      projectId = await makeTeam("Shared project", [accounts.get("member")!, teammateId]);
      await makeTeam("Other project", [outsiderId, accounts.get("other")!]);
    });
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("returns the same workspace to teammates and the assigned supervisor, and hides it from another team", async () => {
    await call("get", "/mine").expect(401);
    const mine = await call("get", "/mine", "member").expect(200);
    expect(mine.body).toMatchObject({ id: projectId, tasks: [], issues: [] });
    expect(mine.body.students.map(({ name }: { name: string }) => name)).toEqual([
      "member",
      "teammate",
    ]);
    expect(mine.body.supervisors).toEqual([{ id: expect.any(String), name: "Advisor" }]);
    for (const user of ["teammate", "advisor"]) {
      const response = await call("get", "/" + projectId, user).expect(200);
      expect(response.body).toEqual(mine.body);
    }
    await call("get", "/" + projectId, "outsider").expect(404);
  });

  it("rejects cross-team edits and preserves one of two simultaneous detail edits", async () => {
    const { body } = await call("get", "/mine", "member").expect(200);
    const path = "/" + projectId;
    const details = {
      expectedUpdatedAt: body.updatedAt,
      name: "Updated",
      subtitle: "",
      abstract: "Abstract",
    };
    await call("patch", path, "outsider").send(details).expect(404);
    await call("patch", path, "advisor").send(details).expect(403);
    const replies = await Promise.all(
      ["member", "teammate"].map((user) =>
        call("patch", path, user).send({ ...details, name: user + " edit" }),
      ),
    );
    expect(replies.map((reply) => reply.status).sort()).toEqual([200, 409]);
    const refreshed = await call("get", "/mine", "teammate").expect(200);
    expect(refreshed.body.name).toBe(replies[0].status === 200 ? "member edit" : "teammate edit");
  });

  it("lets the assignee alone update status and rejects stale task revisions", async () => {
    const path = "/" + projectId + "/tasks";
    const task = {
      assignedTo: teammateId,
      title: "Prototype",
      description: "",
      dueOn: "2026-12-01",
    };
    await call("post", path, "member")
      .send({ ...task, assignedTo: outsiderId })
      .expect(400);
    const created = await call("post", path, "member").send(task).expect(201);
    const resource = path + "/" + created.body.id;
    const update = { status: "DONE", expectedRevision: 0, needsHelp: false };
    await call("patch", resource, "member").send(update).expect(403);
    const replies = await Promise.all(
      [1, 2].map(() => call("patch", resource, "teammate").send(update)),
    );
    expect(replies.map((reply) => reply.status).sort()).toEqual([200, 409]);
    const workspace = await call("get", "/mine", "member").expect(200);
    expect(workspace.body.tasks).toEqual([
      expect.objectContaining({ status: "DONE", revision: 1 }),
    ]);
  });

  it("lets a teammate resolve a shared issue and rejects stale or cross-team writes", async () => {
    const path = "/" + projectId + "/issues";
    const issue = { title: "Calibration", description: "Review results", priority: "HIGH" };
    const created = await call("post", path, "member").send(issue).expect(201);
    const resource = path + "/" + created.body.id;
    const resolved = {
      ...issue,
      expectedRevision: 0,
      status: "RESOLVED",
      resolution: "Recalibrated",
    };
    await call("patch", resource, "outsider").send(resolved).expect(404);
    await call("patch", resource, "teammate")
      .send({ ...resolved, resolution: " " })
      .expect(400);
    const replies = await Promise.all(
      ["member", "teammate"].map((user) => call("patch", resource, user).send(resolved)),
    );
    expect(replies.map((reply) => reply.status).sort()).toEqual([200, 409]);
    const workspace = await call("get", "/mine", "member").expect(200);
    expect(workspace.body.issues).toEqual([
      expect.objectContaining({ status: "RESOLVED", resolution: "Recalibrated", revision: 1 }),
    ]);
  });
});
