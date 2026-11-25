import "reflect-metadata";
import "./config/environment";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
import { validateEnvironment } from "./config/validate-environment";
async function main() {
  const settings = validateEnvironment(process.env);
  const app = configureApp(
    await NestFactory.create(AppModule, { logger: ["error", "warn", "log"] }),
    { origins: settings.corsOrigins },
  );
  app.enableShutdownHooks();
  await app.listen(settings.port, "0.0.0.0");
}
void main();
