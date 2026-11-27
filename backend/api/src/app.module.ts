import { ProjectFinanceModule } from "./project-finance/project-finance.module";
import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { AccountsModule } from "./accounts/accounts.module";
import { MarketModule } from "./market.controllers";
import { ProjectWorkModule } from "./project-work/project-work.module";
import { HealthController } from "./health/health.controller";
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    AccountsModule,
    MarketModule,
    ProjectWorkModule,
    ProjectFinanceModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: process.env.NODE_ENV === "test" ? 1000 : 60 }]),
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
