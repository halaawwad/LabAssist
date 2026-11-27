import type { NestExpressApplication } from "@nestjs/platform-express";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import type { ServerResponse } from "node:http";
import { ApiErrors } from "./common/filters/api-errors.filter";
import { requestTracing } from "./common/middleware/request-tracing";
export function configureApp(
  app: INestApplication,
  options: { origins?: string[]; logRequest?: (line: string) => void } = {},
) {
  app.setGlobalPrefix("v1");
  app.use(helmet());
  (app as NestExpressApplication).useBodyParser("json", { limit: "2mb" });
  app.use(requestTracing(options.logRequest));
  app.use((_request: unknown, response: ServerResponse, next: () => void) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.enableCors({
    origin: options.origins ?? (process.env.CORS_ORIGINS ?? "http://localhost:8081").split(","),
    credentials: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new ApiErrors());
  const config = new DocumentBuilder()
    .setTitle("LabAssist API")
    .setVersion("1")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  return app;
}
