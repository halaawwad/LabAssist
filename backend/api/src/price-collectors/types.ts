export type ShopCode = 'TECHNOLAB' | 'PIC_INDUSTRIAL';
export type Availability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_DEMAND' | 'COMING_SOON' | 'UNKNOWN';

export interface NormalizedShopPrice {
  shop: ShopCode;
  externalProductId: string;
  sku: string | null;
  productName: string;
  sourceUrl: string;
  price: string | null;
  currency: 'ILS';
  availability: Availability;
  availableQuantity: number | null;
  observedAt: string;
  packageQuantity: number | null;
  minimumOrderQuantity: number | null;
  sale: {
    active: boolean;
    price: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
  variantDetails: Record<string, string | number | boolean | null>;
}

export interface CollectionFailure {
  shop: ShopCode;
  scope: string;
  message: string;
  retryable: boolean;
}

export interface CollectionResult {
  shop: ShopCode;
  items: NormalizedShopPrice[];
  failures: CollectionFailure[];
  complete: boolean;
  pagesAttempted: number;
}

export interface CollectOptions {
  limit?: number;
  pageSize?: number;
  maxPages?: number;
  timeoutMs?: number;
  retries?: number;
  observedAt?: Date;
}

export interface ShopPriceAdapter {
  readonly shop: ShopCode;
  collect(options?: CollectOptions): Promise<CollectionResult>;
}
