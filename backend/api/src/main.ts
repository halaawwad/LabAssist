import "reflect-metadata";
import "./config/environment";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";
async function main() {
  if (!process.env.DATABASE_URL) throw Error("DATABASE_URL is required.");
  if (!process.env.PUBLIC_APP_URL) throw Error("PUBLIC_APP_URL is required.");
  const app = configureApp(await NestFactory.create(AppModule, { logger: ["error", "warn"] }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3100), "0.0.0.0");
}
void main();
