import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Role } from "../security/identity";
@Injectable()
export class DepartmentGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (ctx.switchToHttp().getRequest().actor?.role !== Role.DEPARTMENT_HEAD)
      throw new ForbiddenException("Department head permission required.");
    return true;
  }
}
