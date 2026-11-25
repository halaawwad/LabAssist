import "reflect-metadata";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AccountsController } from "../../src/accounts/controllers/accounts.controller";
import { AccountsService } from "../../src/accounts/services/accounts.service";
import { SessionGuard } from "../../src/auth/guards/session.guard";
import { DepartmentGuard } from "../../src/common/guards/department.guard";

describe("Account access policy routes", () => {
  let app: any;
  const id = "11111111-1111-4111-8111-111111111111";
  const service = {
    list: jest.fn().mockResolvedValue([{ id, status: "DISABLED" }]),
    rename: jest.fn().mockResolvedValue({ ok: true }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: service }],
    })
      .overrideGuard(SessionGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DepartmentGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });

  it.each(["ACTIVE", "DISABLED"])("does not expose a status change to %s", async (status) => {
    await request(app.getHttpServer()).patch(`/accounts/${id}/status`).send({ status }).expect(404);
    expect(service.rename).not.toHaveBeenCalled();
  });
  it("keeps historical disabled records visible without changing them", async () => {
    const response = await request(app.getHttpServer()).get("/accounts").expect(200);
    expect(response.body).toEqual([{ id, status: "DISABLED" }]);
  });
  it("retains the account name update route", async () => {
    await request(app.getHttpServer())
      .patch(`/accounts/${id}`)
      .send({ fullName: "Updated name" })
      .expect(200);
    expect(service.rename).toHaveBeenCalledWith(id, "Updated name", undefined);
  });
});
