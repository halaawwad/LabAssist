import {CanActivate,ExecutionContext,ForbiddenException,Injectable,UnauthorizedException} from '@nestjs/common';
import {AuthService} from './auth.service';
import {Role} from './identity';
@Injectable() export class SessionGuard implements CanActivate{
 constructor(private auth:AuthService){}
 async canActivate(ctx:ExecutionContext){const request=ctx.switchToHttp().getRequest();const value=request.headers.authorization;if(typeof value!=='string'||!value.startsWith('Bearer '))throw new UnauthorizedException('Sign in required.');const session=await this.auth.authenticate(value.slice(7));request.actor=session.account;request.sessionId=session.sessionId;return true;}
}
@Injectable() export class DepartmentGuard implements CanActivate{canActivate(ctx:ExecutionContext){if(ctx.switchToHttp().getRequest().actor?.role!==Role.DEPARTMENT_HEAD)throw new ForbiddenException('Department head permission required.');return true;}}
