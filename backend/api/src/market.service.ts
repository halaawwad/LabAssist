import {BadRequestException,ConflictException,ForbiddenException,HttpException,Injectable,NotFoundException} from '@nestjs/common';
import {Prisma} from '@prisma/client';
import {Database} from './database/database.service';
import {Actor,Role} from './common/security/identity';
import {CatalogPartUpdateDto,CatalogQuery,CompareQuery,ExactCompareQuery,IdentityFieldsDto,ManagedOfferQuery,OfferDto,OfferQuery,OfferUpdateDto,OfferVariantDto,PageQuery,PriceObservationDto,ReviewDto,RevokeDto,SellerDto,SellerQuery,SourceDto,SourceQuery,VariantDto} from './market.dto';
type Tx=Prisma.TransactionClient|Database;
const money=(v:any)=>v==null?null:Number(v).toFixed(2);
const num=(v:any)=>v==null?null:Number(v);
const iso=(v:any)=>v==null?null:new Date(v).toISOString();
const flag=(v?:string)=>v==='true';
const blank=(v?:string)=>v?.trim()?v.trim():null;
const DENIED='You do not have permission for this catalog or market action.';
const denied=()=>new ForbiddenException(DENIED);
const CONFLICT='This record changed since it was loaded. Reload and retry.';
// Database triggers and functions own the business rules; their RAISE messages are translated to stable HTTP answers here.
const RULES:[RegExp,number,string][]=[
 [/Revision conflict/,409,CONFLICT],
 [/Offer not found|Catalog part not found|Source not found|Part variant not found/,404,'The requested record was not found.'],
 [/curator required|Student required|Registered reader required|source review required/i,403,DENIED],
 [/requires a new price observation/,400,'Record a new approved price observation before reactivating this offer.'],
 [/Price change requires a new observation/,400,'Record a new price observation to change the price.'],
 [/Observation must be newer/,400,'The observation date must be later than the previous observation.'],
 [/Observation currency must match/,400,'The observation currency must match the offer currency.'],
 [/Observation date cannot be in the future/,400,'The observation date cannot be in the future.'],
 [/Observation source was rejected or revoked/,400,'The price source was rejected or revoked.'],
 [/Active offer requires reviewed source/,400,'An active offer requires an approved price source.'],
 [/explicit closing status/,400,'An active offer needs available quantity; choose SOLD, WITHDRAWN or EXPIRED to close it.'],
 [/requires a future expiry/,400,'An active offer needs a future expiry date.'],
 [/Offer status transition not allowed|New offers start as draft or active/,400,'This offer status change is not allowed.'],
 [/Closed offers cannot change/,409,'Sold or withdrawn offers cannot change.'],
 [/insufficient for exact comparison/,400,'This part identity is not specific enough for exact comparison.'],
 [/Only an approved source can be revoked|Source review transition not allowed/,409,'Only approved sources can be revoked, and reviews cannot be changed.'],
 [/Revocation reason required/,400,'A revocation reason is required.'],
 [/Page size must be between/,400,'Page size must be between 1 and 100.'],
 [/Both display names required/,400,'Both English and Arabic names are required.'],
 [/immutable|cannot be deleted/,400,'Recorded catalog or price evidence cannot be changed.'],
];
export function translate(error:any):never{
 if(error instanceof HttpException)throw error;
 const code=error?.meta?.code??error?.code,text=String(error?.meta?.message??error?.message??'');
 if(code==='40001'||code==='P2034')throw new ConflictException(CONFLICT);
 for(const [pattern,status,message] of RULES)if(pattern.test(text))throw new HttpException(message,status);
 if(code==='23505'||code==='P2002')throw new ConflictException('A matching record already exists.');
 if(code==='23503')throw new BadRequestException('A referenced catalog part, variant, seller or source does not exist or does not match.');
 if(code==='P0001'||code==='23514'||code==='22P02'||code==='22003'||code==='22007'||code==='22008')throw new BadRequestException('The catalog or market request is invalid.');
 throw error;
}
// Keyset pages: callers receive an opaque cursor; malformed cursors are rejected instead of silently restarting.
const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
function decode(cursor:string|undefined,keys:string[]):Record<string,any>|null{
 if(!cursor)return null;let value:any=null;try{value=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));}catch{value=null;}
 if(!value||typeof value!=='object'||Array.isArray(value)||keys.some(k=>!['string','number'].includes(typeof value[k])))throw new BadRequestException('Invalid page cursor.');
 return value;
}
const size=(q:PageQuery)=>q.limit??50;
function page<T>(rows:any[],limit:number,map:(r:any)=>T,key:(r:any)=>unknown){const more=rows.length>limit,list=rows.slice(0,limit);return {items:list.map(map),nextCursor:more?encode(key(list[list.length-1])):null};}
const fromDb=<T>(result:{items:any[];next:any},map:(r:any)=>T,key:(next:any)=>unknown)=>({items:result.items.map(map),nextCursor:result.next==null?null:encode(key(result.next))});
// Microsecond UTC text for timestamp cursors, so equal-millisecond rows are neither skipped nor repeated.
const stamp=(column:string)=>Prisma.raw(`to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`);
const seller=(r:any,actorId:string)=>({id:r.id,kind:r.kind,name:r.name,city:r.city,latitude:num(r.latitude),longitude:num(r.longitude),phone:r.phone,website:r.website,isDemo:r.is_demo,own:r.account_id===actorId});
const source=(r:any)=>({id:r.id,sellerId:r.seller_id,kind:r.kind,url:r.url,observedAt:iso(r.observed_at),contentHash:r.content_hash,status:r.status,reviewedBy:r.reviewed_by,reviewedAt:iso(r.reviewed_at),revokedBy:r.revoked_by,revokedAt:iso(r.revoked_at),revocationReason:r.revocation_reason});
const offer=(r:any)=>({id:r.id,sellerId:r.seller_id,sourceId:r.source_id,catalogKey:r.catalog_key,variantId:r.variant_id,partName:r.part_name,variant:r.variant,condition:r.condition,unitPrice:money(r.unit_price),currency:r.currency,quantity:r.quantity,shippingCost:money(r.shipping_cost),validUntil:iso(r.valid_until),status:r.status,revision:r.revision,updatedAt:iso(r.updated_at)});
const part=(r:any)=>({key:r.key,categoryId:r.category_id,nameEn:r.name_en,nameAr:r.name_ar,description:r.description,typicalSupplyVoltage:num(r.typical_supply_voltage),modelId:r.model_id,modelVersion:r.model_version,active:r.active,revision:r.revision,exactIdentityFields:r.exact_identity_fields});
const variant=(r:any)=>({id:r.id,partKey:r.part_key,manufacturer:r.manufacturer,modelNumber:r.model_number,packageOrRevision:r.package_or_revision,sourceUrl:r.source_url,exact:r.exact,createdAt:iso(r.created_at)});
const observation=(r:any)=>({id:r.id,offerRevision:r.offer_revision,sourceId:r.source_id,sourceStatus:r.source_status,unitPrice:money(r.unit_price),shippingCost:money(r.shipping_cost),currency:r.currency,observedAt:iso(r.observed_at),isLegacy:r.is_legacy,recordedAt:iso(r.recorded_at)});
// Rows of the market_public_offers view, from SQL or from the paged JSON functions.
const publicOffer=(r:any,saved:Set<string>)=>({id:r.id,sellerId:r.seller_id,catalogKey:r.catalog_key,variantId:r.variant_id,partName:r.part_name,variant:r.variant,condition:r.condition,unitPrice:money(r.unit_price),currency:r.currency,quantity:r.quantity,shippingCost:money(r.shipping_cost),validUntil:iso(r.valid_until),
 priceObservedAt:iso(r.price_observed_at),priceObservationLegacy:r.price_observation_legacy,
 seller:{id:r.seller_id,name:r.seller,kind:r.seller_kind,city:r.city,latitude:num(r.latitude),longitude:num(r.longitude),phone:r.phone,website:r.website,isDemo:r.is_demo},
 source:{id:r.price_source_id,url:r.source_url,observedAt:iso(r.observed_at),reviewedAt:iso(r.reviewed_at)},
 identity:{manufacturer:r.manufacturer,modelNumber:r.model_number,packageOrRevision:r.package_or_revision,exact:r.identity_exact},bookmarked:saved.has(r.id)});
const pin=(x:any,m:any)=>({id:`${m.model_id}:${m.model_version}:${x.pin_index}`,modelId:m.model_id,modelVersion:m.model_version,pinIndex:x.pin_index,name:x.name,kind:x.kind,direction:x.direction,connector:x.connector,voltage:x.voltage,physicalNumber:x.physical_number,
 functions:x.functions,label:x.label,maxCurrent:x.max_current,internalNet:x.internal_net,headerSide:x.header_side,headerRow:x.header_row});
const json=(value:Record<string,any>|null)=>value==null?null:JSON.stringify(value);
@Injectable() export class MarketService{
 constructor(private db:Database){}
 private async run<T>(work:()=>Promise<T>){try{return await work();}catch(e){translate(e);}}
 private manager(a:Actor){return a.role===Role.WORKSHOP_MANAGER;}
 private async reader(a:Actor,tx:Tx=this.db){const rows=await tx.$queryRaw<any[]>`SELECT labassist_student.communication_actor(${a.id}::uuid) ok`;if(!rows[0]?.ok)throw denied();}
 private requireManager(a:Actor){if(!this.manager(a))throw new ForbiddenException('Workshop manager permission required.');}
 // Same rule as market_curator: managers curate SHOP sellers; a STUDENT seller is curated only by its student owner.
 private async curated(tx:Tx,id:string,a:Actor,lock=false){const rows=lock?await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_sellers WHERE id=${id}::uuid FOR UPDATE`:await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_sellers WHERE id=${id}::uuid`;const row=rows[0];if(!row)throw new NotFoundException('Seller not found.');
  if(!(row.kind==='SHOP'&&this.manager(a))&&!(row.kind==='STUDENT'&&a.role===Role.STUDENT&&row.account_id===a.id))throw denied();return row;}
 private async offerSeller(tx:Tx,id:string,a:Actor){const found=await tx.$queryRaw<any[]>`SELECT seller_id FROM labassist_student.market_offers WHERE id=${id}::uuid`;if(!found[0])throw new NotFoundException('Offer not found.');return this.curated(tx,found[0].seller_id,a);}
 private async activePart(key:string,a:Actor){const rows=await this.db.$queryRaw<any[]>`SELECT * FROM labassist_student.catalog_parts WHERE key=${key}`;const p=rows[0];if(!p||(!p.active&&!this.manager(a)))throw new NotFoundException('Catalog part not found.');return p;}

 categories(a:Actor,q:PageQuery){return this.run(async()=>{await this.reader(a);const c=decode(q.cursor,['sort']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT id,name_en,name_ar,sort_order FROM labassist_student.catalog_categories WHERE (${c?.sort??null}::int IS NULL OR sort_order>${c?.sort??null}::int) ORDER BY sort_order LIMIT ${limit+1}::int`;
  return page(rows,limit,r=>({id:r.id,nameEn:r.name_en,nameAr:r.name_ar,sortOrder:r.sort_order}),r=>({sort:r.sort_order}));});}
 parts(a:Actor,q:CatalogQuery){return this.run(async()=>{await this.reader(a);const all=flag(q.includeInactive);if(all)this.requireManager(a);const search=q.search?.trim()??'',category=q.category??null,c=decode(q.cursor,['name','key']),limit=size(q);
  // Same search semantics as read_catalog/read_catalog_page, with a category filter applied before paging.
  const rows=await this.db.$queryRaw<any[]>`SELECT * FROM labassist_student.catalog_parts p WHERE (${all} OR p.active) AND (strpos(lower(p.name_en),lower(${search}))>0 OR strpos(p.name_ar,${search})>0 OR strpos(p.key,lower(${search}))>0)
   AND (${category}::text IS NULL OR p.category_id=${category}) AND (${c?.key??null}::text IS NULL OR (p.name_en,p.key)>(${c?.name??null}::text,${c?.key??null}::text)) ORDER BY p.name_en,p.key LIMIT ${limit+1}::int`;
  return page(rows,limit,part,r=>({name:r.name_en,key:r.key}));});}
 partDetail(a:Actor,key:string){return this.run(async()=>{await this.reader(a);const p=await this.activePart(key,a);
  const [counts,guides]=await Promise.all([
   this.db.$queryRaw<any[]>`SELECT (SELECT count(*)::int FROM labassist_student.catalog_pins WHERE model_id=${p.model_id} AND model_version=${p.model_version}) pins,(SELECT count(*)::int FROM labassist_student.catalog_documents WHERE part_key=${key}) documents`,
   this.db.$queryRaw<any[]>`SELECT DISTINCT ON(language) language,version,content FROM labassist_student.catalog_guides WHERE part_key=${key} ORDER BY language,version DESC`]);
  return {...part(p),guides:guides.map(g=>({language:g.language,version:g.version,content:g.content})),pinCount:counts[0].pins,documentCount:counts[0].documents};});}
 pins(a:Actor,key:string,q:PageQuery){return this.run(async()=>{const c=decode(q.cursor,['pinIndex']);
  const rows=await this.db.$queryRaw<any[]>`SELECT labassist_student.catalog_pin_page(${a.id}::uuid,${key}::text,${size(q)}::int,${c?.pinIndex??null}::int) result`;const r=rows[0].result;
  return {part:r.part,modelId:r.model_id,modelVersion:r.model_version,wiringSafety:r.wiring_safety,items:r.items.map((x:any)=>pin(x,r)),nextCursor:r.next==null?null:encode({pinIndex:r.next})};});}
 documents(a:Actor,key:string,q:PageQuery){return this.run(async()=>{await this.reader(a);await this.activePart(key,a);const c=decode(q.cursor,['title','url']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT url,title,publisher,format,reference_scope,note,source_verified_at FROM labassist_student.catalog_documents WHERE part_key=${key} AND (${c?.url??null}::text IS NULL OR (title,url)>(${c?.title??null}::text,${c?.url??null}::text)) ORDER BY title,url LIMIT ${limit+1}::int`;
  return page(rows,limit,d=>({url:d.url,title:d.title,publisher:d.publisher,format:d.format,referenceScope:d.reference_scope,note:d.note,sourceVerifiedAt:iso(d.source_verified_at)}),d=>({title:d.title,url:d.url}));});}
 updatePart(a:Actor,key:string,b:CatalogPartUpdateDto){return this.run(async()=>{this.requireManager(a);const rows=await this.db.$queryRaw<any[]>`SELECT labassist_student.update_catalog_part(${a.id}::uuid,${key},${b.expectedRevision}::int,${b.nameEn.trim()}::text,${b.nameAr.trim()}::text,${b.description}::text,${b.active}::boolean) revision`;return {key,revision:rows[0].revision};});}
 variants(a:Actor,key:string,q:PageQuery){return this.run(async()=>{await this.reader(a);await this.activePart(key,a);const c=decode(q.cursor,['at','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT v.*,labassist_student.part_variant_exact(v.id) exact,${stamp('v.created_at')} cursor_at FROM labassist_student.catalog_part_variants v WHERE v.part_key=${key} AND (${c?.id??null}::uuid IS NULL OR (v.created_at,v.id)>(${c?.at??null}::timestamptz,${c?.id??null}::uuid)) ORDER BY v.created_at,v.id LIMIT ${limit+1}::int`;
  return page(rows,limit,variant,r=>({at:r.cursor_at,id:r.id}));});}
 createVariant(a:Actor,key:string,b:VariantDto){return this.run(async()=>{this.requireManager(a);await this.reader(a);await this.activePart(key,a);
  const created=await this.db.$queryRaw<any[]>`SELECT labassist_student.create_part_variant(${a.id}::uuid,${key}::text,${b.manufacturer??null}::text,${b.modelNumber??null}::text,${b.packageOrRevision??null}::text,${b.sourceUrl??null}::text) id`;
  const rows=await this.db.$queryRaw<any[]>`SELECT v.*,labassist_student.part_variant_exact(v.id) exact FROM labassist_student.catalog_part_variants v WHERE v.id=${created[0].id}::uuid`;return variant(rows[0]);});}
 identityFields(a:Actor,key:string,b:IdentityFieldsDto){return this.run(async()=>{this.requireManager(a);const rows=await this.db.$queryRaw<any[]>`SELECT labassist_student.set_part_identity_fields(${a.id}::uuid,${key}::text,${b.expectedRevision}::int,${b.fields}::text[]) revision`;return {key,revision:rows[0].revision};});}

 sellers(a:Actor,q:SellerQuery){return this.run(async()=>{await this.reader(a);const kind=q.kind??null,demo=flag(q.includeDemo),c=decode(q.cursor,['kind','name','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT id,kind,name,city,latitude::float8 latitude,longitude::float8 longitude,phone,website,is_demo,account_id FROM labassist_student.market_sellers WHERE (${kind}::text IS NULL OR kind=${kind}) AND (${demo} OR NOT is_demo OR account_id=${a.id}::uuid)
   AND (${c?.id??null}::uuid IS NULL OR (kind,name,id)>(${c?.kind??null}::text,${c?.name??null}::text,${c?.id??null}::uuid)) ORDER BY kind,name,id LIMIT ${limit+1}::int`;
  return page(rows,limit,r=>seller(r,a.id),r=>({kind:r.kind,name:r.name,id:r.id}));});}
 createSeller(a:Actor,b:SellerDto){return this.run(()=>this.db.$transaction(async tx=>{
  if(a.role!==Role.STUDENT)this.requireManager(a);await this.reader(a,tx);this.coordinates(b);let accountId:string|null=null;
  if(a.role===Role.STUDENT){await tx.$queryRaw`SELECT id FROM labassist_student.accounts WHERE id=${a.id}::uuid FOR UPDATE`;const own=await tx.$queryRaw<any[]>`SELECT id FROM labassist_student.market_sellers WHERE account_id=${a.id}::uuid`;if(own.length)throw new ConflictException('You already have a student seller profile.');accountId=a.id;}
  const rows=await tx.$queryRaw<any[]>`INSERT INTO labassist_student.market_sellers(kind,account_id,name,city,latitude,longitude,phone,website) VALUES(${accountId?'STUDENT':'SHOP'},${accountId}::uuid,${b.name.trim()},${b.city.trim()},${b.latitude??null}::numeric,${b.longitude??null}::numeric,${blank(b.phone)},${blank(b.website)}) RETURNING id,kind,name,city,latitude::float8 latitude,longitude::float8 longitude,phone,website,is_demo,account_id`;
  return seller(rows[0],a.id);}));}
 updateSeller(a:Actor,id:string,b:SellerDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);const row=await this.curated(tx,id,a,true);if(row.is_demo)throw new BadRequestException('Demonstration sellers cannot be edited.');this.coordinates(b);
  const rows=await tx.$queryRaw<any[]>`UPDATE labassist_student.market_sellers SET name=${b.name.trim()},city=${b.city.trim()},latitude=${b.latitude??null}::numeric,longitude=${b.longitude??null}::numeric,phone=${blank(b.phone)},website=${blank(b.website)} WHERE id=${id}::uuid RETURNING id,kind,name,city,latitude::float8 latitude,longitude::float8 longitude,phone,website,is_demo,account_id`;return seller(rows[0],a.id);}));}
 private coordinates(b:SellerDto){if((b.latitude==null)!==(b.longitude==null))throw new BadRequestException('Provide both latitude and longitude, or neither.');}

 createSource(a:Actor,sellerId:string,b:SourceDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);await this.curated(tx,sellerId,a);if(new Date(b.observedAt).getTime()>Date.now()+60000)throw new BadRequestException('The observation time cannot be in the future.');
  const rows=await tx.$queryRaw<any[]>`INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,content_hash) VALUES(${sellerId}::uuid,${b.kind},${blank(b.url)},${b.observedAt}::timestamptz,${b.contentHash??null}) RETURNING *`;return source(rows[0]);}));}
 sources(a:Actor,q:SourceQuery){return this.run(async()=>{await this.reader(a);if(!this.manager(a)&&a.role!==Role.STUDENT)throw denied();const status=q.status??null,all=this.manager(a),c=decode(q.cursor,['at','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT r.*,${stamp('r.observed_at')} cursor_at FROM labassist_student.resale_sources r JOIN labassist_student.market_sellers s ON s.id=r.seller_id WHERE (${status}::text IS NULL OR r.status=${status}) AND (${all} OR s.account_id=${a.id}::uuid)
   AND (${c?.id??null}::uuid IS NULL OR (r.observed_at,r.id)<(${c?.at??null}::timestamptz,${c?.id??null}::uuid)) ORDER BY r.observed_at DESC,r.id DESC LIMIT ${limit+1}::int`;
  return page(rows,limit,source,r=>({at:r.cursor_at,id:r.id}));});}
 review(a:Actor,id:string,b:ReviewDto){return this.run(async()=>{this.requireManager(a);await this.reader(a);
  const rows=await this.db.$queryRaw<any[]>`UPDATE labassist_student.resale_sources SET status=${b.decision},reviewed_by=${a.id}::uuid,reviewed_at=now() WHERE id=${id}::uuid AND status='PENDING' RETURNING *`;
  if(rows[0])return source(rows[0]);const exists=await this.db.$queryRaw<any[]>`SELECT 1 FROM labassist_student.resale_sources WHERE id=${id}::uuid`;if(!exists.length)throw new NotFoundException('Source not found.');throw new ConflictException('This source was already reviewed.');});}
 // Withdrawal of an approval: actor, time and reason are recorded by revoke_resale_source; evidence and history stay.
 revoke(a:Actor,id:string,b:RevokeDto){return this.run(async()=>{this.requireManager(a);await this.reader(a);
  await this.db.$executeRaw`SELECT labassist_student.revoke_resale_source(${a.id}::uuid,${id}::uuid,${b.reason}::text)`;const rows=await this.db.$queryRaw<any[]>`SELECT * FROM labassist_student.resale_sources WHERE id=${id}::uuid`;return source(rows[0]);});}

 compare(a:Actor,q:CompareQuery){return this.run(async()=>{const c=decode(q.cursor,['price','id']);
  const rows=await this.db.$queryRaw<any[]>`SELECT labassist_student.compare_part_offers_page(${a.id}::uuid,${q.catalogKey}::text,${q.currency}::char(3),${q.condition??null}::text,${q.variant??''}::text,${flag(q.includeDemo)}::boolean,${size(q)}::int,${json(c)}::jsonb) result`;
  return this.publicPage(a,rows[0].result);});}
 compareExact(a:Actor,q:ExactCompareQuery){return this.run(async()=>{const c=decode(q.cursor,['price','id']);
  const rows=await this.db.$queryRaw<any[]>`SELECT labassist_student.compare_variant_offers(${a.id}::uuid,${q.variantId}::uuid,${q.currency}::char(3),${q.condition??null}::text,${flag(q.includeDemo)}::boolean,${size(q)}::int,${json(c)}::jsonb) result`;
  return this.publicPage(a,rows[0].result);});}
 private async publicPage(a:Actor,result:{items:any[];next:any}){const saved=await this.saved(a,result.items.map(o=>o.id));return fromDb(result,o=>publicOffer(o,saved),n=>({price:String(n.price),id:n.id}));}
 private async saved(a:Actor,ids:string[]){if(a.role!==Role.STUDENT||!ids.length)return new Set<string>();const rows=await this.db.$queryRaw<any[]>`SELECT offer_id FROM labassist_student.market_bookmarks WHERE student_id=${a.id}::uuid AND offer_id=ANY(${ids}::uuid[])`;return new Set(rows.map(r=>r.offer_id as string));}
 offers(a:Actor,q:OfferQuery){return this.run(async()=>{await this.reader(a);const key=q.catalogKey??null,kind=q.sellerKind??null,search=q.search?.trim()||null,demo=flag(q.includeDemo),c=decode(q.cursor,['name','price','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT v.*,v.unit_price::text price_text FROM labassist_student.market_public_offers v WHERE (${key}::text IS NULL OR v.catalog_key=${key}) AND (${kind}::text IS NULL OR v.seller_kind=${kind}) AND (${search}::text IS NULL OR strpos(lower(v.part_name),lower(${search}))>0) AND (${demo} OR NOT v.is_demo)
   AND (${c?.id??null}::uuid IS NULL OR (v.part_name,v.unit_price,v.id)>(${c?.name??null}::text,${c?.price??null}::numeric,${c?.id??null}::uuid)) ORDER BY v.part_name,v.unit_price,v.id LIMIT ${limit+1}::int`;
  const saved=await this.saved(a,rows.map(r=>r.id));return page(rows,limit,r=>publicOffer(r,saved),r=>({name:r.part_name,price:r.price_text,id:r.id}));});}
 managed(a:Actor,q:ManagedOfferQuery){return this.run(async()=>{await this.reader(a);if(!this.manager(a)&&a.role!==Role.STUDENT)throw denied();const sellerId=q.sellerId??null,status=q.status??null,all=this.manager(a),c=decode(q.cursor,['at','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT o.*,${stamp('o.updated_at')} cursor_at FROM labassist_student.market_offers o JOIN labassist_student.market_sellers s ON s.id=o.seller_id WHERE (${sellerId}::uuid IS NULL OR o.seller_id=${sellerId}::uuid) AND (${status}::text IS NULL OR o.status=${status}) AND (${all} OR s.account_id=${a.id}::uuid)
   AND (${c?.id??null}::uuid IS NULL OR (o.updated_at,o.id)<(${c?.at??null}::timestamptz,${c?.id??null}::uuid)) ORDER BY o.updated_at DESC,o.id DESC LIMIT ${limit+1}::int`;
  return page(rows,limit,offer,r=>({at:r.cursor_at,id:r.id}));});}
 createOffer(a:Actor,b:OfferDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);await this.curated(tx,b.sellerId,a);if(b.validUntil&&new Date(b.validUntil).getTime()<=Date.now())throw new BadRequestException('The offer expiry must be in the future.');
  if(b.variantId&&!b.catalogKey)throw new BadRequestException('A catalog part is required for a part variant.');
  const rows=await tx.$queryRaw<any[]>`INSERT INTO labassist_student.market_offers(seller_id,source_id,catalog_key,variant_id,part_name,variant,condition,unit_price,currency,quantity,shipping_cost,valid_until,status,updated_by) VALUES(${b.sellerId}::uuid,${b.sourceId}::uuid,${b.catalogKey??null},${b.variantId??null}::uuid,${b.partName.trim()},${b.variant?.trim()??''},${b.condition},${b.unitPrice}::numeric,${b.currency},${b.quantity}::int,${b.shippingCost??null}::numeric,${b.validUntil??null}::timestamptz,${b.status},${a.id}::uuid) RETURNING *`;return offer(rows[0]);}));}
 // Quantity and status only: the current price is passed back unchanged, so update_market_offer never alters a price.
 updateOffer(a:Actor,id:string,b:OfferUpdateDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);await this.offerSeller(tx,id,a);
  await tx.$queryRaw`SELECT labassist_student.update_market_offer(${a.id}::uuid,${id}::uuid,${b.expectedRevision}::int,(SELECT unit_price FROM labassist_student.market_offers WHERE id=${id}::uuid),${b.quantity}::int,${b.status}::text)`;const rows=await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_offers WHERE id=${id}::uuid`;return offer(rows[0]);}));}
 recordPrice(a:Actor,id:string,b:PriceObservationDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);await this.offerSeller(tx,id,a);if(b.validUntil&&new Date(b.validUntil).getTime()<=Date.now())throw new BadRequestException('The offer expiry must be in the future.');
  await tx.$queryRaw`SELECT labassist_student.record_market_price(${a.id}::uuid,${id}::uuid,${b.expectedRevision}::int,${b.sourceId}::uuid,${b.unitPrice}::numeric,${b.shippingCost??null}::numeric,${b.currency}::char(3),${b.observedAt}::timestamptz,${b.validUntil??null}::timestamptz)`;
  const rows=await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_offers WHERE id=${id}::uuid`;return offer(rows[0]);}));}
 linkVariant(a:Actor,id:string,b:OfferVariantDto){return this.run(()=>this.db.$transaction(async tx=>{await this.reader(a,tx);await this.offerSeller(tx,id,a);
  await tx.$queryRaw`SELECT labassist_student.set_offer_variant(${a.id}::uuid,${id}::uuid,${b.expectedRevision}::int,${b.variantId}::uuid)`;const rows=await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_offers WHERE id=${id}::uuid`;return offer(rows[0]);}));}
 history(a:Actor,id:string,q:PageQuery){return this.run(async()=>{await this.reader(a);await this.offerSeller(this.db,id,a);const c=decode(q.cursor,['revision']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT revision,snapshot,created_at FROM labassist_student.market_offer_history WHERE offer_id=${id}::uuid AND (${c?.revision??null}::int IS NULL OR revision>${c?.revision??null}::int) ORDER BY revision LIMIT ${limit+1}::int`;
  return page(rows,limit,r=>({revision:r.revision,changedAt:iso(r.created_at),unitPrice:money(r.snapshot.unit_price),quantity:r.snapshot.quantity,status:r.snapshot.status}),r=>({revision:r.revision}));});}
 observations(a:Actor,id:string,q:PageQuery){return this.run(async()=>{await this.reader(a);await this.offerSeller(this.db,id,a);const c=decode(q.cursor,['revision']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT p.*,r.status source_status FROM labassist_student.market_price_observations p JOIN labassist_student.resale_sources r ON r.id=p.source_id WHERE p.offer_id=${id}::uuid AND (${c?.revision??null}::int IS NULL OR p.offer_revision>${c?.revision??null}::int) ORDER BY p.offer_revision LIMIT ${limit+1}::int`;
  return page(rows,limit,observation,r=>({revision:r.offer_revision}));});}

 bookmark(a:Actor,id:string,save:boolean){return this.run(async()=>{if(a.role!==Role.STUDENT)throw new ForbiddenException('Only students can bookmark offers.');await this.reader(a);
  if(save){const rows=await this.db.$queryRaw<any[]>`SELECT id FROM labassist_student.market_public_offers WHERE id=${id}::uuid`;if(!rows.length)throw new NotFoundException('Offer not found or no longer available.');}
  await this.db.$executeRaw`SELECT labassist_student.bookmark_market_offer(${a.id}::uuid,${id}::uuid,${save}::boolean)`;return {offerId:id,bookmarked:save};});}
 // Saved offers stay listed after they stop being comparable; `available` and `status` tell the student why.
 bookmarks(a:Actor,q:PageQuery){return this.run(async()=>{if(a.role!==Role.STUDENT)throw new ForbiddenException('Only students have bookmarks.');await this.reader(a);const c=decode(q.cursor,['name','id']),limit=size(q);
  const rows=await this.db.$queryRaw<any[]>`SELECT o.id,o.part_name,o.status FROM labassist_student.market_bookmarks b JOIN labassist_student.market_offers o ON o.id=b.offer_id WHERE b.student_id=${a.id}::uuid
   AND (${c?.id??null}::uuid IS NULL OR (o.part_name,o.id)>(${c?.name??null}::text,${c?.id??null}::uuid)) ORDER BY o.part_name,o.id LIMIT ${limit+1}::int`;
  const ids=rows.slice(0,limit).map(r=>r.id),visible=ids.length?await this.db.$queryRaw<any[]>`SELECT * FROM labassist_student.market_public_offers WHERE id=ANY(${ids}::uuid[])`:[];const byId=new Map(visible.map(v=>[v.id as string,v])),all=new Set(ids);
  return page(rows,limit,r=>{const v=byId.get(r.id);return {id:r.id,partName:r.part_name,status:r.status,available:!!v,publicOffer:v?publicOffer(v,all):null};},r=>({name:r.part_name,id:r.id}));});}
}
