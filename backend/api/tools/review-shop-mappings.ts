import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {PicIndustrialAdapter, TechnolabAdapter} from '../src/price-collectors';

async function main() {
  const results = [];
  for (const adapter of [new TechnolabAdapter(), new PicIndustrialAdapter()]) {
    results.push(await adapter.collect({limit: 6_000, pageSize: 100, maxPages: 60}));
  }
  const output = join(tmpdir(), 'labassist-live-shop-review.json');
  await writeFile(output, JSON.stringify(results, null, 2), 'utf8');
  console.log(JSON.stringify({
    output,
    shops: results.map((result) => ({
      shop: result.shop,
      items: result.items.length,
      failures: result.failures.length,
      complete: result.complete,
      pagesAttempted: result.pagesAttempted,
    })),
  }));
  if (results.some((result) => result.failures.length > 0 || !result.complete)) process.exitCode = 1;
}

void main();
