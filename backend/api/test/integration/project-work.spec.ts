import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as argon2 from "argon2";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { Database } from "../../src/database/database.service";
import type { ProjectGroupRecord } from "../../../../shared/contracts/project-work";
import { Mailer } from "../../src/mail/services/mailer.service";
import { MailQueue } from "../../src/mail/services/mail-queue.service";

describe("Sprint 2A project workspace", () => {
  let app: INestApplication;
  let projectId: string;
  let teammateId: string;
  let outsiderId: string;
  let termId: string;
  let spareId: string;
  const groupPath = "/v1/department/project-groups";
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
    const otherAdvisor = await createAccount(
      "SUPERVISOR",
      "Other advisor",
      "other-advisor@najah.edu",
      head,
      null,
      "3011",
    );
    const accounts = new Map<string, string>();
    for (const [name, number] of Object.entries({
      member: "20263001",
      teammate: "20263002",
      outsider: "20263003",
      other: "20263004",
      spare: "20263005",
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

    spareId = accounts.get("spare")!;
    const headSession = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ role: "DEPARTMENT_HEAD", identifier: "head@najah.edu", password })
      .expect(201);
    tokens.head = headSession.body.accessToken;

    const [term] = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO labassist_student.academic_terms(name, starts_on)
      VALUES ('Workspace term', (now() AT TIME ZONE 'Asia/Hebron')::date) RETURNING id
    `;
    termId = term.id;
    await db.$executeRaw`INSERT INTO labassist_student.term_workshop_capacity(term_id) VALUES (${termId}::uuid)`;
    const makeTeam = async (
      title: string,
      projectNumber: string,
      studentIds: string[],
      supervisorId = advisor,
    ) => {
      const response = await request(app.getHttpServer())
        .post(groupPath)
        .set("Authorization", "Bearer " + tokens.head)
        .send({
          title,
          projectNumber,
          studentIds,
          termId,
          supervisorIds: [supervisorId],
          confirmedTransfer: false,
        })
        .expect(201);
      return response.body.id as string;
    };
    projectId = await makeTeam("Shared project", "P-1", [accounts.get("member")!, teammateId]);
    await makeTeam("Other project", "P-2", [outsiderId, accounts.get("other")!], otherAdvisor);
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
    const supervised = await call("get", "/supervised", "advisor").expect(200);
    expect(supervised.body).toEqual([mine.body]);
    await call("get", "/supervised", "member").expect(403);
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

  it("serializes concurrent group changes and preserves a student's earlier membership on rejoining", async () => {
    const getGroups = () =>
      request(app.getHttpServer())
        .get(groupPath)
        .set("Authorization", "Bearer " + tokens.head);
    await request(app.getHttpServer())
      .get(groupPath)
      .set("Authorization", "Bearer " + tokens.member)
      .expect(403);
    const initial = await getGroups().expect(200);
    expect(initial.body.openTerms).toContainEqual({ id: termId, name: "Workspace term" });
    const group = initial.body.groups.find((item: { id: string }) => item.id === projectId);
    const { title, projectNumber, supervisorIds, updatedAt: expectedUpdatedAt } = group;
    const base = {
      title,
      projectNumber,
      supervisorIds,
      termId,
      expectedUpdatedAt,
      confirmedTransfer: false,
    };
    const patch = (studentIds: string[], revision = expectedUpdatedAt) =>
      request(app.getHttpServer())
        .patch(groupPath + "/" + projectId)
        .set("Authorization", "Bearer " + tokens.head)
        .send({ ...base, expectedUpdatedAt: revision, studentIds });
    const next = group.studentIds.map((id: string) => (id === teammateId ? spareId : id));
    const replies = await Promise.all([patch(next), patch(next)]);
    expect(replies.map((reply) => reply.status).sort()).toEqual([200, 409]);
    await call("get", "/mine", "teammate").expect(404);
    await call("get", "/mine", "spare").expect(200);
    const refreshed = await getGroups().expect(200);
    const current = refreshed.body.groups.find((item: { id: string }) => item.id === projectId);
    await patch(group.studentIds, current.updatedAt).expect(200);
    const timeline = await app.get(Database).$queryRaw<{ left_at: Date | null }[]>`
      SELECT left_at FROM labassist_student.project_students
      WHERE project_id = ${projectId}::uuid AND student_id = ${teammateId}::uuid ORDER BY joined_at
    `;
    expect(timeline).toEqual([{ left_at: expect.any(Date) }, { left_at: null }]);
  });

  it("requires transfer confirmation and updates both teams atomically", async () => {
    const db = app.get(Database);
    const groups = async () => {
      const result = await request(app.getHttpServer())
        .get(groupPath)
        .set("Authorization", "Bearer " + tokens.head)
        .expect(200);
      return result.body.groups as ProjectGroupRecord[];
    };
    const update = (group: ProjectGroupRecord, studentIds: string[], confirmedTransfer = false) =>
      request(app.getHttpServer())
        .patch(groupPath + "/" + group.id)
        .set("Authorization", "Bearer " + tokens.head)
        .send({
          title: group.title,
          projectNumber: group.projectNumber,
          termId: group.termId,
          supervisorIds: group.supervisorIds,
          studentIds,
          expectedUpdatedAt: group.updatedAt,
          confirmedTransfer,
        });

    const before = await groups();
    const source = before.find((group) => group.id === projectId)!;
    const target = before.find((group) => group.projectNumber === "P-2")!;
    await update(source, [...source.studentIds, spareId]).expect(200);
    const nextMembers = [...target.studentIds, spareId];
    await update(target, nextMembers).expect(409);
    const beforeMove = (await groups()).find((group) => group.id === source.id)!;
    expect(beforeMove.studentIds).toContain(spareId);
    await update(target, nextMembers, true).expect(200);
    const after = await groups();
    expect(after.find((group) => group.id === source.id)?.studentIds).toEqual(source.studentIds);
    expect(after.find((group) => group.id === source.id)?.updatedAt).not.toBe(beforeMove.updatedAt);
    const workspace = await call("get", "/mine", "spare").expect(200);
    expect(workspace.body.id).toBe(target.id);
    const memberships = await db.$queryRaw<{ project_id: string }[]>`
      SELECT project_id FROM labassist_student.project_students
      WHERE student_id = ${spareId}::uuid AND left_at IS NULL
    `;
    expect(memberships).toEqual([{ project_id: target.id }]);
  });
});
