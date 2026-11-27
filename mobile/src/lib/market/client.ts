// Catalog and market client for the LabAssist API (`/v1/catalog/*`, `/v1/market/*`).
// It never sends a request without a real access token from the session provider.
import { assertShopPriceComparison, type ShopPriceComparison } from "./shopPrices";
export type Page<T> = { items: T[]; nextCursor: string | null };
export type PinStatus = "UNKNOWN" | "UNVERIFIED";
export type PinField = {
  value: string | number | boolean | null;
  status: PinStatus;
  source: string | null;
};
export type Category = { id: string; nameEn: string; nameAr: string; sortOrder: number };
export type Part = {
  key: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  description: string;
  typicalSupplyVoltage: number | null;
  modelId: string;
  modelVersion: number;
  active: boolean;
  revision: number;
  exactIdentityFields: string[];
};
export type Guide = { language: string; version: number; content: Record<string, unknown> };
export type PartDetail = Part & { guides: Guide[]; pinCount: number; documentCount: number };
export type Pin = {
  id: string;
  modelId: string;
  modelVersion: number;
  pinIndex: number;
  name: string;
  kind: PinField;
  direction: PinField;
  connector: PinField;
  voltage: PinField;
  physicalNumber: PinField;
  functions: PinField;
  label: PinField;
  maxCurrent: PinField;
  internalNet: PinField;
  headerSide: PinField;
  headerRow: PinField;
};
export type PinPage = Page<Pin> & {
  part: string;
  modelId: string;
  modelVersion: number;
  wiringSafety: "NOT_EVALUATED";
};
export type CatalogDocument = {
  url: string;
  title: string;
  publisher: string;
  format: string;
  referenceScope: string;
  note: string;
  sourceVerifiedAt: string | null;
};
export type Variant = {
  id: string;
  partKey: string;
  manufacturer: string | null;
  modelNumber: string | null;
  packageOrRevision: string | null;
  sourceUrl: string | null;
  exact: boolean;
  createdAt: string;
};
export type Seller = {
  id: string;
  kind: "SHOP" | "STUDENT";
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  isDemo: boolean;
  own: boolean;
};
export type PublicOffer = {
  id: string;
  sellerId: string;
  catalogKey: string | null;
  variantId: string | null;
  partName: string;
  variant: string;
  condition: string;
  unitPrice: string;
  currency: string;
  quantity: number | null;
  stockAvailability?: string | null;
  stockCheckedAt?: string | null;
  shippingCost: string | null;
  validUntil: string | null;
  priceObservedAt: string | null;
  priceObservationLegacy: boolean;
  seller: {
    id: string;
    name: string;
    kind: string;
    city: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    website: string | null;
    isDemo: boolean;
  };
  source: { id: string; url: string | null; observedAt: string; reviewedAt: string };
  identity: {
    manufacturer: string | null;
    modelNumber: string | null;
    packageOrRevision: string | null;
    exact: boolean;
  };
  bookmarked: boolean;
};
export type CurrentUser = { id: string; role: string };
/** Supplied by the real mobile-session integration. This client never signs in or stores tokens. */
export interface MarketSession {
  getAccessToken(): Promise<string | null>;
  getCurrentUser(): Promise<CurrentUser | null>;
  /** Called after a 401 so the session owner can refresh or ask the user to sign in again. */
  onUnauthorized?(): void;
}
export class MarketApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "MarketApiError";
  }
}
export class SessionUnavailableError extends Error {
  constructor() {
    super("Sign in to LabAssist to see live catalog and market data.");
    this.name = "SessionUnavailableError";
  }
}
export class ApiNotConfiguredError extends Error {
  constructor() {
    super("The LabAssist API address is not configured.");
    this.name = "ApiNotConfiguredError";
  }
}
type Query = Record<string, string | number | null | undefined>;
type Paging = { limit?: number | undefined; cursor?: string | null | undefined };
export type MarketClient = ReturnType<typeof createMarketClient>;
export function marketApiBaseUrl(): string | null {
  const value = (
    process.env.EXPO_PUBLIC_LABASSIST_API_URL || process.env.EXPO_PUBLIC_API_URL || ""
  ).trim();
  return value ? value.replace(/\/v1\/?$/, "") : null;
}
export function createMarketClient({
  baseUrl,
  session,
  fetchImpl = (input, init) => fetch(input, init),
}: {
  baseUrl: string | null;
  session: MarketSession;
  fetchImpl?: ((input: string, init: RequestInit) => Promise<Response>) | undefined;
}) {
  async function get<T>(path: string, query: Query = {}, signal?: AbortSignal): Promise<T> {
    if (!baseUrl) throw new ApiNotConfiguredError();
    const token = await session.getAccessToken();
    if (!token) throw new SessionUnavailableError();
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/v1${path}`);
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== null && value !== "")
        url.searchParams.set(key, String(value));
    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        ...(signal ? { signal } : {}),
      });
    } catch (cause) {
      if (signal?.aborted) throw cause;
      throw new MarketApiError(
        0,
        "The LabAssist API could not be reached. Check your connection and retry.",
      );
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) session.onUnauthorized?.();
      const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
      throw new MarketApiError(
        response.status,
        typeof message === "string" && message ? message : `Request failed (${response.status}).`,
      );
    }
    return body as T;
  }
  const key = (value: string) => encodeURIComponent(value);
  return {
    categories: (q: Paging, signal?: AbortSignal) =>
      get<Page<Category>>("/catalog/categories", q, signal),
    parts: (
      q: Paging & { search?: string | undefined; category?: string | undefined },
      signal?: AbortSignal,
    ) => get<Page<Part>>("/catalog/parts", q, signal),
    part: (partKey: string, signal?: AbortSignal) =>
      get<PartDetail>(`/catalog/parts/${key(partKey)}`, {}, signal),
    pins: (partKey: string, q: Paging, signal?: AbortSignal) =>
      get<PinPage>(`/catalog/parts/${key(partKey)}/pins`, q, signal),
    documents: (partKey: string, q: Paging, signal?: AbortSignal) =>
      get<Page<CatalogDocument>>(`/catalog/parts/${key(partKey)}/documents`, q, signal),
    variants: (partKey: string, q: Paging, signal?: AbortSignal) =>
      get<Page<Variant>>(`/catalog/parts/${key(partKey)}/variants`, q, signal),
    sellers: (q: Paging & { kind?: "SHOP" | "STUDENT" | undefined }, signal?: AbortSignal) =>
      get<Page<Seller>>("/market/sellers", q, signal),
    offers: (
      q: Paging & {
        sellerKind?: "SHOP" | "STUDENT" | undefined;
        search?: string | undefined;
        catalogKey?: string | undefined;
      },
      signal?: AbortSignal,
    ) => get<Page<PublicOffer>>("/market/offers", q, signal),
    compare: (
      q: Paging & { catalogKey: string; currency: string; condition?: string | undefined },
      signal?: AbortSignal,
    ) => get<Page<PublicOffer>>("/market/compare", q, signal),
    compareExact: (
      q: Paging & { variantId: string; currency: string; condition?: string | undefined },
      signal?: AbortSignal,
    ) => get<Page<PublicOffer>>("/market/compare/exact", q, signal),
    /** Technolab and PIC Industrial prices for one exact variant and quantity (never converted). */
    shopPrices: (q: { variantId: string; quantity: number }, signal?: AbortSignal) =>
      get<ShopPriceComparison>("/market/prices/compare", q, signal).then(assertShopPriceComparison),
  };
}
