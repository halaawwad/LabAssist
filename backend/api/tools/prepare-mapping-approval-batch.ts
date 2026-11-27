import '../src/config/environment';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Database} from '../src/database/database.service';

type Evidence = [string,string,string,string|null,string,string,string,number,boolean];

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || target.pathname.replace(/^\//, '') !== 'labassist_auth_dev') {
    throw new Error('Approval batches may only be prepared from the loopback labassist_auth_dev database.');
  }
  const manifestPath = fileURLToPath(new URL('../src/price-collectors/reviewed-mappings.json', import.meta.url));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {mappingEvidence: Evidence[]};
  const db = new Database();
  await db.$connect();
  try {
    const batch = [];
    for (const [shop, catalogKey, externalProductId, sku, productName, sourceUrl, preciseVariant, saleQuantity, bundle] of manifest.mappingEvidence) {
      const rows = await db.$queryRaw<any[]>`SELECT id,status,part_key,variant_id FROM labassist_student.shop_price_mappings WHERE shop=${shop} AND external_product_id=${externalProductId}`;
      batch.push({shop, catalogKey, externalProductId, sku, productName, sourceUrl, preciseVariant, saleQuantity, bundle, mappingId: rows[0]?.id ?? null, currentStatus: rows[0]?.status ?? 'NOT_DISCOVERED', currentPartKey: rows[0]?.part_key ?? null, currentVariantId: rows[0]?.variant_id ?? null});
    }
    console.log(JSON.stringify({databaseCategory: 'LOCAL_DEVELOPMENT', count: batch.length, readyForManagerReview: batch.filter((row) => row.mappingId).length, batch}, null, 2));
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
