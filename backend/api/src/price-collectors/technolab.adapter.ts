import {activeSale, errorMessage, decimal, positiveInteger, stockAvailability, stockCount, text} from './normalize';
import {FetchLike, requestJson} from './http';
import {CollectOptions, CollectionFailure, CollectionResult, NormalizedShopPrice, ShopPriceAdapter} from './types';

const API = 'https://api.technolab.ps/item/getMyProducts';
const SITE = 'https://technolab.ps';

export class TechnolabAdapter implements ShopPriceAdapter {
  readonly shop = 'TECHNOLAB' as const;
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
    let totalCount: number | null = null;

    for (let page = 0; page < maxPages && items.length < limit; page++) {
      pagesAttempted++;
      try {
        const url = `${API}?pageNo=${page}&pageSize=${Math.min(pageSize, limit - items.length)}`;
        const body = await requestJson(this.fetcher, url, request) as Record<string, unknown>;
        if (body.status !== 'success' || !Array.isArray(body.message)) throw new Error('Malformed Technolab listing response');
        const optional = body.optional as Record<string, unknown> | undefined;
        const count = Number(optional?.totalCount);
        totalCount = Number.isFinite(count) && count >= 0 ? count : totalCount;
        for (const row of body.message) {
          try {
            items.push(this.normalize(row, observedAt));
          } catch (error) {
            const rowId = (row as any)?.id;
            failures.push({shop: this.shop, scope: `product:${text(rowId === undefined ? null : String(rowId)) ?? 'unknown'}`, message: errorMessage(error), retryable: false});
          }
          if (items.length >= limit) break;
        }
        if (body.message.length === 0 || (totalCount !== null && (page + 1) * pageSize >= totalCount)) break;
      } catch (error) {
        failures.push({shop: this.shop, scope: `page:${page}`, message: errorMessage(error), retryable: true});
        break;
      }
    }
    const reachedSourceEnd = totalCount !== null ? items.length >= totalCount : items.length < limit;
    return {shop: this.shop, items, failures, complete: failures.length === 0 && reachedSourceEnd, pagesAttempted};
  }

  private normalize(value: unknown, observedAt: Date): NormalizedShopPrice {
    if (!value || typeof value !== 'object') throw new Error('Product is not an object');
    const row = value as Record<string, unknown>;
    const id = text(row.id === undefined ? null : String(row.id));
    const productName = text(row.name);
    if (!id || !productName) throw new Error('Product is missing id or name');
    const retailPrice = row.hidePrice === true ? null : decimal(row.price0);
    const discountPrice = decimal(row.discountPrice);
    const end = text(row.saleEndDate);
    const saleActive = activeSale(row.onSale, discountPrice, null, end, observedAt);
    const quantity = stockCount(row.totalQuantity);
    const availability = row.comingSoon === true || (text(row.availabilityDate) && new Date(String(row.availabilityDate)) > observedAt)
      ? 'COMING_SOON'
      : row.onDemand === true ? 'ON_DEMAND'
      : stockAvailability(row.totalQuantity, quantity);
    return {
      shop: this.shop,
      externalProductId: id,
      sku: text(row.barcode),
      productName,
      sourceUrl: `${SITE}/detail/${encodeURIComponent(id)}`,
      price: saleActive ? discountPrice : retailPrice,
      currency: 'ILS',
      availability,
      availableQuantity: quantity,
      observedAt: observedAt.toISOString(),
      packageQuantity: null,
      minimumOrderQuantity: positiveInteger(row.minimumPurchaseQuantity),
      sale: {active: saleActive, price: discountPrice, startsAt: null, endsAt: end},
      variantDetails: {
        secondSku: text(row.secondBarcode),
        dimensions: text(row.dimensions),
        weight: decimal(row.weight),
      },
    };
  }
}
