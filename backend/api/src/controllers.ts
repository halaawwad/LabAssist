import {Body,Controller,Get,HttpCode,Module,Param,ParseUUIDPipe,Patch,Post,Req,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiTags} from '@nestjs/swagger';
import {AuthService} from './auth.service';
import {SessionGuard,DepartmentGuard} from './guards';
import {AccountDto,ActivateDto,ForgotDto,LoginDto,PasswordDto,RefreshDto,StatusDto} from './dto';
import {Mailer,MailQueue} from './mailer';
@ApiTags('Authentication') @Controller('auth') export class AuthController{
 constructor(private auth:AuthService){}
 @Post('login') login(@Body() body:LoginDto){return this.auth.login(body);}
 @Post('activate') activate(@Body() body:ActivateDto){return this.auth.activate(body);}
 @Post('refresh') refresh(@Body() body:RefreshDto){return this.auth.refresh(body.refreshToken);}
 @Post('forgot-password') @HttpCode(202) forgot(@Body() body:ForgotDto){return this.auth.forgot(body.email);}
 @Post('reset-password') reset(@Body() body:PasswordDto){return this.auth.reset(body);}
 @ApiBearerAuth() @UseGuards(SessionGuard) @Post('logout') logout(@Req() req:any){return this.auth.logout(req.sessionId);}
 @ApiBearerAuth() @UseGuards(SessionGuard) @Get('me') me(@Req() req:any){return req.actor;}
}
@ApiTags('Accounts') @ApiBearerAuth() @UseGuards(SessionGuard,DepartmentGuard) @Controller('accounts') export class AccountsController{
 constructor(private auth:AuthService){}
 @Get() list(){return this.auth.list();}
 @Post() create(@Body() body:AccountDto,@Req() req:any){return this.auth.provision(body,req.actor);}
 @Post(':id/invitation') invite(@Param('id',new ParseUUIDPipe()) id:string,@Req() req:any){return this.auth.resend(id,req.actor);}
 @Patch(':id/status') status(@Param('id',new ParseUUIDPipe()) id:string,@Body() body:StatusDto,@Req() req:any){return this.auth.status(id,body.status,req.actor);}
}
@Module({controllers:[AuthController],providers:[AuthService,SessionGuard,DepartmentGuard,Mailer,MailQueue],exports:[AuthService,SessionGuard,DepartmentGuard]}) export class AuthModule{}
@Module({imports:[AuthModule],controllers:[AccountsController]}) export class AccountsModule{}
