import {Database} from '../src/database/database.service';
import {PriceSyncService} from '../src/price-sync.service';
import {PicIndustrialAdapter, TechnolabAdapter} from '../src/price-collectors';
import {Role} from '../src/common/security/identity';

async function main() {
  if (!process.env.DATABASE_URL?.includes('_test')) throw new Error('Disposable _test database required.');
  const db = new Database();
  await db.$connect();
  try {
    const [manager] = await db.$queryRaw<any[]>`SELECT id FROM labassist_student.accounts WHERE role='WORKSHOP_MANAGER' LIMIT 1`;
    const [variant] = await db.$queryRaw<any[]>`SELECT id FROM labassist_student.catalog_part_variants WHERE part_key='sync_part' LIMIT 1`;
    if (!manager || !variant) throw new Error('Run test/price-sync.spec.ts first to create disposable validation data.');
    const service = new PriceSyncService(db);
    const checks = [
      {adapter: new TechnolabAdapter(), id: '198'},
      {adapter: new PicIndustrialAdapter(), id: '329'},
    ] as const;
    for (const check of checks) {
      const collected = await check.adapter.collect({limit: 6_000, pageSize: 100, maxPages: 60});
      const live = collected.items.find((item) => item.externalProductId === check.id);
      if (!live || live.price === null) throw new Error(`${check.adapter.shop}:${check.id} has no live price.`);
      const [mapping] = await db.$queryRaw<any[]>`INSERT INTO labassist_student.shop_price_mappings(shop,external_product_id,sku,product_name) VALUES(${live.shop},${live.externalProductId},${live.sku},${live.productName}) ON CONFLICT(shop,external_product_id) DO UPDATE SET sku=excluded.sku RETURNING id,status`;
      if (mapping.status === 'PENDING') throw new Error('Live validation requires an automatically matched catalog identity; no manual review is performed.');
      await service.importCollection(manager.id, {...collected, items: [live], complete: false});
    }
    const comparison = await service.compare({id: manager.id, role: Role.WORKSHOP_MANAGER}, {variantId: variant.id, quantity: 1});
    if (comparison.localShops.some((shop) => shop.priceStatus !== 'PRICE_FOUND' || shop.price === null)) throw new Error('Live prices did not reach comparison.');
    console.log(JSON.stringify({disposable: true, database: process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':***@'), shops: comparison.localShops.map(({shop, priceStatus, currency}) => ({shop, priceStatus, currency}))}));
  } finally {
    await db.$disconnect();
  }
}

void main();
