import "reflect-metadata";
import { EventEmitter } from "node:events";
import type { ServerResponse } from "node:http";
import { requestTracing, type TracedRequest } from "../../src/common/middleware/request-tracing";
describe("Safe request tracing", () => {
  function fixture(id?: string) {
    const write = jest.fn(),
      headers: Record<string, string> = {};
    const res = Object.assign(new EventEmitter(), {
      statusCode: 401,
      writableFinished: true,
      setHeader: (key: string, value: string) => {
        headers[key] = value;
      },
    });
    const req = {
      method: "POST",
      headers: { authorization: "Bearer PRIVATE_TOKEN", "x-request-id": id },
      url: "/login?token=PRIVATE_TOKEN",
      body: { password: "PRIVATE_PASSWORD" },
      route: { path: "/v1/auth/login" },
    } as unknown as TracedRequest;
    const next = jest.fn();
    requestTracing(write)(req, res as unknown as ServerResponse, next);
    return { req, res, write, headers, next };
  }
  it("returns a UUID, propagates a valid correlation ID and logs only the allowlist", () => {
    const id = "7c195459-977d-449d-aab2-5cc71a724574";
    const f = fixture(id);
    f.res.emit("finish");
    f.res.emit("close");
    expect(f.req.requestId).toBe(id);
    expect(f.headers["X-Request-ID"]).toBe(id);
    expect(f.next).toHaveBeenCalledTimes(1);
    expect(f.write).toHaveBeenCalledTimes(1);
    const text = f.write.mock.calls[0][0];
    expect(text).not.toMatch(/PRIVATE_TOKEN|PRIVATE_PASSWORD|authorization|password/);
    expect(JSON.parse(text)).toMatchObject({
      requestId: id,
      route: "/v1/auth/login",
      statusCode: 401,
      aborted: false,
    });
  });
  it("replaces untrusted header contents and does not log raw unmatched URLs", () => {
    const f = fixture("PRIVATE_TOKEN\nforged-log");
    f.req.route = undefined;
    f.res.emit("finish");
    expect(f.req.requestId).toMatch(/^[a-f\d-]{36}$/);
    expect(f.write.mock.calls[0][0]).not.toContain("PRIVATE_TOKEN");
    expect(JSON.parse(f.write.mock.calls[0][0]).route).toBe("[unmatched]");
  });
  it("records aborted requests once even if close fires repeatedly", () => {
    const f = fixture();
    f.res.writableFinished = false;
    f.res.emit("close");
    f.res.emit("close");
    expect(f.write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(f.write.mock.calls[0][0]).statusCode).toBe(499);
  });
});
