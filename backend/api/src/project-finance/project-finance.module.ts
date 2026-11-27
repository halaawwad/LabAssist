import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectFinanceController } from "./project-finance.controller";
import { ProjectFinanceService } from "./project-finance.service";
@Module({
  imports: [AuthModule],
  controllers: [ProjectFinanceController],
  providers: [ProjectFinanceService],
})
export class ProjectFinanceModule {}
