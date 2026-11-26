import {PicIndustrialAdapter, TechnolabAdapter} from '../src/price-collectors';

const observedAt = new Date('2026-11-25T12:00:00.000Z');
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), {status, headers: {'content-type': 'application/json'}}));
const techProduct = (overrides: Record<string, unknown> = {}) => ({
  id: 1, barcode: 'TL000001', name: 'Arduino UNO', status: 'published', price0: 40,
  discountPrice: null, saleEndDate: null, onSale: false, hidePrice: false,
  minimumPurchaseQuantity: 1, totalQuantity: 4, ...overrides,
});
const techPage = (rows: unknown[]) => ({status: 'success', message: rows, optional: {totalCount: rows.length}});
const picConfig = 'const SUPABASE_URL = "https://public.example"; const SUPABASE_PUBLISHABLE_KEY = "public-key";';
const picProduct = (overrides: Record<string, unknown> = {}) => ({id: 9, sku: '009', name: 'Relay', price: '8.00', stock: 3, category: 'Modules', ...overrides});
const picFetch = (rows: unknown[] | Error) => jest.fn(async (input: string | URL | Request) => {
  const url = String(input);
  if (url.endsWith('supabase-config.js')) return new Response(picConfig);
  if (rows instanceof Error) throw rows;
  return new Response(JSON.stringify(rows), {headers: {'content-type': 'application/json'}});
});

describe('shop stock normalization', () => {
  it.each([true, false, null, undefined, '', '  ', 'invalid', -1, 1.5, {}, []])('does not treat %p as a count', async (value) => {
    const tech = await new TechnolabAdapter(jest.fn(() => json(techPage([techProduct({totalQuantity: value})]))) as typeof fetch).collect({observedAt, limit: 1, retries: 0});
    const pic = await new PicIndustrialAdapter(picFetch([picProduct({stock: value})]) as typeof fetch).collect({observedAt, limit: 2, retries: 0});
    const expected = typeof value === 'boolean' ? (value ? 'IN_STOCK' : 'OUT_OF_STOCK') : 'UNKNOWN';
    for (const item of [tech.items[0], pic.items[0]]) expect(item).toMatchObject({availableQuantity: null, availability: expected});
  });
  it.each([[0, 0], ['12', 12]])('preserves explicit count %p', async (value, count) => {
    const result = await new PicIndustrialAdapter(picFetch([picProduct({stock: value})]) as typeof fetch).collect({observedAt, limit: 2, retries: 0});
    expect(result.items[0]).toMatchObject({availableQuantity: count, availability: count ? 'IN_STOCK' : 'OUT_OF_STOCK'});
  });
});

describe('Technolab price adapter fixtures', () => {
  it('normalizes retail price, quantity rules and stock', async () => {
    const result = await new TechnolabAdapter(jest.fn(() => json(techPage([techProduct({minimumPurchaseQuantity: 3})]))) as typeof fetch).collect({observedAt, limit: 1, retries: 0});
    expect(result.items[0]).toMatchObject({shop: 'TECHNOLAB', sku: 'TL000001', price: '40', currency: 'ILS', availability: 'IN_STOCK', minimumOrderQuantity: 3, packageQuantity: null});
    expect(result.items[0].sourceUrl).toBe('https://technolab.ps/detail/1');
  });
  it('uses only an active, in-date sale and retains inactive sale evidence', async () => {
    const rows = [techProduct({id: 1, onSale: true, discountPrice: 30, saleEndDate: '2026-11-30'}), techProduct({id: 2, onSale: false, discountPrice: 20, saleEndDate: '2026-11-30'}), techProduct({id: 3, onSale: true, discountPrice: 10, saleEndDate: '2026-11-24'})];
    const result = await new TechnolabAdapter(jest.fn(() => json(techPage(rows))) as typeof fetch).collect({observedAt, limit: 3, retries: 0});
    expect(result.items.map((item) => [item.price, item.sale.active, item.sale.price])).toEqual([['30', true, '30'], ['40', false, '20'], ['40', false, '10']]);
  });
  it('returns null for hidden or missing prices and reports out of stock', async () => {
    const result = await new TechnolabAdapter(jest.fn(() => json(techPage([techProduct({hidePrice: true, price0: null, totalQuantity: 0})]))) as typeof fetch).collect({observedAt, limit: 1, retries: 0});
    expect(result.items[0]).toMatchObject({price: null, availability: 'OUT_OF_STOCK'});
  });
  it('keeps valid rows and reports malformed rows as a partial failure', async () => {
    const result = await new TechnolabAdapter(jest.fn(() => json(techPage([techProduct(), {id: 2}]))) as typeof fetch).collect({observedAt, limit: 2, retries: 0});
    expect(result.items).toHaveLength(1); expect(result.failures[0]).toMatchObject({scope: 'product:2', retryable: false}); expect(result.complete).toBe(false);
  });
  it('reports malformed listing responses', async () => {
    const result = await new TechnolabAdapter(jest.fn(() => json({status: 'success', message: {bad: true}})) as typeof fetch).collect({observedAt, retries: 0});
    expect(result.items).toEqual([]); expect(result.failures[0].scope).toBe('page:0');
  });
  it('reports a source failure after bounded retries', async () => {
    const fetcher = jest.fn(() => Promise.reject(new Error('offline')));
    const result = await new TechnolabAdapter(fetcher as typeof fetch).collect({observedAt, retries: 1});
    expect(fetcher).toHaveBeenCalledTimes(2); expect(result.failures[0]).toMatchObject({scope: 'page:0', retryable: true});
  });
});

describe('PIC Industrial price adapter fixtures', () => {
  it('normalizes retail price, package data and stock', async () => {
    const result = await new PicIndustrialAdapter(picFetch([picProduct({package_quantity: 5, min_quantity: 2})]) as typeof fetch).collect({observedAt, limit: 2, retries: 0});
    expect(result.items[0]).toMatchObject({shop: 'PIC_INDUSTRIAL', sku: '009', price: '8.00', currency: 'ILS', availability: 'IN_STOCK', packageQuantity: 5, minimumOrderQuantity: 2});
    expect(result.items[0].sourceUrl).toBe('https://picindustrial.com.ps/');
  });
  it('uses only an active, in-date sale and ignores inactive stored discounts', async () => {
    const rows = [picProduct({id: 1, sale_active: true, sale_price: '6.00', sale_starts_at: '2026-11-20T00:00:00Z', sale_ends_at: '2026-11-30T00:00:00Z'}), picProduct({id: 2, sale_active: false, sale_price: '5.00'}), picProduct({id: 3, sale_active: true, sale_price: '4.00', sale_starts_at: '2026-11-26T00:00:00Z'})];
    const result = await new PicIndustrialAdapter(picFetch(rows) as typeof fetch).collect({observedAt, limit: 4, retries: 0});
    expect(result.items.map((item) => [item.price, item.sale.active, item.sale.price])).toEqual([['6.00', true, '6.00'], ['8.00', false, '5.00'], ['8.00', false, '4.00']]);
  });
  it('returns null for a missing price and reports out of stock', async () => {
    const result = await new PicIndustrialAdapter(picFetch([picProduct({price: null, stock: 0})]) as typeof fetch).collect({observedAt, limit: 2, retries: 0});
    expect(result.items[0]).toMatchObject({price: null, availability: 'OUT_OF_STOCK'});
  });
  it('keeps valid rows and reports malformed rows as a partial failure', async () => {
    const result = await new PicIndustrialAdapter(picFetch([picProduct(), {id: 2}]) as typeof fetch).collect({observedAt, limit: 3, retries: 0});
    expect(result.items).toHaveLength(1); expect(result.failures[0]).toMatchObject({scope: 'product:2', retryable: false}); expect(result.complete).toBe(false);
  });
  it('reports malformed listing responses', async () => {
    const result = await new PicIndustrialAdapter(picFetch({bad: true} as any) as typeof fetch).collect({observedAt, retries: 0});
    expect(result.items).toEqual([]); expect(result.failures[0].scope).toBe('page:0');
  });
  it('reports source failure after bounded retries', async () => {
    const fetcher = picFetch(new Error('offline'));
    const result = await new PicIndustrialAdapter(fetcher as typeof fetch).collect({observedAt, retries: 1});
    expect(fetcher).toHaveBeenCalledTimes(3); expect(result.failures[0]).toMatchObject({scope: 'page:0', retryable: true});
  });
});
