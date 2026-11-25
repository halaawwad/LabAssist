import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";

export type TracedRequest = IncomingMessage & { requestId?: string; route?: { path?: unknown } };
export function requestTracing(write: (line: string) => void = (line) => Logger.log(line, "HTTP")) {
  return (request: TracedRequest, response: ServerResponse, next: () => void) => {
    const supplied = request.headers["x-request-id"];
    const requestId =
      typeof supplied === "string" && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(supplied)
        ? supplied
        : randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-ID", requestId);
    const started = process.hrtime.bigint();
    let recorded = false;
    const finish = (aborted: boolean) => {
      if (recorded) return;
      recorded = true;
      const route = request.route?.path;
      write(
        JSON.stringify({
          event: "http_request",
          requestId,
          method: ["GET", "POST", "PATCH", "PUT", "DELETE", "HEAD", "OPTIONS"].includes(
            request.method || "",
          )
            ? request.method
            : "OTHER",
          route: typeof route === "string" ? route : "[unmatched]",
          statusCode: aborted ? 499 : response.statusCode,
          durationMs: Math.round(Number(process.hrtime.bigint() - started) / 1e6),
          aborted,
        }),
      );
    };
    response.once("finish", () => finish(false));
    response.once("close", () => finish(!response.writableFinished));
    next();
  };
}
