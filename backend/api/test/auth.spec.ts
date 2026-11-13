import 'reflect-metadata';
import request from 'supertest';
import {randomBytes,createHash} from 'node:crypto';
import * as argon2 from 'argon2';
import {Test} from '@nestjs/testing';
import {AppModule,configureApp} from '../src/app';
import {Database} from '../src/database';
import {Mailer} from '../src/mailer';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const password='Noor123!Secure';
describe('Sprint 1 real PostgreSQL API',()=>{
 let app:any,db:Database,head:any,student:any,headAccess:string;const mail:{email:string;url:string}[]=[];
 beforeAll(async()=>{
  if(!process.env.DATABASE_URL?.includes('_test'))throw Error('Dedicated test database required');
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(Mailer).useValue({send:async(email:string,url:string)=>{mail.push({email,url});}}).compile();
  app=configureApp(module.createNestApplication());await app.init();db=app.get(Database);
  await db.$executeRawUnsafe('TRUNCATE labassist_student.accounts CASCADE');
  const encoded=await argon2.hash(password,{type:argon2.argon2id});
  [head]=await db.$queryRaw<any[]>`INSERT INTO labassist_student.accounts(role,full_name,email,status,password_hash,activated_at) VALUES('DEPARTMENT_HEAD','Department Head','head@najah.edu','ACTIVE',${encoded},now()) RETURNING id,email`;
  const login=await request(app.getHttpServer()).post('/v1/auth/login').send({role:'DEPARTMENT_HEAD',identifier:head.email,password});expect(login.status).toBe(201);headAccess=login.body.accessToken;
 });
 afterAll(async()=>{if(app)await app.close();});
 const post=(url:string,data:any,token?:string)=>{const req=request(app.getHttpServer()).post('/v1'+url);if(token)req.set('Authorization','Bearer '+token);return req.send(data);};
 it('rejects missing authorization and unknown DTO fields',async()=>{
  expect((await post('/accounts',{role:'STUDENT',fullName:'Noor',universityNumber:'12345678'})).status).toBe(401);
  expect((await post('/accounts',{role:'STUDENT',fullName:'Noor',universityNumber:'12345678',password:'secret'},headAccess)).status).toBe(400);
 });
 it('creates pending student with generated email and no password or token in response',async()=>{
  const r=await post('/accounts',{role:'STUDENT',fullName:'Noor Owaissi',universityNumber:'12345678'},headAccess);expect(r.status).toBe(201);student=r.body;expect(student.email).toBe('s12345678@stu.najah.edu');expect(student.passwordHash).toBeUndefined();expect(student.token).toBeUndefined();expect(mail.at(-1)?.email).toBe(student.email);
 });
 it('activation is single-use even across two simultaneous connections',async()=>{
  const token=new URL(mail.find(m=>m.email===student.email)!.url).searchParams.get('token');
  const results=await Promise.all([1,2].map(()=>post('/auth/activate',{token,email:student.email,password})));expect(results.map(r=>r.status).sort()).toEqual([201,400]);
  const rows=await db.$queryRaw<any[]>`SELECT status,password_hash FROM labassist_student.accounts WHERE id=${student.id}::uuid`;expect(rows[0].status).toBe('ACTIVE');expect(rows[0].password_hash).not.toBe(password);expect(await argon2.verify(rows[0].password_hash,password)).toBe(true);
 });
 it('student cannot provision another account and me never returns password hashes',async()=>{
  const r=await post('/auth/login',{role:'STUDENT',identifier:student.email,password});expect(r.status).toBe(201);
  expect((await post('/accounts',{role:'STUDENT',fullName:'Other',universityNumber:'12345679'},r.body.accessToken)).status).toBe(403);
  const me=await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization','Bearer '+r.body.accessToken);expect(me.status).toBe(200);expect(me.body.id).toBe(student.id);expect(JSON.stringify(me.body)).not.toContain('password');
 });
 it('two concurrent provisions create one account and one controlled conflict',async()=>{
  const results=await Promise.all([1,2].map(()=>post('/accounts',{role:'STUDENT',fullName:'Race',universityNumber:'12345679'},headAccess)));expect(results.map(r=>r.status).sort()).toEqual([201,409]);
  const rows=await db.$queryRaw<any[]>`SELECT count(*)::int n FROM labassist_student.accounts WHERE university_number='12345679'`;expect(rows[0].n).toBe(1);
 });
 it('wrong password, wrong role and disabled accounts cannot sign in',async()=>{
  expect((await post('/auth/login',{role:'STUDENT',identifier:student.email,password:'wrong-password'})).status).toBe(401);
  expect((await post('/auth/login',{role:'SUPERVISOR',identifier:student.email,password})).status).toBe(401);
  await request(app.getHttpServer()).patch('/v1/accounts/'+student.id+'/status').set('Authorization','Bearer '+headAccess).send({status:'DISABLED'}).expect(200);
  expect((await post('/auth/login',{role:'STUDENT',identifier:student.email,password})).status).toBe(401);
  await request(app.getHttpServer()).patch('/v1/accounts/'+student.id+'/status').set('Authorization','Bearer '+headAccess).send({status:'ACTIVE'}).expect(200);
 });
 it('staff use their university number; refresh rotates once and logout revokes access',async()=>{
  for(const [role,employeeNumber] of [['SUPERVISOR','1024'],['WORKSHOP_MANAGER','10001']]){
   const email=role.toLowerCase()+'@najah.edu';expect((await post('/accounts',{role,employeeNumber,email,fullName:role},headAccess)).status).toBe(201);
   const token=new URL(mail.find(m=>m.email===email)!.url).searchParams.get('token');expect((await post('/auth/activate',{email,token,password})).status).toBe(201);
   const login=await post('/auth/login',{role,identifier:employeeNumber,password});expect(login.status).toBe(201);
   const race=await Promise.all([1,2].map(()=>post('/auth/refresh',{refreshToken:login.body.refreshToken})));expect(race.map(r=>r.status).sort()).toEqual([201,401]);
   const winner=race.find(r=>r.status===201)!;expect((await post('/auth/logout',{},winner.body.accessToken)).status).toBe(201);
   await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization','Bearer '+winner.body.accessToken).expect(401);
  }
 });
 it('password reset is generic, single-use and revokes existing sessions',async()=>{
  const login=await post('/auth/login',{role:'STUDENT',identifier:student.email,password});
  const known=await post('/auth/forgot-password',{email:student.email}),unknown=await post('/auth/forgot-password',{email:'unknown@najah.edu'});expect(known.body).toEqual(unknown.body);
  const token=new URL(mail.filter(m=>m.email===student.email).at(-1)!.url).searchParams.get('token');const replacement='NewPassword123!';
  expect((await post('/auth/reset-password',{token,password:replacement})).status).toBe(201);
  expect((await post('/auth/reset-password',{token,password:replacement})).status).toBe(400);
  await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization','Bearer '+login.body.accessToken).expect(401);
  expect((await post('/auth/login',{role:'STUDENT',identifier:student.email,password})).status).toBe(401);
  expect((await post('/auth/login',{role:'STUDENT',identifier:student.email,password:replacement})).status).toBe(201);
 });
 it('expired invitations are refused and can be reissued by the head',async()=>{
  const pending=await post('/accounts',{role:'STUDENT',fullName:'Expired',universityNumber:'12345680'},headAccess);const old=new URL(mail.at(-1)!.url).searchParams.get('token');
  await db.$executeRaw`UPDATE labassist_student.activation_invitations SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE student_id=${pending.body.id}::uuid`;
  expect((await post('/auth/activate',{token:old,email:pending.body.email,password})).status).toBe(400);
  expect((await post('/accounts/'+pending.body.id+'/invitation',{},headAccess)).status).toBe(201);
  const token=new URL(mail.at(-1)!.url).searchParams.get('token');expect(token).not.toBe(old);
  expect((await post('/auth/activate',{token,email:pending.body.email,password})).status).toBe(201);
 });
});
