import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { AccountsController } from "./controllers/accounts.controller";
import { AccountsService } from "./services/accounts.service";
import { AccountsRepository } from "./repositories/accounts.repository";
import { DepartmentGuard } from "../common/guards/department.guard";
@Module({
  imports: [AuthModule, MailModule],
  controllers: [AccountsController],
  providers: [AccountsService, AccountsRepository, DepartmentGuard],
})
export class AccountsModule {}
