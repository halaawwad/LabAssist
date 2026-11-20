import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { ApiErrors } from "./common/filters/api-errors.filter";
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix("v1");
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:8081").split(","),
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
