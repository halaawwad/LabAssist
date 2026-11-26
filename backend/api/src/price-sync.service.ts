import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash} from 'crypto';
import {lookup} from 'dns/promises';
import {Prisma} from '@prisma/client';
import {Database} from './database/database.service';
import {Actor,Role} from './common/security/identity';
import {CollectionResult,NormalizedShopPrice,ShopCode} from './price-collectors';
import {requestText} from './price-collectors/http';
import {GlobalReferenceDto,MappingReviewDto,ShopComparisonQuery,ShopFeedDto,SHOPS} from './price-sync.dto';
import {translate} from './market.service';

type Tx=Prisma.TransactionClient;
const stale=(value:Date|null)=>!value||Date.now()-value.getTime()>24*60*60*1000;
const iso=(value:any)=>value==null?null:new Date(value).toISOString();
const money=(value:any)=>value==null?null:Number(value).toFixed(2);
const shopHost=(shop:ShopCode)=>shop==='TECHNOLAB'?'technolab.ps':'picindustrial.com.ps';
const approvedShopUrl=(shop:ShopCode,value:string|null)=>{try{const url=new URL(value??'');return url.protocol==='https:'&&url.hostname===shopHost(shop);}catch{return false;}};
@Injectable() export class PriceSyncService{
 constructor(private db:Database){}
 private manager(actor:Actor){if(actor.role!==Role.WORKSHOP_MANAGER)throw new ForbiddenException('Workshop manager permission required.');}
 private async run<T>(work:()=>Promise<T>){try{return await work();}catch(error){translate(error);}}

 configureFeed(actor:Actor,body:ShopFeedDto){return this.run(()=>this.db.$transaction(async tx=>{
  this.manager(actor);const rows=await tx.$queryRaw<any[]>`SELECT s.kind seller_kind,r.kind source_kind,r.status,r.url FROM labassist_student.market_sellers s JOIN labassist_student.resale_sources r ON r.seller_id=s.id WHERE s.id=${body.sellerId}::uuid AND r.id=${body.sourceId}::uuid`;
  const row=rows[0];if(!row)throw new BadRequestException('The seller and source do not match.');if(row.seller_kind!=='SHOP'||row.source_kind!=='SHOP_PAGE'||row.status!=='APPROVED'||!approvedShopUrl(body.shop,row.url))throw new BadRequestException('Price sync requires this shop\'s approved public SHOP_PAGE source.');
  const saved=await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_feeds(shop,seller_id,source_id,configured_by) VALUES(${body.shop},${body.sellerId}::uuid,${body.sourceId}::uuid,${actor.id}::uuid) ON CONFLICT(shop) DO UPDATE SET seller_id=excluded.seller_id,source_id=excluded.source_id,configured_by=excluded.configured_by,configured_at=now() RETURNING *`;
  return {shop:saved[0].shop,sellerId:saved[0].seller_id,sourceId:saved[0].source_id,configuredAt:iso(saved[0].configured_at)};}));}

 reviewMapping(actor:Actor,id:string,body:MappingReviewDto){return this.run(async()=>{this.manager(actor);
  if(body.decision==='APPROVED'&&(!body.catalogKey||!body.variantId))throw new BadRequestException('Approved mappings require a catalog key and exact variant.');
  await this.db.$executeRaw`SELECT labassist_student.review_shop_price_mapping(${actor.id}::uuid,${id}::uuid,${body.decision}::text,${body.catalogKey??null}::text,${body.variantId??null}::uuid,${body.saleQuantity??1}::int,${body.packageQuantity??null}::int)`;
  return {id,status:body.decision};});}

 addGlobalReference(actor:Actor,body:GlobalReferenceDto){return this.run(async()=>{this.manager(actor);if(new Date(body.observedAt)>new Date())throw new BadRequestException('The observation time cannot be in the future.');
  const exact=await this.db.$queryRaw<any[]>`SELECT labassist_student.part_variant_exact(${body.variantId}::uuid) exact`;if(!exact[0]?.exact)throw new BadRequestException('A global reference requires an exact catalog variant.');
  await this.verifyGlobalReference(body);
  const rows=await this.db.$queryRaw<any[]>`INSERT INTO labassist_student.global_price_references(variant_id,supplier,url,currency,price,quantity,observed_at,shipping_inclusion,tax_inclusion,created_by) VALUES(${body.variantId}::uuid,${body.supplier.trim()},${body.url},${body.currency},${body.price}::numeric,${body.quantity}::int,${body.observedAt}::timestamptz,${body.shippingInclusion??'UNKNOWN'},${body.taxInclusion??'UNKNOWN'},${actor.id}::uuid) RETURNING *`;
  return this.global(rows[0]);});}

 async importCollection(actorId:string,result:CollectionResult){return this.run(()=>this.db.$transaction(async tx=>{
  // Fail closed until the stock migration is installed, before recording any import.
  await tx.$queryRaw`SELECT stock_checked_at FROM labassist_student.market_offers LIMIT 0`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-price:${result.shop}`}))`;
  const observedAt=this.collectionTime(result);const prior=await tx.$queryRaw<any[]>`SELECT id,status FROM labassist_student.shop_price_checks WHERE shop=${result.shop} AND observed_at=${observedAt}::timestamptz`;
  if(prior[0])return {checkId:prior[0].id,idempotent:true,status:prior[0].status};
  const feed=(await tx.$queryRaw<any[]>`SELECT f.*,r.url,r.reviewed_by FROM labassist_student.shop_price_feeds f JOIN labassist_student.resale_sources r ON r.id=f.source_id AND r.seller_id=f.seller_id WHERE f.shop=${result.shop} AND r.status='APPROVED'`)[0];
  const status=result.failures.length?(result.items.length?'PARTIAL':'FETCH_FAILED'):'SUCCESS';
  const check=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_checks(shop,observed_at,status,complete,pages_attempted,failure_count) VALUES(${result.shop},${observedAt}::timestamptz,${status},${result.complete},${result.pagesAttempted},${result.failures.length}) RETURNING id`)[0];
  const mappings=await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.shop_price_mappings WHERE shop=${result.shop}`;const byExternal=new Map(mappings.map(m=>[m.external_product_id,m]));const seen=new Set<string>();
  if(!feed){await this.outcome(tx,check.id,result.shop,null,null,'MATCH_UNRESOLVED',null,observedAt,null);return {checkId:check.id,idempotent:false,status,outcomes:1};}
  for(const item of result.items){seen.add(item.externalProductId);let mapping=byExternal.get(item.externalProductId);
   if(!mapping){mapping=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_mappings(shop,external_product_id,sku,product_name,package_quantity) VALUES(${result.shop},${item.externalProductId},${item.sku},${item.productName},${item.packageQuantity}::int) RETURNING *`)[0];byExternal.set(item.externalProductId,mapping);}
   if(mapping.status==='PENDING'){await this.outcome(tx,check.id,result.shop,item,mapping,'MATCH_UNRESOLVED',null,observedAt,null);continue;}
   if(mapping.status==='REJECTED'){await this.outcome(tx,check.id,result.shop,item,mapping,'NO_MATCH',null,observedAt,null);continue;}
   if(!approvedShopUrl(result.shop,item.sourceUrl)){await this.outcome(tx,check.id,result.shop,item,mapping,'MATCH_UNRESOLVED',null,observedAt,null);continue;}
   const basis=item.minimumOrderQuantity??item.packageQuantity??1;
   if(mapping.sale_quantity!==basis||(mapping.package_quantity!=null&&item.packageQuantity!=null&&mapping.package_quantity!==item.packageQuantity)){
    await this.outcome(tx,check.id,result.shop,item,mapping,'MATCH_UNRESOLVED',null,observedAt,null);continue;}
   if(item.price===null){await this.outcome(tx,check.id,result.shop,item,mapping,'PRICE_NOT_LISTED',null,observedAt,null);continue;}
   const persisted=await this.persistPrice(tx,actorId,feed,mapping,item,observedAt);
   await this.outcome(tx,check.id,result.shop,item,mapping,'PRICE_FOUND',persisted.offerId,observedAt,persisted.sourceId);
  }
  if(result.complete)for(const mapping of mappings)if(mapping.status==='APPROVED'&&!seen.has(mapping.external_product_id))await this.outcome(tx,check.id,result.shop,null,mapping,'PRICE_NOT_LISTED',mapping.offer_id,observedAt,null);
  for(const failure of result.failures)await this.outcome(tx,check.id,result.shop,null,null,'FETCH_FAILED',null,observedAt,null,{scope:failure.scope,message:failure.message});
  return {checkId:check.id,idempotent:false,status};
 },{timeout:120_000}));}

 private collectionTime(result:CollectionResult){const times=result.items.map(item=>item.observedAt).filter(Boolean).sort();return times[0]??new Date().toISOString();}
 private async persistPrice(tx:Tx,actorId:string,feed:any,mapping:any,item:NormalizedShopPrice,observedAt:string){
  const hash=createHash('sha256').update(JSON.stringify({shop:item.shop,id:item.externalProductId,price:item.price,currency:item.currency,observedAt})).digest('hex');
  const derived=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,content_hash,status,reviewed_by,reviewed_at) VALUES(${feed.seller_id}::uuid,'SHOP_PAGE',${item.sourceUrl},${observedAt}::timestamptz,${hash},'APPROVED',${feed.reviewed_by}::uuid,now()) RETURNING id`)[0];
  let offer=mapping.offer_id?(await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_offers WHERE id=${mapping.offer_id}::uuid FOR UPDATE`)[0]:null;
  const quantity=item.availableQuantity;
  if(!offer){offer=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.market_offers(seller_id,source_id,catalog_key,variant_id,part_name,variant,condition,unit_price,currency,quantity,stock_availability,stock_checked_at,status,updated_by) VALUES(${feed.seller_id}::uuid,${derived.id}::uuid,${mapping.part_key},${mapping.variant_id}::uuid,${item.productName},'', 'NEW',${item.price}::numeric,${item.currency},${quantity}::int,${item.availability},${observedAt}::timestamptz,'ACTIVE',${actorId}::uuid) RETURNING *`)[0];await tx.$executeRaw`UPDATE labassist_student.shop_price_mappings SET offer_id=${offer.id}::uuid WHERE id=${mapping.id}::uuid`;return {offerId:offer.id,sourceId:derived.id};}
  await tx.$executeRaw`SELECT labassist_student.record_market_price(${actorId}::uuid,${offer.id}::uuid,${offer.revision}::int,${derived.id}::uuid,${item.price}::numeric,NULL,${item.currency}::char(3),${observedAt}::timestamptz,NULL)`;
  offer=(await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.market_offers WHERE id=${offer.id}::uuid FOR UPDATE`)[0];
  await tx.$executeRaw`SELECT labassist_student.update_shop_stock(${actorId}::uuid,${offer.id}::uuid,${offer.revision}::int,${quantity}::int,${item.availability},${observedAt}::timestamptz)`;
  return {offerId:offer.id,sourceId:derived.id};
 }
 private async outcome(tx:Tx,checkId:string,shop:ShopCode,item:any,mapping:any,outcome:string,offerId:string|null,observedAt:string,sourceId:string|null,details:Record<string,unknown>={}){
  const external=item?.externalProductId??mapping?.external_product_id??null;await tx.$executeRaw`INSERT INTO labassist_student.shop_price_outcomes(check_id,shop,external_product_id,mapping_id,part_key,variant_id,offer_id,source_id,outcome,availability,price,currency,source_url,observed_at,last_successful_check,package_quantity,sale_quantity,details,stock_evidence_verified) VALUES(${checkId}::uuid,${shop},${external},${mapping?.id??null}::uuid,${mapping?.part_key??null},${mapping?.variant_id??null}::uuid,${offerId}::uuid,${sourceId}::uuid,${outcome},${item?.availability??null},${item?.price??null}::numeric,${item?.price?item.currency:null}::char(3),${item?.sourceUrl??null},${observedAt}::timestamptz,${outcome==='FETCH_FAILED'?null:observedAt}::timestamptz,${item?.packageQuantity??mapping?.package_quantity??null}::int,${mapping?.sale_quantity??null}::int,${JSON.stringify(details)}::jsonb,${!!item})`;
 }

 compare(actor:Actor,q:ShopComparisonQuery){return this.run(async()=>{const reader=await this.db.$queryRaw<any[]>`SELECT labassist_student.communication_actor(${actor.id}::uuid) ok`;if(!reader[0]?.ok)throw new ForbiddenException('You do not have permission for this catalog or market action.');
  const exact=await this.db.$queryRaw<any[]>`SELECT labassist_student.part_variant_exact(${q.variantId}::uuid) exact`;if(!exact.length)throw new NotFoundException('Part variant not found.');if(!exact[0].exact)throw new BadRequestException('This part identity is not specific enough for exact comparison.');
  const local=[] as any[];let eligible=true;
  for(const shop of SHOPS){const row=(await this.db.$queryRaw<any[]>`SELECT o.* FROM labassist_student.shop_price_outcomes o JOIN labassist_student.shop_price_checks c ON c.id=o.check_id WHERE o.shop=${shop} AND o.variant_id=${q.variantId}::uuid ORDER BY o.observed_at DESC,o.id DESC LIMIT 1`)[0];
   const latest=(await this.db.$queryRaw<any[]>`SELECT status,complete,observed_at FROM labassist_student.shop_price_checks WHERE shop=${shop} ORDER BY observed_at DESC,id DESC LIMIT 1`)[0];
   const successful=(await this.db.$queryRaw<any[]>`SELECT max(observed_at) at FROM labassist_student.shop_price_checks WHERE shop=${shop} AND status='SUCCESS'`)[0]?.at??null;
   const status=latest&&latest.status!=='SUCCESS'?'FETCH_FAILED':row?.outcome??'MATCH_UNRESOLVED';const quantityMatches=row?.sale_quantity===q.quantity;const availability=row?(row.stock_evidence_verified?row.availability:'UNKNOWN'):null;const usable=status==='PRICE_FOUND'&&quantityMatches&&row.price!=null&&!['OUT_OF_STOCK','COMING_SOON'].includes(availability);
   if(!row||!successful||!latest?.complete||status==='FETCH_FAILED'||status==='MATCH_UNRESOLVED'||!quantityMatches||usable)eligible=false;
   local.push({shop,priceStatus:quantityMatches?status:'MATCH_UNRESOLVED',availability,stockCheckedAt:row?.stock_evidence_verified?iso(row.observed_at):null,price:quantityMatches?money(row?.price):null,currency:quantityMatches?row?.currency?.trim()??null:null,sourceUrl:row?.source_url??null,observedAt:iso(row?.observed_at),lastSuccessfulCheck:iso(successful),stale:stale(successful?new Date(successful):null),offerId:usable?row.offer_id:null});
  }
  const global=eligible?(await this.db.$queryRaw<any[]>`SELECT * FROM labassist_student.global_price_references WHERE variant_id=${q.variantId}::uuid AND quantity=${q.quantity}::int ORDER BY observed_at DESC,id DESC LIMIT 1`)[0]:null;
  return {variantId:q.variantId,quantity:q.quantity,localShops:local,globalFallbackEligible:eligible,globalReference:global?this.global(global):null};});}
 private global(row:any){return {supplier:row.supplier,url:row.url,currency:row.currency.trim(),price:money(row.price),quantity:row.quantity,observedAt:iso(row.observed_at),shippingInclusion:row.shipping_inclusion,taxInclusion:row.tax_inclusion};}
 private async verifyGlobalReference(body:GlobalReferenceDto){let html:string;try{const url=new URL(body.url);const addresses=await lookup(url.hostname,{all:true});if(!addresses.length||addresses.some(({address})=>/^(127\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|f[cd][0-9a-f:]*$|fe80:)/i.test(address)))throw new Error('Private address');html=await requestText(fetch,body.url,{timeoutMs:8_000,retries:1,maxBytes:512*1024,headers:{accept:'text/html,application/ld+json'}});}catch{throw new BadRequestException('The public supplier page could not be verified.');}
  const values:unknown[]=[];for(const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))try{values.push(JSON.parse(match[1]));}catch{}
  const objects:Record<string,any>[]=[];const walk=(value:unknown)=>{if(Array.isArray(value))for(const entry of value)walk(entry);else if(value&&typeof value==='object'){objects.push(value as Record<string,any>);for(const entry of Object.values(value))if(entry&&typeof entry==='object')walk(entry);}};values.forEach(walk);
  const expected=Number(body.price);const found=objects.some(value=>{const price=Number(value.price??value.lowPrice),currency=String(value.priceCurrency??'').toUpperCase();const quantity=Number(value.eligibleQuantity?.value??value.priceSpecification?.referenceQuantity?.value??1);return Number.isFinite(price)&&price===expected&&currency===body.currency&&quantity===body.quantity;});
  if(!found)throw new BadRequestException('The supplier page does not verify this price, currency and quantity.');
 }
}
