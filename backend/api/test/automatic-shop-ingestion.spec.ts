import {Client} from 'pg';
import {Database} from '../src/database/database.service';
import {PriceSyncService} from '../src/price-sync.service';
import type {CollectionResult,NormalizedShopPrice} from '../src/price-collectors';
const data=require('../shared-data/20261126134500_sprint6_prices.json');
const {apply}=require('../shared-data/20261127100000_automatic_shop_prices.cjs');
describe('automatic shop ingestion without manager accounts',()=>{
 const db=new Database();let pg:Client;const service=new PriceSyncService(db);
 beforeAll(async()=>{
  if(!process.env.DATABASE_URL?.includes('_test'))throw Error('Disposable test database required');
  await db.$connect();pg=new Client({connectionString:process.env.DATABASE_URL});await pg.connect();
  await pg.query('TRUNCATE labassist_student.accounts,labassist_student.catalog_categories,labassist_student.catalog_models,labassist_student.market_sellers CASCADE');
 });
 afterAll(async()=>{await pg?.end();await db.$disconnect()});
 it('loads source evidence, variants, mappings and offers without a reviewer key or any account',async()=>{
  delete process.env.SHARED_DATA_REVIEWER_KEY;await pg.query('BEGIN');try{await apply(pg);await pg.query('COMMIT')}catch(e){await pg.query('ROLLBACK');throw e}
  expect((await pg.query('SELECT count(*)::int n FROM labassist_student.accounts')).rows[0].n).toBe(0);
  expect((await pg.query("SELECT count(*)::int n FROM labassist_student.resale_sources WHERE verification_method='AUTOMATED' AND reviewed_by IS NULL AND reviewed_at IS NULL AND verified_at IS NOT NULL")).rows[0].n).toBeGreaterThan(0);
  expect((await pg.query("SELECT count(*)::int n FROM labassist_student.shop_price_mappings WHERE matching_method='AUTOMATED' AND reviewed_by IS NULL AND reviewed_at IS NULL")).rows[0].n).toBe(data.rows.length);
  expect((await pg.query("SELECT count(*)::int n FROM labassist_student.market_public_offers")).rows[0].n).toBeGreaterThan(0);
 });
 const item=(row:any,at:string,price='11.00'):NormalizedShopPrice=>({shop:row.shop,externalProductId:row.external_product_id,sku:row.sku,productName:row.product_name,sourceUrl:row.source_url,price,currency:'ILS',availability:'IN_STOCK',availableQuantity:3,observedAt:at,packageQuantity:row.package_quantity,minimumOrderQuantity:row.sale_quantity,sale:{active:false,price:null,startsAt:null,endsAt:null},variantDetails:{}});
 const result=(i:NormalizedShopPrice):CollectionResult=>({shop:i.shop,items:[i],failures:[],complete:false,pagesAttempted:1});
 it('updates price and stock without a person, preserves history and is idempotent',async()=>{
  await pg.query("DELETE FROM labassist_student.shop_price_feeds WHERE shop=$1",[data.rows[0].shop]);
  const i=item(data.rows[0],new Date().toISOString());const a=await service.importCollection(null,result(i));const b=await service.importCollection(null,result(i));expect(a.idempotent).toBe(false);expect(b.idempotent).toBe(true);
  const offer=(await pg.query('SELECT o.unit_price::text price,o.quantity,o.updated_by FROM labassist_student.market_offers o JOIN labassist_student.shop_price_mappings m ON m.offer_id=o.id WHERE m.shop=$1 AND m.external_product_id=$2',[i.shop,i.externalProductId])).rows[0];expect(offer).toMatchObject({price:'11.00',quantity:3,updated_by:null});
  expect((await pg.query("SELECT count(*)::int n FROM labassist_student.market_price_observations WHERE recording_method='AUTOMATED' AND recorded_by IS NULL AND NOT is_legacy")).rows[0].n).toBeGreaterThan(data.rows.length);
 });
 it('matches an exact known tuple automatically and leaves an unknown product unresolved',async()=>{
  const r=data.rows[1];await pg.query('DELETE FROM labassist_student.shop_price_outcomes WHERE mapping_id IN(SELECT id FROM labassist_student.shop_price_mappings WHERE shop=$1 AND external_product_id=$2)',[r.shop,r.external_product_id]);
  await pg.query('DELETE FROM labassist_student.shop_price_mappings WHERE shop=$1 AND external_product_id=$2',[r.shop,r.external_product_id]);
  const known=item(r,new Date(Date.now()+1000).toISOString());await service.importCollection(null,result(known));
  expect((await pg.query('SELECT status,matching_method,reviewed_by FROM labassist_student.shop_price_mappings WHERE shop=$1 AND external_product_id=$2',[r.shop,r.external_product_id])).rows[0]).toEqual({status:'APPROVED',matching_method:'AUTOMATED',reviewed_by:null});
  const unknown={...known,externalProductId:'unknown-part',productName:'Unknown ambiguous board',observedAt:new Date(Date.now()+2000).toISOString()};await service.importCollection(null,result(unknown));
  expect((await pg.query("SELECT status,variant_id,offer_id FROM labassist_student.shop_price_mappings WHERE external_product_id='unknown-part'")).rows[0]).toEqual({status:'PENDING',variant_id:null,offer_id:null});
 });
 it('does not reuse a mapping when the shop changes the identity behind its external ID',async()=>{
  const row=data.rows[0];const changed={...item(row,new Date(Date.now()+3000).toISOString()),productName:'Different incompatible revision'};await service.importCollection(null,result(changed));
  expect((await pg.query('SELECT outcome FROM labassist_student.shop_price_outcomes WHERE shop=$1 AND external_product_id=$2 ORDER BY observed_at DESC LIMIT 1',[changed.shop,changed.externalProductId])).rows[0].outcome).toBe('MATCH_UNRESOLVED');
 });
 it('rejects a forged automatic source outside the internal pipeline transaction',async()=>{
  const seller=(await pg.query("SELECT seller_id FROM labassist_student.shop_price_feeds LIMIT 1")).rows[0].seller_id;
  await expect(pg.query("INSERT INTO labassist_student.resale_sources(seller_id,kind,url,observed_at,status,verification_method) VALUES($1,'SHOP_PAGE','https://technolab.ps/',now(),'APPROVED','AUTOMATED')",[seller])).rejects.toThrow('Service-owned shop source required');
 });
});