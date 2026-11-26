import '../src/config/environment';
import {Database} from '../src/database/database.service';
import {PicIndustrialAdapter,TechnolabAdapter} from '../src/price-collectors';
import {PriceSyncService} from '../src/price-sync.service';

const argument=(name:string)=>process.argv.find(value=>value.startsWith(`--${name}=`))?.split('=')[1];
async function main(){
 const actorId=process.env.PRICE_SYNC_ACTOR_ID?.trim(),shop=argument('shop');
 if(!actorId||!/^[0-9a-f-]{36}$/i.test(actorId))throw Error('Set PRICE_SYNC_ACTOR_ID to the active workshop manager UUID.');
 const adapter=shop==='technolab'?new TechnolabAdapter():shop==='pic-industrial'?new PicIndustrialAdapter():null;
 if(!adapter)throw Error('Use --shop=technolab|pic-industrial.');
 const db=new Database();try{await db.$connect();await db.$queryRaw`SELECT stock_checked_at FROM labassist_student.market_offers LIMIT 0`;const collection=await adapter.collect({limit:6000,pageSize:100,maxPages:60});const result=await new PriceSyncService(db).importCollection(actorId,collection);console.log(JSON.stringify({shop:adapter.shop,collected:collection.items.length,failures:collection.failures.length,complete:collection.complete,...result},null,2));}finally{await db.$disconnect();}
}
void main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
