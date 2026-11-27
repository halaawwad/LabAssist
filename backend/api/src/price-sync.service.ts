import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {BadRequestException,ConflictException,ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
import {createHash} from 'crypto';
import {lookup} from 'dns/promises';
import {Prisma} from '@prisma/client';
import {Database} from './database/database.service';
import {Actor,Role} from './common/security/identity';
import {CollectionResult,NormalizedShopPrice,ShopCode} from './price-collectors';
import {requestText} from './price-collectors/http';
import {GlobalReferenceDto,ShopComparisonQuery,SHOPS} from './price-sync.dto';
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


 addGlobalReference(actor:Actor,body:GlobalReferenceDto){return this.run(async()=>{this.manager(actor);if(new Date(body.observedAt)>new Date())throw new BadRequestException('The observation time cannot be in the future.');
  const exact=await this.db.$queryRaw<any[]>`SELECT labassist_student.part_variant_exact(${body.variantId}::uuid) exact`;if(!exact[0]?.exact)throw new BadRequestException('A global reference requires an exact catalog variant.');
  await this.verifyGlobalReference(body);
  const rows=await this.db.$queryRaw<any[]>`INSERT INTO labassist_student.global_price_references(variant_id,supplier,url,currency,price,quantity,observed_at,shipping_inclusion,tax_inclusion,created_by) VALUES(${body.variantId}::uuid,${body.supplier.trim()},${body.url},${body.currency},${body.price}::numeric,${body.quantity}::int,${body.observedAt}::timestamptz,${body.shippingInclusion??'UNKNOWN'},${body.taxInclusion??'UNKNOWN'},${actor.id}::uuid) RETURNING *`;
  return this.global(rows[0]);});}

 async importCollection(_actorId:string|null,result:CollectionResult){return this.run(()=>this.db.$transaction(async tx=>{
  const actorId=null;
  await tx.$executeRaw`SELECT set_config('labassist.price_pipeline','on',true)`;
  // Fail closed until the stock migration is installed, before recording any import.
  await tx.$queryRaw`SELECT stock_checked_at FROM labassist_student.market_offers LIMIT 0`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`shop-price:${result.shop}`}))`;
  const observedAt=this.collectionTime(result);const prior=await tx.$queryRaw<any[]>`SELECT id,status FROM labassist_student.shop_price_checks WHERE shop=${result.shop} AND observed_at=${observedAt}::timestamptz`;
  if(prior[0])return {checkId:prior[0].id,idempotent:true,status:prior[0].status};
  const feed=await this.ensureAutomaticFeed(tx,result.shop);
  const status=result.failures.length?(result.items.length?'PARTIAL':'FETCH_FAILED'):'SUCCESS';
  const check=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_checks(shop,observed_at,status,complete,pages_attempted,failure_count) VALUES(${result.shop},${observedAt}::timestamptz,${status},${result.complete},${result.pagesAttempted},${result.failures.length}) RETURNING id`)[0];
  const mappings=await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.shop_price_mappings WHERE shop=${result.shop}`;const byExternal=new Map(mappings.map(m=>[m.external_product_id,m]));const seen=new Set<string>();
  if(!feed){await this.outcome(tx,check.id,result.shop,null,null,'MATCH_UNRESOLVED',null,observedAt,null);return {checkId:check.id,idempotent:false,status,outcomes:1};}
  for(const item of result.items){seen.add(item.externalProductId);let mapping=byExternal.get(item.externalProductId);
   if(!mapping){mapping=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_mappings(shop,external_product_id,sku,product_name,package_quantity) VALUES(${result.shop},${item.externalProductId},${item.sku},${item.productName},${item.packageQuantity}::int) RETURNING *`)[0];byExternal.set(item.externalProductId,mapping);}
   if(mapping.sku!==item.sku||mapping.product_name!==item.productName){await this.outcome(tx,check.id,result.shop,item,mapping,'MATCH_UNRESOLVED',null,observedAt,null);continue;}
   if(mapping.status==='PENDING') mapping=await this.resolveAutomaticMapping(tx,mapping,item);
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


 private async ensureAutomaticFeed(tx:Tx,shop:ShopCode){
  const existing=(await tx.$queryRaw<any[]>`SELECT f.*,r.status,r.url FROM labassist_student.shop_price_feeds f JOIN labassist_student.resale_sources r ON r.id=f.source_id WHERE f.shop=${shop}`)[0];
  if(existing){if(!approvedShopUrl(shop,existing.url)||['REJECTED','REVOKED'].includes(existing.status))throw new BadRequestException('Shop feed evidence is invalid or revoked.');return existing;}
  const website='https://'+shopHost(shop)+'/';
  const candidates=await tx.$queryRaw<any[]>`SELECT id FROM labassist_student.market_sellers WHERE kind='SHOP' AND website=${website}`;
  if(candidates.length>1)throw new BadRequestException('Ambiguous shop website identity.');
  const seller=candidates[0]??(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.market_sellers(seed_key,kind,name,city,website) VALUES(${'AUTOMATIC_SHOP_'+shop},'SHOP',${shop==='TECHNOLAB'?'Technolab':'PIC Industrial'},'',${website}) ON CONFLICT(seed_key) DO UPDATE SET seed_key=excluded.seed_key RETURNING id`)[0];
  const source=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,status,verification_method) VALUES(${seller.id}::uuid,'SHOP_PAGE',${website},now(),'APPROVED','AUTOMATED') RETURNING id`)[0];
  return (await tx.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_feeds(shop,seller_id,source_id,configured_by) VALUES(${shop},${seller.id}::uuid,${source.id}::uuid,NULL) RETURNING *`)[0];
 }
 private async resolveAutomaticMapping(tx:Tx,mapping:any,item:NormalizedShopPrice){
  const evidence=JSON.parse(readFileSync(resolve(__dirname,'../shared-data/20261126134500_sprint6_prices.json'),'utf8')).rows;
  const normalize=(v:unknown)=>String(v??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
  const matches=evidence.filter((r:any)=>r.shop===item.shop&&String(r.external_product_id)===item.externalProductId&&normalize(r.sku)===normalize(item.sku)&&normalize(r.product_name)===normalize(item.productName)&&r.source_url===item.sourceUrl);
  if(matches.length!==1)return mapping;
  const row=matches[0];if(!(await tx.$queryRaw<any[]>`SELECT key FROM labassist_student.catalog_parts WHERE key=${row.part_key} AND active`).length)return mapping;
  const variant=(await tx.$queryRaw<any[]>`SELECT id FROM labassist_student.catalog_part_variants WHERE part_key=${row.part_key} AND lower(manufacturer) IS NOT DISTINCT FROM lower(${row.manufacturer}::text) AND lower(model_number) IS NOT DISTINCT FROM lower(${row.model_number}::text) AND lower(package_or_revision) IS NOT DISTINCT FROM lower(${row.package_or_revision}::text)`)[0]
    ??(await tx.$queryRaw<any[]>`SELECT labassist_student.create_part_variant(NULL,${row.part_key},${row.manufacturer},${row.model_number},${row.package_or_revision},${row.variant_source_url}) id`)[0];
  const exact=(await tx.$queryRaw<any[]>`SELECT labassist_student.part_variant_exact(${variant.id}::uuid) ok`)[0]?.ok;if(!exact)return mapping;
  await tx.$executeRaw`SELECT labassist_student.review_shop_price_mapping(NULL,${mapping.id}::uuid,'APPROVED',${row.part_key},${variant.id}::uuid,${row.sale_quantity}::int,${row.package_quantity}::int)`;
  return (await tx.$queryRaw<any[]>`SELECT * FROM labassist_student.shop_price_mappings WHERE id=${mapping.id}::uuid`)[0];
 }

 private collectionTime(result:CollectionResult){const times=result.items.map(item=>item.observedAt).filter(Boolean).sort();return times[0]??new Date().toISOString();}
 private async persistPrice(tx:Tx,actorId:string|null,feed:any,mapping:any,item:NormalizedShopPrice,observedAt:string){
  const hash=createHash('sha256').update(JSON.stringify({shop:item.shop,id:item.externalProductId,price:item.price,currency:item.currency,observedAt})).digest('hex');
  const derived=(await tx.$queryRaw<any[]>`INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,content_hash,status,verification_method) VALUES(${feed.seller_id}::uuid,'SHOP_PAGE',${item.sourceUrl},${observedAt}::timestamptz,${hash},'APPROVED','AUTOMATED') RETURNING id`)[0];
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
