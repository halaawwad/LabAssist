import {FetchLike, requestJson, requestText} from './http';
import {activeSale, decimal, errorMessage, positiveInteger, stockAvailability, stockCount, text} from './normalize';
import {CollectOptions, CollectionFailure, CollectionResult, NormalizedShopPrice, ShopPriceAdapter} from './types';

const SITE = 'https://picindustrial.com.ps/';
const CONFIG = `${SITE}supabase-config.js`;

export class PicIndustrialAdapter implements ShopPriceAdapter {
  readonly shop = 'PIC_INDUSTRIAL' as const;
  constructor(private readonly fetcher: FetchLike = fetch) {}

  async collect(options: CollectOptions = {}): Promise<CollectionResult> {
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 6_000);
    const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 100);
    const maxPages = Math.min(Math.max(options.maxPages ?? 5, 1), 60);
    const observedAt = options.observedAt ?? new Date();
    const request = {timeoutMs: options.timeoutMs ?? 8_000, retries: options.retries ?? 2};
    const items: NormalizedShopPrice[] = [];
    const failures: CollectionFailure[] = [];
    let pagesAttempted = 0;
    try {
      const config = await requestText(this.fetcher, CONFIG, {...request, maxBytes: 32_768});
      const baseUrl = /SUPABASE_URL\s*=\s*["']([^"']+)["']/.exec(config)?.[1];
      const key = /SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/.exec(config)?.[1];
      if (!baseUrl || !key || !baseUrl.startsWith('https://')) throw new Error('Malformed PIC Industrial public feed configuration');
      for (let page = 0; page < maxPages && items.length < limit; page++) {
        pagesAttempted++;
        const size = Math.min(pageSize, limit - items.length);
        const query = new URLSearchParams({select: '*', order: 'created_at.desc', limit: String(size), offset: String(page * pageSize)});
        let rows: unknown;
        try {
          rows = await requestJson(this.fetcher, `${baseUrl}/rest/v1/products?${query}`, {...request, headers: {apikey: key, authorization: `Bearer ${key}`}});
          if (!Array.isArray(rows)) throw new Error('Malformed PIC Industrial listing response');
        } catch (error) {
          failures.push({shop: this.shop, scope: `page:${page}`, message: errorMessage(error), retryable: true});
          break;
        }
        for (const row of rows) {
          try {
            items.push(this.normalize(row, observedAt));
          } catch (error) {
            const rowId = (row as any)?.id;
            failures.push({shop: this.shop, scope: `product:${text(rowId === undefined ? null : String(rowId)) ?? 'unknown'}`, message: errorMessage(error), retryable: false});
          }
        }
        if (rows.length < size) break;
      }
    } catch (error) {
      failures.push({shop: this.shop, scope: 'configuration', message: errorMessage(error), retryable: true});
    }
    return {shop: this.shop, items, failures, complete: failures.length === 0 && items.length < limit, pagesAttempted};
  }

  private normalize(value: unknown, observedAt: Date): NormalizedShopPrice {
    if (!value || typeof value !== 'object') throw new Error('Product is not an object');
    const row = value as Record<string, unknown>;
    const id = text(row.id === undefined ? null : String(row.id));
    const productName = text(row.name);
    if (!id || !productName) throw new Error('Product is missing id or name');
    const quantity = stockCount(row.stock);
    const retailPrice = decimal(row.price);
    const salePrice = decimal(row.sale_price);
    const saleStartsAt = text(row.sale_starts_at);
    const saleEndsAt = text(row.sale_ends_at);
    const saleActive = activeSale(row.sale_active, salePrice, saleStartsAt, saleEndsAt, observedAt);
    return {
      shop: this.shop,
      externalProductId: id,
      sku: text(row.sku),
      productName,
      sourceUrl: SITE,
      price: saleActive ? salePrice : retailPrice,
      currency: 'ILS',
      availability: stockAvailability(row.stock, quantity),
      availableQuantity: quantity,
      observedAt: observedAt.toISOString(),
      packageQuantity: positiveInteger(row.package_quantity),
      minimumOrderQuantity: positiveInteger(row.min_quantity),
      sale: {active: saleActive, price: salePrice, startsAt: saleStartsAt, endsAt: saleEndsAt},
      variantDetails: {category: text(row.category)},
    };
  }
}
