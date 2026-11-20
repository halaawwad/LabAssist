import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../services/auth.service";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest();
    const value = request.headers.authorization;
    if (typeof value !== "string" || !value.startsWith("Bearer "))
      throw new UnauthorizedException("Sign in required.");
    const session = await this.auth.authenticate(value.slice(7));
    request.actor = session.account;
    request.sessionId = session.sessionId;
    return true;
  }
}
