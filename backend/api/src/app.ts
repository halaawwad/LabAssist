import {ArgumentsHost,Catch,Controller,ExceptionFilter,Get,HttpException,INestApplication,Module,ValidationPipe} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ThrottlerGuard,ThrottlerModule} from '@nestjs/throttler';
import {DocumentBuilder,SwaggerModule} from '@nestjs/swagger';
import helmet from 'helmet';
import {DatabaseModule} from './database';
import {AccountsModule,AuthModule} from './controllers';
@Catch() class ApiErrors implements ExceptionFilter{catch(error:any,host:ArgumentsHost){const res=host.switchToHttp().getResponse();if(error instanceof HttpException){const detail=error.getResponse();return res.status(error.getStatus()).json({statusCode:error.getStatus(),...(typeof detail==='string'?{message:detail}:detail)});}const code=error?.meta?.code;if(code==='23505'||error?.code==='P2002')return res.status(409).json({statusCode:409,message:'Account identity or active workshop manager already exists.'});if(code==='P0001'||code==='23514'||code==='23503')return res.status(400).json({statusCode:400,message:'The account action is invalid, expired, or conflicts with an existing rule.'});res.status(500).json({statusCode:500,message:'The request could not be completed. Please retry.'});}}
@Controller('health') class HealthController{@Get() health(){return {status:'ok'};}}
@Module({imports:[DatabaseModule,AuthModule,AccountsModule,ThrottlerModule.forRoot([{ttl:60000,limit:process.env.NODE_ENV==='test'?1000:60}])],controllers:[HealthController],providers:[{provide:APP_GUARD,useClass:ThrottlerGuard}]}) export class AppModule{}
export function configureApp(app:INestApplication){app.setGlobalPrefix('v1');app.use(helmet());app.enableCors({origin:(process.env.CORS_ORIGINS??'http://localhost:8081').split(','),credentials:false});app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));app.useGlobalFilters(new ApiErrors());const config=new DocumentBuilder().setTitle('LabAssist API').setVersion('1').addBearerAuth().build();SwaggerModule.setup('docs',app,SwaggerModule.createDocument(app,config));return app;}
