import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatalogPartDialog } from "@/components/market/CatalogPartDialog";
import { MarketOfferList } from "@/components/market/MarketLists";
import { MarketPriceComparison } from "@/components/market/MarketPriceComparison";
import {
  ApiNotConfiguredError,
  createMarketClient,
  MarketApiError,
  SessionUnavailableError,
  type MarketSession,
  type Page,
  type PublicOffer,
} from "@/lib/market/client";
import { localPartForKey } from "@/lib/market/partKeys";
import { MarketSessionProvider, unavailableSession } from "@/lib/market/session";
import { usePagedResource } from "@/lib/market/useMarketData";
// Test-only doubles: a session that already holds a token, and an HTTP layer answering by path.
const session: MarketSession = {
  getAccessToken: async () => "token-from-test-session",
  getCurrentUser: async () => ({ id: "u1", role: "STUDENT" }),
};
const reply = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;
type Handler = (url: URL) => Response | Promise<Response>;
const api = (handler: Handler) =>
  vi.fn((input: string, _init?: RequestInit) => Promise.resolve(handler(new URL(input))));
const offer = (overrides: Partial<PublicOffer> = {}): PublicOffer => ({
  id: "o1",
  sellerId: "s1",
  catalogKey: "arduino_uno",
  variantId: null,
  partName: "Arduino Uno",
  variant: "",
  condition: "USED",
  unitPrice: "8.75",
  currency: "ILS",
  quantity: 2,
  shippingCost: null,
  validUntil: null,
  priceObservedAt: null,
  priceObservationLegacy: true,
  seller: {
    id: "s1",
    name: "Noor sheet",
    kind: "STUDENT",
    city: "Nablus",
    latitude: null,
    longitude: null,
    phone: null,
    website: null,
    isDemo: false,
  },
  source: {
    id: "src1",
    url: "https://example.org/evidence",
    observedAt: "2026-11-20T10:00:00.000Z",
    reviewedAt: "2026-11-21T10:00:00.000Z",
  },
  identity: { manufacturer: null, modelNumber: null, packageOrRevision: null, exact: false },
  bookmarked: false,
  ...overrides,
});
const withApi = (fetchImpl: ReturnType<typeof api>) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MarketSessionProvider session={session} baseUrl="http://api.test" fetchImpl={fetchImpl}>
        {children}
      </MarketSessionProvider>
    );
  };
afterEach(() => vi.restoreAllMocks());

describe("market client", () => {
  it("never sends a request without an API address or a real session token", async () => {
    const fetchImpl = vi.fn();
    await expect(
      createMarketClient({ baseUrl: null, session, fetchImpl }).parts({}),
    ).rejects.toBeInstanceOf(ApiNotConfiguredError);
    await expect(
      createMarketClient({
        baseUrl: "http://api.test",
        session: unavailableSession,
        fetchImpl,
      }).parts({}),
    ).rejects.toBeInstanceOf(SessionUnavailableError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it("calls /v1 routes with the session bearer token and skips empty query values", async () => {
    const fetchImpl = api(() => reply({ items: [], nextCursor: null }));
    await createMarketClient({ baseUrl: "http://api.test/", session, fetchImpl }).parts({
      search: "uno",
      category: undefined,
      limit: 24,
      cursor: null,
    });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("http://api.test/v1/catalog/parts?search=uno&limit=24");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token-from-test-session",
    });
  });
  it("reports API errors and lets the session owner react to 401", async () => {
    const onUnauthorized = vi.fn();
    const failing = createMarketClient({
      baseUrl: "http://api.test",
      session: { ...session, onUnauthorized },
      fetchImpl: api(() =>
        reply({ statusCode: 401, message: "Invalid sign-in details or session." }, 401),
      ),
    });
    await expect(failing.parts({})).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    const invalid = createMarketClient({
      baseUrl: "http://api.test",
      session,
      fetchImpl: api(() =>
        reply({ statusCode: 400, message: ["limit must not be greater than 100"] }, 400),
      ),
    });
    await expect(invalid.parts({ limit: 101 })).rejects.toEqual(
      new MarketApiError(400, "limit must not be greater than 100"),
    );
  });
});

describe("explicit part-key mapping", () => {
  it("attaches local 3D models only for identical catalog keys", () => {
    expect(localPartForKey("arduino_uno")?.key).toBe("arduino_uno");
    expect(localPartForKey("arduino-uno")).toBeNull();
    expect(localPartForKey("ARDUINO_UNO")).toBeNull();
    expect(localPartForKey("sprint6_unmapped")).toBeNull();
  });
});

describe("paged loading", () => {
  it("discards a slow response from a superseded search", async () => {
    const pending: Record<string, (page: Page<{ id: string }>) => void> = {};
    const load = (term: string) => () =>
      new Promise<Page<{ id: string }>>((resolve) => (pending[term] = resolve));
    const { result, rerender } = renderHook(({ term }) => usePagedResource(term, load(term)), {
      initialProps: { term: "ard" },
    });
    rerender({ term: "arduino" });
    await act(async () => pending["arduino"]!({ items: [{ id: "new" }], nextCursor: null }));
    await act(async () => pending["ard"]!({ items: [{ id: "stale" }], nextCursor: null }));
    expect(result.current.status).toBe("ready");
    expect(result.current.items.map((i) => i.id)).toEqual(["new"]);
  });
});

describe("market screens", () => {
  it("clears offers and shows sign-in when the session changes while mounted", async () => {
    const fetchImpl = api(() => reply({ items: [offer()], nextCursor: null }));
    const list = (
      <MarketOfferList
        sellerKind="STUDENT"
        search=""
        title="Student resale"
        description="d"
        label="resale listings"
      />
    );
    const view = render(
      <MarketSessionProvider session={session} baseUrl="http://api.test" fetchImpl={fetchImpl}>
        {list}
      </MarketSessionProvider>,
    );
    expect(await screen.findByText("8.75 ILS")).toBeInTheDocument();
    view.rerender(
      <MarketSessionProvider
        session={unavailableSession}
        baseUrl="http://api.test"
        fetchImpl={fetchImpl}
      >
        {list}
      </MarketSessionProvider>,
    );
    expect(
      await screen.findByText("Sign-in required for live resale listings", {}, { timeout: 500 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("8.75 ILS")).not.toBeInTheDocument();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    view.rerender(
      <MarketSessionProvider session={session} baseUrl="http://api.test" fetchImpl={fetchImpl}>
        {list}
      </MarketSessionProvider>,
    );
    expect(await screen.findByText("8.75 ILS")).toBeInTheDocument();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it("shows a sign-in state without any request or sample data when no real session is connected", async () => {
    const globalFetch = vi.spyOn(globalThis, "fetch");
    render(
      <MarketSessionProvider session={unavailableSession} baseUrl="http://api.test">
        <MarketOfferList
          sellerKind="STUDENT"
          search=""
          title="Student resale"
          description="d"
          label="resale listings"
        />
      </MarketSessionProvider>,
    );
    expect(
      await screen.findByText("Sign-in required for live resale listings"),
    ).toBeInTheDocument();
    expect(globalFetch).not.toHaveBeenCalled();
  });
  it("lists offers with currency, unknown legacy dates and evidence links, then pages without duplicate requests", async () => {
    const fetchImpl = api((url) =>
      url.searchParams.get("cursor") === "c1"
        ? reply({
            items: [
              offer({
                id: "o2",
                partName: "HC-SR04",
                unitPrice: "12.00",
                priceObservedAt: "2026-11-23T08:00:00.000Z",
                priceObservationLegacy: false,
              }),
            ],
            nextCursor: null,
          })
        : reply({ items: [offer()], nextCursor: "c1" }),
    );
    render(
      <MarketOfferList
        sellerKind="STUDENT"
        search=""
        title="Student resale"
        description="d"
        label="resale listings"
      />,
      { wrapper: withApi(fetchImpl) },
    );
    expect(await screen.findByText("8.75 ILS")).toBeInTheDocument();
    expect(screen.getByText("Price observation date unknown (legacy price)")).toBeInTheDocument();
    expect(screen.getByText("Address not published")).toBeInTheDocument();
    expect(screen.getByText("Shipping cost unknown")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Price evidence/ })).toHaveAttribute(
      "href",
      "https://example.org/evidence",
    );
    expect(screen.queryByText("Exact identity")).not.toBeInTheDocument();
    const more = screen.getByRole("button", { name: "Load more resale listings" });
    fireEvent.click(more);
    fireEvent.click(more);
    expect(await screen.findByText("12.00 ILS")).toBeInTheDocument();
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).includes("cursor=c1"))).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Load more/ })).not.toBeInTheDocument();
  });
  it("shows API errors with a working retry", async () => {
    let calls = 0;
    const fetchImpl = api(() =>
      ++calls === 1
        ? reply(
            { statusCode: 500, message: "The request could not be completed. Please retry." },
            500,
          )
        : reply({ items: [], nextCursor: null }),
    );
    render(
      <MarketOfferList
        sellerKind="SHOP"
        search=""
        title="Store prices"
        description="d"
        label="store prices"
      />,
      { wrapper: withApi(fetchImpl) },
    );
    expect(
      await screen.findByText("The request could not be completed. Please retry."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    expect(await screen.findByText("No store prices found")).toBeInTheDocument();
  });
  it("shows part pins and documents from their own endpoints with unknown and unverified values", async () => {
    const field = (value: string | number | null) => ({
      value,
      status: value === null ? "UNKNOWN" : "UNVERIFIED",
      source: null,
    });
    const pin = (index: number, name: string, voltage: number | null) => ({
      id: `m:1:${index}`,
      modelId: "m",
      modelVersion: 1,
      pinIndex: index,
      name,
      kind: field("power"),
      direction: field("in"),
      connector: field(null),
      voltage: field(voltage),
      physicalNumber: field(null),
      functions: field(null),
      label: field(null),
      maxCurrent: field(null),
      internalNet: field(null),
      headerSide: field(null),
      headerRow: field(null),
    });
    const fetchImpl = api((url) => {
      if (url.pathname.endsWith("/pins"))
        return reply({
          part: "sprint6_unmapped",
          modelId: "m",
          modelVersion: 1,
          wiringSafety: "NOT_EVALUATED",
          items: [pin(0, "VCC", null), pin(1, "OUT", 5)],
          nextCursor: null,
        });
      if (url.pathname.endsWith("/documents")) return reply({ items: [], nextCursor: null });
      if (url.pathname.endsWith("/variants")) return reply({ items: [], nextCursor: null });
      return reply({
        key: "sprint6_unmapped",
        categoryId: "c",
        nameEn: "Sprint Sensor",
        nameAr: "حساس",
        description: "",
        typicalSupplyVoltage: null,
        modelId: "m",
        modelVersion: 1,
        active: true,
        revision: 0,
        exactIdentityFields: ["MANUFACTURER"],
        guides: [],
        pinCount: 2,
        documentCount: 0,
      });
    });
    render(
      <CatalogPartDialog
        partKey="sprint6_unmapped"
        onClose={() => {}}
        onAdd={() => {}}
        onLab={() => {}}
      />,
      { wrapper: withApi(fetchImpl) },
    );
    expect(await screen.findByText("VCC · voltage unknown")).toBeInTheDocument();
    expect(screen.getByText("OUT · 5V (unverified)")).toBeInTheDocument();
    expect(screen.getByText(/Wiring safety is not evaluated/)).toBeInTheDocument();
    expect(
      screen.getByText("No local 3D model is mapped to this exact catalog key."),
    ).toBeInTheDocument();
    expect(screen.getByText("No documents")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to BOM/ })).not.toBeInTheDocument();
    expect(fetchImpl.mock.calls.map(([u]) => new URL(String(u)).pathname).sort()).toEqual([
      "/v1/catalog/parts/sprint6_unmapped",
      "/v1/catalog/parts/sprint6_unmapped/documents",
      "/v1/catalog/parts/sprint6_unmapped/pins",
      "/v1/catalog/parts/sprint6_unmapped/variants",
    ]);
  });
  it("labels offers exact only through an exact catalog variant", async () => {
    const fetchImpl = api((url) => {
      if (url.pathname === "/v1/catalog/parts")
        return reply({
          items: [
            {
              key: url.searchParams.get("cursor") ? "arduino_nano" : "arduino_uno",
              categoryId: "boards",
              nameEn: url.searchParams.get("cursor") ? "Arduino Nano" : "Arduino Uno",
              nameAr: "أردوينو",
              description: "",
              typicalSupplyVoltage: 5,
              modelId: "arduino-uno",
              modelVersion: 1,
              active: true,
              revision: 0,
              exactIdentityFields: [],
            },
          ],
          nextCursor: url.searchParams.get("cursor") ? null : "next-part",
        });
      if (url.pathname.endsWith("/variants"))
        return reply({
          items:
            url.searchParams.get("cursor") === "next-variant"
              ? [
                  {
                    id: "v-exact",
                    partKey: "arduino_uno",
                    manufacturer: "Arduino",
                    modelNumber: "A000066",
                    packageOrRevision: "Rev3",
                    sourceUrl: null,
                    exact: true,
                    createdAt: "2026-11-20T00:00:00.000Z",
                  },
                ]
              : [
                  {
                    id: "v-partial",
                    partKey: "arduino_uno",
                    manufacturer: "Arduino",
                    modelNumber: null,
                    packageOrRevision: null,
                    sourceUrl: null,
                    exact: false,
                    createdAt: "2026-11-20T00:00:00.000Z",
                  },
                ],
          nextCursor: url.searchParams.get("cursor") ? null : "next-variant",
        });
      if (url.pathname === "/v1/market/compare/exact")
        return reply({
          items: [
            offer({
              id: "exact",
              identity: {
                manufacturer: "Arduino",
                modelNumber: "A000066",
                packageOrRevision: "Rev3",
                exact: true,
              },
            }),
          ],
          nextCursor: null,
        });
      return reply({ items: [offer()], nextCursor: null });
    });
    render(<MarketPriceComparison />, { wrapper: withApi(fetchImpl) });
    fireEvent.click(await screen.findByRole("button", { name: "Load more catalog parts" }));
    expect(await screen.findByRole("button", { name: /Arduino Nano/ })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /Arduino Uno/ }));
    expect(await screen.findByText(/Identity not confirmed exact/)).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /not specific enough for exact matching/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Load more variants" }));
    expect(await screen.findByRole("option", { name: /A000066/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Exact identity"), { target: { value: "v-exact" } });
    await waitFor(() =>
      expect(
        fetchImpl.mock.calls.some(([u]) =>
          String(u).includes("/v1/market/compare/exact?variantId=v-exact&currency=ILS"),
        ),
      ).toBe(true),
    );
    expect(await screen.findByText(/· Exact identity/)).toBeInTheDocument();
  });
});
