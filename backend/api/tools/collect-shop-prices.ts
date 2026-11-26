import {PicIndustrialAdapter, ShopCode, TechnolabAdapter} from '../src/price-collectors';

const value = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1];
const shop = (value('shop') ?? 'all').toLowerCase();
const limit = Math.min(Math.max(Number(value('limit') ?? 25), 1), 100);
const adapters = [new TechnolabAdapter(), new PicIndustrialAdapter()].filter((adapter) =>
  shop === 'all' || adapter.shop.toLowerCase().replace('_', '-') === shop,
);
if (!adapters.length) throw new Error('Use --shop=all|technolab|pic-industrial');

async function main() {
  const summaries: Array<{shop: ShopCode; collected: number; priced: number; failures: number; complete: boolean}> = [];
  for (const adapter of adapters) {
    const result = await adapter.collect({limit, pageSize: Math.min(limit, 50), maxPages: 2});
    summaries.push({shop: result.shop, collected: result.items.length, priced: result.items.filter((item) => item.price !== null).length, failures: result.failures.length, complete: result.complete});
    for (const failure of result.failures) console.error(`${failure.shop} ${failure.scope}: ${failure.message}`);
  }
  console.log(JSON.stringify({dryRun: true, databaseWrites: 0, summaries}, null, 2));
  if (summaries.some((summary) => summary.failures > 0)) process.exitCode = 1;
}

void main();
