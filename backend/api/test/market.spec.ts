import 'reflect-metadata';
import request from 'supertest';
import * as argon2 from 'argon2';
import {Test} from '@nestjs/testing';
import {AppModule,configureApp} from '../src/app';
import {Database} from '../src/database';
import {Mailer} from '../src/mailer';
const password='Noor123!Secure';
const ago=(hours:number)=>new Date(Date.now()-hours*3600000).toISOString();
const cursorOf=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
describe('Sprint 6 catalog, shops, prices and student offers API',()=>{
 let app:any,db:Database;const token:Record<string,string>={},accountId:Record<string,string>={};
 const call=(method:'get'|'post'|'patch'|'put'|'delete',url:string,who?:string,data?:any)=>{const req=(request(app.getHttpServer()) as any)[method]('/v1'+url);if(who)req.set('Authorization','Bearer '+token[who]);return data===undefined?req:req.send(data);};
 const login=async(name:string,role:string,identifier:string)=>{const r=await call('post','/auth/login',undefined,{role,identifier,password});expect(r.status).toBe(201);token[name]=r.body.accessToken;accountId[name]=r.body.account.id;};
 // Follows nextCursor until the last page, failing if a page repeats an item.
 const walk=async(url:string,who:string)=>{const seen:any[]=[];let cursor:string|null=null,pages=0;do{const sep=url.includes('?')?'&':'?';const r=await call('get',url+(cursor?`${sep}cursor=${cursor}`:''),who);expect(r.status).toBe(200);seen.push(...r.body.items);cursor=r.body.nextCursor;pages++;}while(cursor&&pages<50);expect(new Set(seen.map(x=>x.id??x.key??JSON.stringify(x))).size).toBe(seen.length);return {items:seen,pages};};
 let shop:any,studentSeller:any,shopSource:any,studentSource:any,shopOffer:any,studentOffer:any,exactOffer:any,exactVariant:any,partialVariant:any,priceObservedAt:string;
 beforeAll(async()=>{
  if(!process.env.DATABASE_URL?.includes('_test'))throw Error('Dedicated test database required');
  const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(Mailer).useValue({send:async()=>undefined}).compile();
  app=configureApp(module.createNestApplication());await app.init();db=app.get(Database);
  await db.$executeRawUnsafe('TRUNCATE labassist_student.accounts CASCADE');
  const hash=await argon2.hash(password,{type:argon2.argon2id});
  const account=async(role:string,name:string,email:string,university:string|null,employee:string|null,supervisor:string|null=null,creator:string|null=null)=>(await db.$queryRaw<any[]>`INSERT INTO labassist_student.accounts(role,full_name,email,university_number,employee_number,account_supervisor_id,created_by,status,password_hash,activated_at) VALUES(${role},${name},${email},${university},${employee},${supervisor}::uuid,${creator}::uuid,'ACTIVE',${hash},now()) RETURNING id`)[0].id as string;
  const head=await account('DEPARTMENT_HEAD','Head','head@najah.edu',null,null);
  const supervisor=await account('SUPERVISOR','Supervisor','sup6@najah.edu',null,'1024',null,head);
  await account('WORKSHOP_MANAGER','Manager','manager6@najah.edu',null,'10001',null,head);
  const students:string[]=[];for(const n of ['20269001','20269002','20269003','20269004'])students.push(await account('STUDENT','Student '+n,`s${n}@stu.najah.edu`,n,null,null,head));
  // Team allocation rules are deferred to commit, so the project, its supervisor and two members are created together.
  // The third student stays enrolled without a team, so is not a registered catalog reader; the fourth joins the team.
  await db.$transaction(async tx=>{
   const term=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.academic_terms(name,starts_on) VALUES('Sprint 6 term',(now() AT TIME ZONE 'Asia/Hebron')::date) RETURNING id`)[0].id;
   await tx.$executeRaw`INSERT INTO labassist_student.term_workshop_capacity(term_id) VALUES(${term}::uuid)`;
   const project=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.projects(term_id,name,formed_by) VALUES(${term}::uuid,'Sprint 6 team',${head}::uuid) RETURNING id`)[0].id;
   await tx.$executeRaw`INSERT INTO labassist_student.project_supervisors(project_id,supervisor_id) VALUES(${project}::uuid,${supervisor}::uuid)`;
   for(const s of students)await tx.$executeRaw`INSERT INTO labassist_student.student_enrollments(student_id,term_id) VALUES(${s}::uuid,${term}::uuid)`;
   for(const s of [students[0],students[1],students[3]])await tx.$executeRaw`INSERT INTO labassist_student.project_students(project_id,term_id,student_id) VALUES(${project}::uuid,${term}::uuid,${s}::uuid)`;
  });
  for(const sql of `INSERT INTO catalog_categories VALUES('sprint6_cat','Sprint 6 sensors','حساسات',9006) ON CONFLICT DO NOTHING;
   INSERT INTO catalog_models(id,version,name,definition) VALUES('sprint6-model',1,'Sprint 6 model','{}') ON CONFLICT DO NOTHING;
   INSERT INTO catalog_pins(model_id,model_version,pin_index,name,kind,direction,connector,voltage,physical_number,functions) VALUES('sprint6-model',1,0,'VCC','power','in','header',NULL,NULL,'Supply input'),('sprint6-model',1,1,'OUT','digital','out','header',5,2,'Echo output'),('sprint6-model',1,2,'GND','ground','io','unknown',NULL,NULL,''),('sprint6-model',1,3,'TRIG','digital','in','header',5,4,'Trigger input') ON CONFLICT DO NOTHING;
   INSERT INTO catalog_parts(key,model_id,model_version,category_id,name_en,name_ar) VALUES('sprint6_sensor','sprint6-model',1,'sprint6_cat','Sprint6 Sensor','حساس'),('sprint6_retired','sprint6-model',1,'sprint6_cat','Sprint6 Retired','قديم') ON CONFLICT DO NOTHING;
   UPDATE catalog_parts SET revision=0,name_en=initcap(replace(key,'_',' ')),active=(key='sprint6_sensor'),exact_identity_fields=ARRAY['MANUFACTURER','MODEL','PACKAGE_OR_REVISION'] WHERE key LIKE 'sprint6_%';
   INSERT INTO catalog_documents(part_key,url,title,publisher,format,reference_scope) VALUES('sprint6_sensor','https://example.org/s6.pdf','Datasheet','Maker','PDF','pinout') ON CONFLICT DO NOTHING;
   INSERT INTO catalog_guides VALUES('sprint6_sensor',1,'en','{"step":"old"}'),('sprint6_sensor',2,'en','{"step":"new"}') ON CONFLICT DO NOTHING`.split(/;\s*\n/))await db.$executeRawUnsafe(sql);
  await login('manager','WORKSHOP_MANAGER','10001');await login('noor','STUDENT','s20269001@stu.najah.edu');await login('sara','STUDENT','s20269002@stu.najah.edu');await login('outsider','STUDENT','s20269003@stu.najah.edu');await login('head','DEPARTMENT_HEAD','head@najah.edu');await login('lina','STUDENT','s20269004@stu.najah.edu');
 });
 afterAll(async()=>{if(app)await app.close();});

 it('requires a session and a registered reader',async()=>{
  expect((await call('get','/catalog/parts')).status).toBe(401);
  expect((await call('get','/catalog/parts','outsider')).status).toBe(403);
  expect((await call('get','/catalog/parts/sprint6_sensor/pins','outsider')).status).toBe(403);
  expect((await call('get','/market/sellers','outsider')).status).toBe(403);
 });
 it('pages catalog parts with bounded sizes and explicit continuation',async()=>{
  const list=await call('get','/catalog/parts?search=sprint6','noor');expect(list.status).toBe(200);expect(list.body.items.map((p:any)=>p.key)).toEqual(['sprint6_sensor']);expect(list.body.nextCursor).toBeNull();
  expect((await call('get','/catalog/parts?includeInactive=true','noor')).status).toBe(403);
  const first=await call('get','/catalog/parts?search=sprint6&includeInactive=true&limit=1','manager');expect(first.body.items.map((p:any)=>p.key)).toEqual(['sprint6_retired']);expect(first.body.nextCursor).toEqual(expect.any(String));
  const second=await call('get',`/catalog/parts?search=sprint6&includeInactive=true&limit=1&cursor=${first.body.nextCursor}`,'manager');expect(second.body.items.map((p:any)=>p.key)).toEqual(['sprint6_sensor']);expect(second.body.nextCursor).toBeNull();
  for(const bad of ['limit=101','limit=0','limit=2.5','cursor=not-a-cursor',`cursor=${cursorOf({other:1})}`])expect((await call('get','/catalog/parts?'+bad,'noor')).status).toBe(400);
  expect((await call('get','/catalog/parts/sprint6_retired','noor')).status).toBe(404);
  const detail=await call('get','/catalog/parts/sprint6_sensor','noor');expect(detail.status).toBe(200);
  expect(detail.body).toMatchObject({pinCount:4,documentCount:1,exactIdentityFields:['MANUFACTURER','MODEL','PACKAGE_OR_REVISION'],guides:[{language:'en',version:2,content:{step:'new'}}]});
  expect((await call('get','/catalog/parts/sprint6_sensor/documents','noor')).body.items.map((d:any)=>d.title)).toEqual(['Datasheet']);
  expect((await call('get','/catalog/categories','head')).body.items.some((c:any)=>c.id==='sprint6_cat')).toBe(true);
 });
 it('pages pins with stable identifiers and explicit unknown or unverified metadata',async()=>{
  const first=await call('get','/catalog/parts/sprint6_sensor/pins?limit=2','noor');expect(first.status).toBe(200);
  expect(first.body).toMatchObject({part:'sprint6_sensor',modelId:'sprint6-model',modelVersion:1,wiringSafety:'NOT_EVALUATED'});
  expect(first.body.items.map((p:any)=>p.id)).toEqual(['sprint6-model:1:0','sprint6-model:1:1']);
  const [vcc,out]=first.body.items;
  expect(vcc.voltage).toEqual({value:null,status:'UNKNOWN',source:null});expect(vcc.physicalNumber.status).toBe('UNKNOWN');expect(vcc.kind).toEqual({value:'power',status:'UNVERIFIED',source:null});
  expect(out.voltage).toEqual({value:5,status:'UNVERIFIED',source:null});expect(out.physicalNumber).toEqual({value:2,status:'UNVERIFIED',source:null});expect(out.label.status).toBe('UNKNOWN');
  const second=await call('get',`/catalog/parts/sprint6_sensor/pins?limit=2&cursor=${first.body.nextCursor}`,'noor');expect(second.body.items.map((p:any)=>p.pinIndex)).toEqual([2,3]);expect(second.body.nextCursor).toBeNull();
  expect(second.body.items[0].connector.status).toBe('UNKNOWN');expect(second.body.items[0].functions.status).toBe('UNKNOWN');
  expect(JSON.stringify([first.body,second.body])).not.toContain('"VERIFIED"');
 });
 it('lets only managers curate parts with optimistic revisions',async()=>{
  const body={expectedRevision:0,nameEn:'Sprint6 Sensor v2',nameAr:'حساس ٢',description:'Updated',active:true};
  expect((await call('patch','/catalog/parts/sprint6_sensor','noor',body)).status).toBe(403);
  const results=await Promise.all([1,2].map(()=>call('patch','/catalog/parts/sprint6_sensor','manager',body)));expect(results.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await call('patch','/catalog/parts/sprint6_sensor','manager',{...body,expectedRevision:1,nameAr:' '})).status).toBe(400);
 });
 it('creates shops for managers, one seller profile per student, and pages sellers',async()=>{
  const r=await call('post','/market/sellers','manager',{name:'Nablus Electronics',city:'Nablus',latitude:32.22,longitude:35.26,phone:'+970 9 000 0000',website:'https://shop.example'});expect(r.status).toBe(201);shop=r.body;expect(shop).toMatchObject({kind:'SHOP',own:false,latitude:32.22});
  expect((await call('post','/market/sellers','manager',{name:'Half',city:'Nablus',latitude:32})).status).toBe(400);
  expect((await call('post','/market/sellers','manager',{name:'X',city:'Y',accountId:'nope'})).status).toBe(400);
  const results=await Promise.all([1,2].map(()=>call('post','/market/sellers','noor',{name:'Noor leftovers',city:'Nablus'})));expect(results.map(x=>x.status).sort()).toEqual([201,409]);
  studentSeller=results.find(x=>x.status===201)!.body;expect(studentSeller).toMatchObject({kind:'STUDENT',own:true});expect(studentSeller.accountId).toBeUndefined();
  expect((await call('patch','/market/sellers/'+shop.id,'noor',{name:'Hijack',city:'Nablus'})).status).toBe(403);
  expect((await call('patch','/market/sellers/'+studentSeller.id,'manager',{name:'Moderated',city:'Nablus'})).status).toBe(403);
  expect((await call('patch','/market/sellers/'+studentSeller.id,'noor',{name:'Noor spare parts',city:'Nablus'})).body.name).toBe('Noor spare parts');
  expect((await call('post','/market/sellers','head',{name:'Head shop',city:'Nablus'})).status).toBe(403);
  for(const name of ['Jenin Parts','Ramallah Robotics'])expect((await call('post','/market/sellers','manager',{name,city:'Nablus'})).status).toBe(201);
  const shops=await walk('/market/sellers?kind=SHOP&limit=2','sara');expect(shops.pages).toBe(2);expect(shops.items.map((s:any)=>s.name)).toEqual(['Jenin Parts','Nablus Electronics','Ramallah Robotics']);
 });
 it('records price sources and lets only managers review each once',async()=>{
  expect((await call('post',`/market/sellers/${shop.id}/sources`,'noor',{kind:'SHOP_PAGE',observedAt:ago(0)})).status).toBe(403);
  expect((await call('post',`/market/sellers/${studentSeller.id}/sources`,'manager',{kind:'MANUAL',observedAt:ago(0)})).status).toBe(403);
  shopSource=(await call('post',`/market/sellers/${shop.id}/sources`,'manager',{kind:'SHOP_PAGE',url:'https://shop.example/p',observedAt:ago(0)})).body;expect(shopSource.status).toBe('PENDING');
  studentSource=(await call('post',`/market/sellers/${studentSeller.id}/sources`,'noor',{kind:'SPREADSHEET',observedAt:ago(2)})).body;expect(studentSource.status).toBe('PENDING');
  expect((await call('get','/market/sources','noor')).body.items.map((s:any)=>s.id)).toEqual([studentSource.id]);
  expect((await call('post',`/market/sources/${shopSource.id}/review`,'noor',{decision:'APPROVED'})).status).toBe(403);
  const reviews=await Promise.all([1,2].map(()=>call('post',`/market/sources/${shopSource.id}/review`,'manager',{decision:'APPROVED'})));expect(reviews.map(r=>r.status).sort()).toEqual([201,409]);
 });
 it('changes prices only through dated observations and keeps revisions',async()=>{
  const base={catalogKey:'sprint6_sensor',partName:'Sprint6 Sensor',condition:'USED',unitPrice:'9.5',currency:'ILS',quantity:2};
  expect((await call('post','/market/offers','noor',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'ACTIVE'})).status).toBe(400);
  expect((await call('post','/market/offers','noor',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'DRAFT',unitPrice:'9.999'})).status).toBe(400);
  expect((await call('post','/market/offers','manager',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'DRAFT'})).status).toBe(403);
  studentOffer=(await call('post','/market/offers','noor',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'DRAFT'})).body;expect(studentOffer).toMatchObject({status:'DRAFT',unitPrice:'9.50',revision:0,variantId:null});
  shopOffer=(await call('post','/market/offers','manager',{...base,condition:'NEW',unitPrice:'12',shippingCost:'3',sellerId:shop.id,sourceId:shopSource.id,status:'ACTIVE'})).body;expect(shopOffer.status).toBe('ACTIVE');
  expect((await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:0,quantity:2,status:'ACTIVE'})).status).toBe(400);
  expect((await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:0,quantity:2,status:'DRAFT',unitPrice:'8.75'})).status).toBe(400);
  await call('post',`/market/sources/${studentSource.id}/review`,'manager',{decision:'APPROVED'}).expect(201);
  priceObservedAt=ago(1);const price={expectedRevision:0,sourceId:studentSource.id,unitPrice:'8.75',currency:'ILS',observedAt:priceObservedAt};
  expect((await call('patch','/market/offers/'+studentOffer.id,'sara',{expectedRevision:0,quantity:2,status:'ACTIVE'})).status).toBe(403);
  expect((await call('patch','/market/offers/'+studentOffer.id,'manager',{expectedRevision:0,quantity:2,status:'ACTIVE'})).status).toBe(403);
  expect((await call('post',`/market/offers/${studentOffer.id}/prices`,'manager',price)).status).toBe(403);
  expect((await call('post',`/market/offers/${shopOffer.id}/prices`,'noor',{...price,sourceId:shopSource.id})).status).toBe(403);
  expect((await call('post',`/market/offers/${studentOffer.id}/prices`,'noor',{...price,observedAt:ago(3)})).status).toBe(400);
  expect((await call('post',`/market/offers/${studentOffer.id}/prices`,'noor',{...price,currency:'USD'})).status).toBe(400);
  expect((await call('post',`/market/offers/${studentOffer.id}/prices`,'noor',{...price,observedAt:ago(-24)})).status).toBe(400);
  expect((await call('post',`/market/offers/${studentOffer.id}/prices`,'noor',{...price,observedAt:undefined})).status).toBe(400);
  const results=await Promise.all([1,2].map(()=>call('post',`/market/offers/${studentOffer.id}/prices`,'noor',price)));expect(results.map(r=>r.status).sort()).toEqual([201,409]);
  expect(results.find(r=>r.status===201)!.body).toMatchObject({unitPrice:'8.75',status:'DRAFT',revision:1});
  expect((await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:1,quantity:2,status:'ACTIVE'})).body).toMatchObject({status:'ACTIVE',unitPrice:'8.75',revision:2});
  const history=await walk(`/market/offers/${studentOffer.id}/history?limit=2`,'noor');expect(history.pages).toBe(2);
  expect(history.items.map((h:any)=>[h.revision,h.unitPrice,h.status])).toEqual([[0,'9.50','DRAFT'],[1,'8.75','DRAFT'],[2,'8.75','ACTIVE']]);
  const observations=await call('get',`/market/offers/${studentOffer.id}/observations`,'noor');
  expect(observations.body.items.map((o:any)=>[o.offerRevision,o.unitPrice,o.currency,o.observedAt,o.isLegacy,o.sourceId])).toEqual([[0,'9.50','ILS',studentSource.observedAt,false,studentSource.id],[1,'8.75','ILS',priceObservedAt,false,studentSource.id]]);
  expect((await call('get',`/market/offers/${studentOffer.id}/history`,'sara')).status).toBe(403);
  expect((await call('get','/market/offers/managed','noor')).body.items.map((o:any)=>o.id)).toEqual([studentOffer.id]);
 });
 it('compares shop and student prices with their observation dates and supports bookmarks',async()=>{
  const compare=await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara');expect(compare.status).toBe(200);
  expect(compare.body.items.map((o:any)=>[o.unitPrice,o.seller.kind])).toEqual([['8.75','STUDENT'],['12.00','SHOP']]);expect(compare.body.nextCursor).toBeNull();
  expect(compare.body.items[0]).toMatchObject({priceObservedAt:priceObservedAt,priceObservationLegacy:false,source:{id:studentSource.id},identity:{exact:false}});expect(compare.body.items[1].shippingCost).toBe('3.00');
  const pages=await walk('/market/compare?catalogKey=sprint6_sensor&currency=ILS&limit=1','sara');expect(pages.pages).toBe(2);expect(pages.items.map((o:any)=>o.id)).toEqual(compare.body.items.map((o:any)=>o.id));
  expect((await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS&condition=NEW','sara')).body.items).toHaveLength(1);
  expect((await call('get','/market/offers?sellerKind=STUDENT','sara')).body.items.map((o:any)=>o.id)).toEqual([studentOffer.id]);
  expect((await call('put',`/market/offers/${studentOffer.id}/bookmark`,'manager')).status).toBe(403);
  expect((await call('put',`/market/offers/${studentOffer.id}/bookmark`,'sara')).status).toBe(200);
  expect((await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara')).body.items[0].bookmarked).toBe(true);
  expect((await call('get','/market/bookmarks','sara')).body.items).toMatchObject([{id:studentOffer.id,available:true,publicOffer:{unitPrice:'8.75'}}]);
  expect((await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:2,quantity:0,status:'ACTIVE'})).status).toBe(400);
  await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:2,quantity:0,status:'SOLD'}).expect(200);
  expect((await call('patch','/market/offers/'+studentOffer.id,'noor',{expectedRevision:3,quantity:1,status:'ACTIVE'})).status).toBe(409);
  expect((await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara')).body.items).toHaveLength(1);
  expect((await call('get','/market/bookmarks','sara')).body.items).toMatchObject([{status:'SOLD',available:false,publicOffer:null}]);
  expect((await call('put',`/market/offers/${studentOffer.id}/bookmark`,'noor')).status).toBe(404);
  await call('delete',`/market/offers/${studentOffer.id}/bookmark`,'sara').expect(200);
  expect((await call('get','/market/bookmarks','sara')).body.items).toEqual([]);
 });
 it('defines catalog identity and compares only sufficiently identified offers as exact',async()=>{
  const identity={manufacturer:'Acme',modelNumber:'S6-1',packageOrRevision:'TO-92',sourceUrl:'https://example.org/s6'};
  expect((await call('post','/catalog/parts/sprint6_sensor/variants','noor',identity)).status).toBe(403);
  exactVariant=(await call('post','/catalog/parts/sprint6_sensor/variants','manager',identity)).body;expect(exactVariant).toMatchObject({partKey:'sprint6_sensor',manufacturer:'Acme',exact:true});
  expect((await call('post','/catalog/parts/sprint6_sensor/variants','manager',{manufacturer:'acme',modelNumber:'s6-1',packageOrRevision:'to-92'})).status).toBe(409);
  partialVariant=(await call('post','/catalog/parts/sprint6_sensor/variants','manager',{manufacturer:'Acme'})).body;expect(partialVariant).toMatchObject({modelNumber:null,packageOrRevision:null,exact:false});
  const retiredVariant=(await call('post','/catalog/parts/sprint6_retired/variants','manager',identity)).body;
  expect((await walk('/catalog/parts/sprint6_sensor/variants?limit=1','noor')).items.map((v:any)=>v.id)).toEqual([exactVariant.id,partialVariant.id]);
  expect((await call('get',`/market/compare/exact?variantId=${partialVariant.id}&currency=ILS`,'sara')).status).toBe(400);
  expect((await call('get','/market/compare/exact?variantId=00000000-0000-4000-8000-000000000000&currency=ILS','sara')).status).toBe(404);
  exactOffer=(await call('post','/market/offers','noor',{sellerId:studentSeller.id,sourceId:studentSource.id,catalogKey:'sprint6_sensor',variantId:exactVariant.id,partName:'Acme S6-1',condition:'NEW',unitPrice:'11',currency:'ILS',quantity:1,status:'ACTIVE'})).body;expect(exactOffer.variantId).toBe(exactVariant.id);
  expect((await call('put',`/market/offers/${shopOffer.id}/variant`,'manager',{expectedRevision:0,variantId:retiredVariant.id})).status).toBe(400);
  expect((await call('put',`/market/offers/${exactOffer.id}/variant`,'manager',{expectedRevision:0,variantId:partialVariant.id})).status).toBe(403);
  expect((await call('put',`/market/offers/${shopOffer.id}/variant`,'manager',{expectedRevision:0,variantId:partialVariant.id})).body).toMatchObject({variantId:partialVariant.id,revision:1});
  expect((await call('put',`/market/offers/${shopOffer.id}/variant`,'manager',{expectedRevision:1,variantId:exactVariant.id})).status).toBe(400);
  const exact=await call('get',`/market/compare/exact?variantId=${exactVariant.id}&currency=ILS`,'sara');
  expect(exact.body.items.map((o:any)=>[o.id,o.identity])).toEqual([[exactOffer.id,{manufacturer:'Acme',modelNumber:'S6-1',packageOrRevision:'TO-92',exact:true}]]);
  expect((await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara')).body.items.map((o:any)=>[o.id,o.identity.exact])).toEqual([[exactOffer.id,true],[shopOffer.id,false]]);
  const revision=(await call('get','/catalog/parts/sprint6_sensor','manager')).body.revision;
  expect((await call('put','/catalog/parts/sprint6_sensor/identity-fields','noor',{expectedRevision:revision,fields:['MANUFACTURER']})).status).toBe(403);
  expect((await call('put','/catalog/parts/sprint6_sensor/identity-fields','manager',{expectedRevision:revision,fields:['COLOUR']})).status).toBe(400);
  expect((await call('put','/catalog/parts/sprint6_sensor/identity-fields','manager',{expectedRevision:revision,fields:['MANUFACTURER']})).body).toEqual({key:'sprint6_sensor',revision:revision+1});
  expect((await call('get',`/market/compare/exact?variantId=${partialVariant.id}&currency=ILS`,'sara')).body.items.map((o:any)=>o.id)).toEqual([shopOffer.id]);
 });
 it('revokes a source approval with audit fields and removes affected prices from comparison',async()=>{
  await call('put',`/market/offers/${shopOffer.id}/bookmark`,'sara').expect(200);
  const pending=(await call('post',`/market/sellers/${shop.id}/sources`,'manager',{kind:'MANUAL',observedAt:ago(0)})).body;
  expect((await call('post',`/market/sources/${shopSource.id}/revoke`,'noor',{reason:'Changed'})).status).toBe(403);
  expect((await call('post',`/market/sources/${shopSource.id}/revoke`,'manager',{reason:'   '})).status).toBe(400);
  expect((await call('post',`/market/sources/${pending.id}/revoke`,'manager',{reason:'Changed'})).status).toBe(409);
  const revoked=await call('post',`/market/sources/${shopSource.id}/revoke`,'manager',{reason:'Shop page changed after review'});expect(revoked.status).toBe(201);
  expect(revoked.body).toMatchObject({status:'REVOKED',revocationReason:'Shop page changed after review',reviewedBy:expect.any(String),reviewedAt:expect.any(String),revokedBy:expect.any(String),revokedAt:expect.any(String),url:'https://shop.example/p'});
  expect((await call('post',`/market/sources/${shopSource.id}/revoke`,'manager',{reason:'Again'})).status).toBe(409);
  expect((await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara')).body.items.map((o:any)=>o.id)).toEqual([exactOffer.id]);
  expect((await call('get','/market/bookmarks','sara')).body.items).toMatchObject([{id:shopOffer.id,status:'ACTIVE',available:false,publicOffer:null}]);
  expect((await call('get',`/market/offers/${shopOffer.id}/observations`,'manager')).body.items.map((o:any)=>[o.unitPrice,o.sourceStatus])).toEqual([['12.00','REVOKED']]);
  expect((await call('get',`/market/offers/${shopOffer.id}/history`,'manager')).body.items).toHaveLength(2);
  expect((await call('post',`/market/offers/${shopOffer.id}/prices`,'manager',{expectedRevision:1,sourceId:shopSource.id,unitPrice:'10',currency:'ILS',observedAt:ago(0)})).status).toBe(400);
  expect((await call('get','/market/sources?status=REVOKED','manager')).body.items.map((s:any)=>s.id)).toEqual([shopSource.id]);
 });
 it('documents actual response and error schemas in Swagger',async()=>{
  const doc=(await request(app.getHttpServer()).get('/docs-json').expect(200)).body,schemas=doc.components.schemas;
  const ref=(path:string,method:string,status:string)=>doc.paths[path]?.[method]?.responses?.[status]?.content?.['application/json']?.schema?.$ref?.split('/').pop();
  for(const [path,method,status,name] of [['/v1/catalog/parts','get','200','PartPage'],['/v1/catalog/parts/{key}/pins','get','200','PinPage'],['/v1/catalog/parts/{key}/variants','post','201','Variant'],['/v1/market/compare','get','200','PublicOfferPage'],
   ['/v1/market/compare/exact','get','200','PublicOfferPage'],['/v1/market/offers/{id}/prices','post','201','Offer'],['/v1/market/offers/{id}/observations','get','200','ObservationPage'],['/v1/market/sources/{id}/revoke','post','201','Source'],['/v1/market/bookmarks','get','200','BookmarkPage']])
   expect([path,ref(path,method,status)]).toEqual([path,name]);
  for(const [path,method,status] of [['/v1/market/offers/{id}/prices','post','400'],['/v1/market/offers/{id}/prices','post','409'],['/v1/market/sources/{id}/revoke','post','403'],['/v1/market/compare','get','401'],['/v1/catalog/parts','get','429']])
   expect([path,status,ref(path,method,status)]).toEqual([path,status,'ErrorResponse']);
  // Actual bodies carry exactly the documented keys: all required keys present, nothing undocumented.
  const conforms=(name:string,body:any)=>{const s=schemas[name],keys=Object.keys(body);expect([name,keys.filter(k=>!(k in s.properties))]).toEqual([name,[]]);expect([name,(s.required??[]).filter((k:string)=>!keys.includes(k))]).toEqual([name,[]]);};
  conforms('PartPage',(await call('get','/catalog/parts','noor')).body);conforms('Part',(await call('get','/catalog/parts','noor')).body.items[0]);
  conforms('PartDetail',(await call('get','/catalog/parts/sprint6_sensor','noor')).body);
  const pins=(await call('get','/catalog/parts/sprint6_sensor/pins','noor')).body;conforms('PinPage',pins);conforms('Pin',pins.items[0]);conforms('PinField',pins.items[0].voltage);
  const offers=(await call('get','/market/compare?catalogKey=sprint6_sensor&currency=ILS','sara')).body;conforms('PublicOfferPage',offers);conforms('PublicOffer',offers.items[0]);conforms('PublicSeller',offers.items[0].seller);conforms('PublicSource',offers.items[0].source);conforms('Identity',offers.items[0].identity);
  conforms('Observation',(await call('get',`/market/offers/${studentOffer.id}/observations`,'noor')).body.items[0]);conforms('Offer',(await call('get','/market/offers/managed','noor')).body.items[0]);
  conforms('Source',(await call('get','/market/sources','manager')).body.items[0]);conforms('Variant',(await call('get','/catalog/parts/sprint6_sensor/variants','noor')).body.items[0]);
  conforms('BookmarkedOffer',(await call('get','/market/bookmarks','sara')).body.items[0]);
  for(const error of [await call('get','/catalog/parts?limit=101','noor'),await call('get','/catalog/parts','outsider'),await call('post',`/market/offers/${studentOffer.id}/prices`,'noor',{expectedRevision:0,sourceId:studentSource.id,unitPrice:'1',currency:'ILS',observedAt:ago(0)})])conforms('ErrorResponse',error.body);
 });

 // Task 5: student-offer lifecycle. These offers have no catalog key, so earlier comparison assertions are unaffected.
 const patchOffer=(id:string,expectedRevision:number,status:string,quantity=2,who='noor')=>call('patch','/market/offers/'+id,who,{expectedRevision,quantity,status});
 const studentOffer5=(partName:string,status='ACTIVE')=>call('post','/market/offers','noor',{sellerId:studentSeller.id,sourceId:studentSource.id,partName,condition:'USED',unitPrice:'20',currency:'ILS',quantity:2,status});
 it('creates student offers only on the owner seller and never changes ownership or identity',async()=>{
  const base={partName:'Spare jumper kit',condition:'USED',unitPrice:'20',currency:'ILS',quantity:2};
  expect((await call('post','/market/offers','noor',{...base,sellerId:shop.id,sourceId:studentSource.id,status:'DRAFT'})).status).toBe(403);
  expect((await call('post','/market/offers','sara',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'DRAFT'})).status).toBe(403);
  expect((await call('post','/market/offers','noor',{...base,sellerId:studentSeller.id,sourceId:shopSource.id,status:'DRAFT'})).status).toBe(400);
  expect((await call('post','/market/offers','noor',{...base,sellerId:studentSeller.id,sourceId:studentSource.id,status:'SOLD'})).status).toBe(400);
  const kit=(await studentOffer5('Spare jumper kit')).body;expect(kit).toMatchObject({sellerId:studentSeller.id,status:'ACTIVE',revision:0});
  for(const change of [{sellerId:shop.id},{sourceId:shopSource.id},{currency:'USD'},{condition:'NEW'},{partName:'Renamed'},{catalogKey:'sprint6_sensor'}])
   expect([change,(await call('patch','/market/offers/'+kit.id,'noor',{expectedRevision:0,quantity:2,status:'ACTIVE',...change})).status]).toEqual([change,400]);
  expect((await call('get',`/market/offers/${kit.id}/history`,'noor')).body.items).toHaveLength(1);
 });
 it('enforces approved status transitions, final closed states and concurrent closing',async()=>{
  const draft=(await studentOffer5('Spare resistor pack','DRAFT')).body;
  for(const status of ['SOLD','EXPIRED'])expect([status,(await patchOffer(draft.id,0,status)).status]).toEqual([status,400]);
  expect((await patchOffer(draft.id,0,'WITHDRAWN')).body).toMatchObject({status:'WITHDRAWN',revision:1});
  for(const status of ['DRAFT','ACTIVE','WITHDRAWN'])expect([status,(await patchOffer(draft.id,1,status)).status]).toEqual([status,409]);
  expect((await call('post',`/market/offers/${draft.id}/prices`,'noor',{expectedRevision:1,sourceId:studentSource.id,unitPrice:'3',currency:'ILS',observedAt:ago(0)})).status).toBe(409);
  const active=(await studentOffer5('Spare LED strip')).body;
  expect((await patchOffer(active.id,0,'DRAFT')).status).toBe(400);
  const closes=await Promise.all([patchOffer(active.id,0,'SOLD',0),patchOffer(active.id,0,'WITHDRAWN')]);expect(closes.map(r=>r.status).sort()).toEqual([200,409]);
  const winner=closes.find(r=>r.status===200)!.body;expect(winner.revision).toBe(1);
  expect((await call('get',`/market/offers/${active.id}/history`,'noor')).body.items.map((h:any)=>h.status)).toEqual(['ACTIVE',winner.status]);
 });
 it('reactivates an expired offer only after a new approved price observation',async()=>{
  const offer=(await studentOffer5('Spare servo horn')).body;
  expect((await patchOffer(offer.id,0,'EXPIRED')).body).toMatchObject({status:'EXPIRED',revision:1});
  expect((await call('get','/market/offers?search=servo%20horn','sara')).body.items).toEqual([]);
  for(const status of ['ACTIVE','SOLD','WITHDRAWN','DRAFT'])expect([status,(await patchOffer(offer.id,1,status)).status]).toEqual([status,400]);
  const fresh=(await call('post',`/market/sellers/${studentSeller.id}/sources`,'noor',{kind:'MANUAL',observedAt:ago(0.5)})).body,observedAt=ago(0.25),validUntil=new Date(Date.now()+7*86400000).toISOString();
  expect((await call('post',`/market/offers/${offer.id}/prices`,'noor',{expectedRevision:1,sourceId:fresh.id,unitPrice:'18',currency:'ILS',observedAt,validUntil})).body).toMatchObject({status:'EXPIRED',unitPrice:'18.00',revision:2,validUntil});
  expect((await patchOffer(offer.id,2,'ACTIVE')).status).toBe(400);
  await call('post',`/market/sources/${fresh.id}/review`,'manager',{decision:'APPROVED'}).expect(201);
  expect((await patchOffer(offer.id,1,'ACTIVE')).status).toBe(409);
  const reactivations=await Promise.all([patchOffer(offer.id,2,'ACTIVE'),patchOffer(offer.id,2,'ACTIVE')]);expect(reactivations.map(r=>r.status).sort()).toEqual([200,409]);
  expect((await call('get','/market/offers?search=servo%20horn','sara')).body.items.map((o:any)=>[o.id,o.unitPrice,o.priceObservedAt,o.source.id])).toEqual([[offer.id,'18.00',observedAt,fresh.id]]);
  expect((await call('get',`/market/offers/${offer.id}/history`,'noor')).body.items.map((h:any)=>[h.revision,h.status,h.unitPrice])).toEqual([[0,'ACTIVE','20.00'],[1,'EXPIRED','20.00'],[2,'EXPIRED','18.00'],[3,'ACTIVE','18.00']]);
 });
 it('locks a pre-existing disabled owner record out without letting managers or other students edit the offer',async()=>{
  const linaSeller=(await call('post','/market/sellers','lina',{name:'Lina spare parts',city:'Nablus'})).body;
  const linaSource=(await call('post',`/market/sellers/${linaSeller.id}/sources`,'lina',{kind:'MANUAL',observedAt:ago(1)})).body;
  await call('post',`/market/sources/${linaSource.id}/review`,'manager',{decision:'APPROVED'}).expect(201);
  const linaOffer=(await call('post','/market/offers','lina',{sellerId:linaSeller.id,sourceId:linaSource.id,partName:'Spare breadboard',condition:'USED',unitPrice:'7',currency:'ILS',quantity:1,status:'ACTIVE'})).body;expect(linaOffer.status).toBe('ACTIVE');
  // LabAssist offers no disable action (404); a disabled account can only be a pre-existing record, simulated here directly.
  expect((await call('patch',`/accounts/${accountId.lina}/status`,'head',{status:'DISABLED'})).status).toBe(404);
  await db.$executeRaw`UPDATE labassist_student.accounts SET status='DISABLED',updated_at=now() WHERE id=${accountId.lina}::uuid`;
  expect((await patchOffer(linaOffer.id,0,'WITHDRAWN',1,'lina')).status).toBe(401);
  expect((await call('post',`/market/offers/${linaOffer.id}/prices`,'lina',{expectedRevision:0,sourceId:linaSource.id,unitPrice:'6',currency:'ILS',observedAt:ago(0)})).status).toBe(401);
  for(const who of ['manager','noor'])expect([who,(await patchOffer(linaOffer.id,0,'WITHDRAWN',1,who)).status]).toEqual([who,403]);
  expect((await call('post',`/market/offers/${linaOffer.id}/prices`,'manager',{expectedRevision:0,sourceId:linaSource.id,unitPrice:'6',currency:'ILS',observedAt:ago(0)})).status).toBe(403);
  const rows=await db.$queryRaw<any[]>`SELECT status,revision,unit_price::text price FROM labassist_student.market_offers WHERE id=${linaOffer.id}::uuid`;expect(rows[0]).toEqual({status:'ACTIVE',revision:0,price:'7.00'});
 });
});
