import 'reflect-metadata';
import './environment';
import {NestFactory} from '@nestjs/core';
import {AppModule,configureApp} from './app';
async function main(){if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required.');if(!process.env.PUBLIC_APP_URL)throw Error('PUBLIC_APP_URL is required.');const app=configureApp(await NestFactory.create(AppModule,{logger:['error','warn']}));app.enableShutdownHooks();await app.listen(Number(process.env.PORT??3100),'0.0.0.0');}
void main();
