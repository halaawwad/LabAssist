import {Injectable,OnModuleDestroy,OnApplicationBootstrap} from '@nestjs/common';
import {createTransport} from 'nodemailer';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {Database} from './database';
@Injectable() export class Mailer{
 async send(email:string,url:string){const transporter=createTransport({host:process.env.SMTP_HOST??'localhost',port:Number(process.env.SMTP_PORT??1026),secure:process.env.SMTP_SECURE==='true',requireTLS:process.env.NODE_ENV==='production',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:10000});await transporter.sendMail({from:process.env.SMTP_FROM??'LabAssist <no-reply@labassist.local>',to:email,subject:'LabAssist account access',text:`Open this link to complete your account action:\n${url}\nIf you did not request this, contact your department.`});}
}
@Injectable() export class MailQueue implements OnApplicationBootstrap,OnModuleDestroy{
 private timer?:NodeJS.Timeout;private running=false;private key:Buffer;
 constructor(private db:Database,private mailer:Mailer){const value=process.env.MAIL_ENCRYPTION_KEY??'';if(!/^[a-f0-9]{64}$/i.test(value))throw Error('MAIL_ENCRYPTION_KEY must be a 32-byte hex secret.');this.key=Buffer.from(value,'hex');}
 async enqueue(tx:Prisma.TransactionClient,id:string,url:string){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv),data=Buffer.concat([cipher.update(url,'utf8'),cipher.final()]);const payload=Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');await tx.$executeRaw`INSERT INTO labassist_student.auth_mail_outbox(account_id,payload) VALUES(${id}::uuid,${payload})`;}
 onApplicationBootstrap(){this.timer=setInterval(()=>void this.flush(),5000);this.timer.unref();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async flush(){if(this.running)return;this.running=true;try{await this.db.$transaction(async tx=>{const rows=await tx.$queryRaw<any[]>`SELECT o.id,o.payload,a.email FROM labassist_student.auth_mail_outbox o JOIN labassist_student.accounts a ON a.id=o.account_id WHERE o.sent_at IS NULL AND o.next_attempt_at<=now() ORDER BY o.created_at FOR UPDATE OF o SKIP LOCKED LIMIT 10`;for(const row of rows){try{const raw=Buffer.from(row.payload,'base64'),decipher=createDecipheriv('aes-256-gcm',this.key,raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));const url=Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8');await this.mailer.send(row.email,url);await tx.$executeRaw`UPDATE labassist_student.auth_mail_outbox SET sent_at=now(),payload='',attempts=attempts+1 WHERE id=${row.id}::uuid`;}catch{await tx.$executeRaw`UPDATE labassist_student.auth_mail_outbox SET attempts=attempts+1,next_attempt_at=now()+interval '1 minute' WHERE id=${row.id}::uuid`;}}},{timeout:120000});}catch{/* Leave pending messages for retry; no secrets are logged. */}finally{this.running=false;}}
}
