import { Module } from "@nestjs/common";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { AuthRepository } from "./repositories/auth.repository";
import { SessionGuard } from "./guards/session.guard";
import { MailModule } from "../mail/mail.module";
@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
