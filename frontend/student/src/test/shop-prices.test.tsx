import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ExactShopPrices, ShopPriceCards } from "@/components/market/ShopPrices";
import type { MarketSession } from "@/lib/market/client";
import { MarketSessionProvider, unavailableSession } from "@/lib/market/session";
import {
  formatShopPrice,
  lowerLocalShop,
  priceAmount,
  type LocalShopPrice,
  type ShopPriceComparison,
} from "@/lib/market/shopPrices";

// TEST-ONLY FIXTURES. These are not real Technolab/PIC prices and do not approve any mapping.
const fresh = new Date().toISOString();
const old = "2026-11-20T09:00:00.000Z";
const row = (shop: LocalShopPrice["shop"], o: Partial<LocalShopPrice> = {}): LocalShopPrice => ({
  shop,
  priceStatus: "PRICE_FOUND",
  availability: "IN_STOCK",
  price: shop === "TECHNOLAB" ? "45.00" : "42.50",
  currency: "ILS",
  sourceUrl: `https://fixture.test/${shop.toLowerCase()}`,
  observedAt: fresh,
  lastSuccessfulCheck: fresh,
  stale: false,
  offerId: `offer-${shop}`,
  ...o,
});
const comparison = (o: Partial<ShopPriceComparison> = {}): ShopPriceComparison => ({
  variantId: "v1",
  quantity: 1,
  localShops: [row("TECHNOLAB"), row("PIC_INDUSTRIAL")],
  globalFallbackEligible: false,
  globalReference: null,
  ...o,
});
const missing = (shop: LocalShopPrice["shop"], priceStatus: LocalShopPrice["priceStatus"]) =>
  row(shop, {
    priceStatus,
    price: null,
    currency: null,
    availability: null,
    offerId: null,
    sourceUrl: null,
  });
const reply = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response;
const tokenSession = (token: string, id: string): MarketSession => ({
  getAccessToken: async () => token,
  getCurrentUser: async () => ({ id, role: "STUDENT" }),
});
const sessionA = tokenSession("token-a", "student-a");
function setup(body: ShopPriceComparison | ((url: URL) => Promise<Response>), variantId = "v1") {
  const fetchImpl = vi.fn((input: string, _init?: RequestInit) =>
    typeof body === "function" ? body(new URL(input)) : Promise.resolve(reply(body)),
  );
  const wrap = (node: ReactNode, session: MarketSession = sessionA) => (
    <MarketSessionProvider session={session} baseUrl="https://api.test" fetchImpl={fetchImpl}>
      {node}
    </MarketSessionProvider>
  );
  const view = render(wrap(<ShopPriceCards variantId={variantId} />));
  return { fetchImpl, wrap, ...view };
}
const card = (name: RegExp) => screen.getByRole("article", { name });
const technolab = () => card(/Technolab · Nablus|تكنولاب · نابلس/);
const pic = () => card(/PIC Industrial · Nablus|PIC Industrial · نابلس/);

describe("shop price presentation rules", () => {
  it("never turns a missing or invalid price into zero", () => {
    expect(priceAmount(null)).toBeNull();
    expect(priceAmount("")).toBeNull();
    expect(priceAmount("abc")).toBeNull();
    expect(formatShopPrice(null, "ILS", "en")).toBeNull();
    expect(formatShopPrice("0.00", "ILS", "en")).toBe("0.00 ILS");
  });
  it("highlights only comparable, current, same-currency, purchasable prices", () => {
    expect(lowerLocalShop(comparison().localShops)).toBe("PIC_INDUSTRIAL");
    const usd = [row("TECHNOLAB"), row("PIC_INDUSTRIAL", { currency: "USD" })];
    expect(lowerLocalShop(usd)).toBeNull();
    expect(lowerLocalShop([row("TECHNOLAB"), row("PIC_INDUSTRIAL", { stale: true })])).toBeNull();
    expect(
      lowerLocalShop([row("TECHNOLAB"), row("PIC_INDUSTRIAL", { availability: "OUT_OF_STOCK" })]),
    ).toBeNull();
    expect(
      lowerLocalShop([row("TECHNOLAB", { priceStatus: "FETCH_FAILED" }), row("PIC_INDUSTRIAL")]),
    ).toBeNull();
  });
});

describe("ShopPriceCards", () => {
  it("shows two local prices with availability, dates, links and a lower-price badge", async () => {
    const { fetchImpl } = setup(comparison());
    await screen.findByText("45.00 ILS");
    const call = fetchImpl.mock.calls[0]!;
    expect(call[0]).toBe("https://api.test/v1/market/prices/compare?variantId=v1&quantity=1");
    expect((call[1]!.headers as Record<string, string>)["Authorization"]).toBe("Bearer token-a");
    expect(within(pic()).getByText("42.50 ILS")).toBeInTheDocument();
    expect(within(pic()).getByText("Lower local price")).toBeInTheDocument();
    expect(within(technolab()).queryByText("Lower local price")).toBeNull();
    expect(within(technolab()).getByText("In stock")).toBeInTheDocument();
    expect(within(technolab()).getByText(/Last successful check:/)).toBeInTheDocument();
    expect(within(technolab()).getByRole("link", { name: /View on shop site/ })).toHaveAttribute(
      "href",
      "https://fixture.test/technolab",
    );
    expect(screen.queryByText(/cheapest/i)).toBeNull();
    expect(screen.queryByTestId("global-reference")).toBeNull();
  });

  it("shows one price and a dash with the reason for the other shop", async () => {
    setup(comparison({ localShops: [row("TECHNOLAB"), missing("PIC_INDUSTRIAL", "NO_MATCH")] }));
    await screen.findByText("45.00 ILS");
    expect(within(pic()).getByText("—")).toBeInTheDocument();
    expect(within(pic()).getByText("No price available")).toBeInTheDocument();
    expect(within(pic()).getByText("This shop has no matching product.")).toBeInTheDocument();
    expect(within(pic()).queryByText(/0\.00/)).toBeNull();
    expect(screen.queryByText("Lower local price")).toBeNull();
  });

  it("distinguishes no listed price from no match", async () => {
    setup(
      comparison({
        localShops: [
          row("TECHNOLAB", {
            priceStatus: "PRICE_NOT_LISTED",
            price: null,
            availability: "ON_DEMAND",
          }),
          missing("PIC_INDUSTRIAL", "NO_MATCH"),
        ],
        globalFallbackEligible: true,
      }),
    );
    await screen.findByText("The shop lists this item without a price.");
    expect(within(technolab()).getByText("Available to order")).toBeInTheDocument();
    expect(within(technolab()).getByText("—")).toBeInTheDocument();
  });

  it("shows the labelled global reference when both are missing and the backend allows it", async () => {
    setup(
      comparison({
        localShops: [
          missing("TECHNOLAB", "NO_MATCH"),
          missing("PIC_INDUSTRIAL", "PRICE_NOT_LISTED"),
        ],
        globalFallbackEligible: true,
        globalReference: {
          supplier: "Fixture Supplier",
          url: "https://fixture.test/global",
          currency: "USD",
          price: "12.00",
          quantity: 1,
          observedAt: old,
          shippingInclusion: "UNKNOWN",
          taxInclusion: "INCLUDED",
        },
      }),
    );
    const global = await screen.findByTestId("global-reference");
    expect(
      within(global).getByText(/Global reference price — not a Technolab or PIC price/),
    ).toBeInTheDocument();
    expect(within(global).getByText("Fixture Supplier")).toBeInTheDocument();
    expect(within(global).getByText("12.00 USD")).toBeInTheDocument();
    expect(
      within(global).getByText(/Observed 20 Nov 2026 · Shipping: unknown · Tax: included/),
    ).toBeInTheDocument();
    expect(within(global).getByRole("link", { name: /View supplier page/ })).toHaveAttribute(
      "href",
      "https://fixture.test/global",
    );
    fireEvent.click(screen.getByRole("button", { name: "Show shop prices in Arabic" }));
    expect(
      within(global).getByText(/سعر عالمي مرجعي — ليس سعر تكنولاب أو PIC/),
    ).toBeInTheDocument();
    expect(within(global).getByText(/الشحن: غير معروف · الضريبة: مشمول/)).toBeInTheDocument();
  });

  it("shows a clear unavailable state when eligible but no reliable reference exists", async () => {
    setup(
      comparison({
        localShops: [missing("TECHNOLAB", "NO_MATCH"), missing("PIC_INDUSTRIAL", "NO_MATCH")],
        globalFallbackEligible: true,
      }),
    );
    expect(
      await screen.findByText(
        "No reliable global reference price is available for this exact part.",
      ),
    ).toBeInTheDocument();
  });

  it("hides the global card when local data failed or is unresolved, even if a reference is sent", async () => {
    setup(
      comparison({
        localShops: [
          missing("TECHNOLAB", "FETCH_FAILED"),
          missing("PIC_INDUSTRIAL", "MATCH_UNRESOLVED"),
        ],
        globalFallbackEligible: false,
        globalReference: {
          supplier: "Should not show",
          url: "https://fixture.test/x",
          currency: "USD",
          price: "1.00",
          quantity: 1,
          observedAt: old,
          shippingInclusion: "UNKNOWN",
          taxInclusion: "UNKNOWN",
        },
      }),
    );
    await screen.findByText("Latest update failed and no earlier price is available.");
    expect(screen.queryByTestId("global-reference")).toBeNull();
    expect(screen.queryByText("Should not show")).toBeNull();
  });

  it("never presents an unresolved mapping as a confirmed price", async () => {
    setup(
      comparison({
        localShops: [
          row("TECHNOLAB", {
            priceStatus: "MATCH_UNRESOLVED",
            price: null,
            currency: null,
            offerId: null,
          }),
          missing("PIC_INDUSTRIAL", "MATCH_UNRESOLVED"),
        ],
      }),
    );
    await waitFor(() => expect(screen.getAllByText("Match not confirmed")).toHaveLength(2));
    expect(within(technolab()).getByText("—")).toBeInTheDocument();
    expect(within(technolab()).queryByRole("link")).toBeNull();
    expect(within(technolab()).queryByText("In stock")).toBeNull();
  });

  it("shows a published out-of-stock price with its availability", async () => {
    setup(
      comparison({
        localShops: [
          row("TECHNOLAB", { availability: "OUT_OF_STOCK", offerId: null }),
          row("PIC_INDUSTRIAL", { price: "50.00" }),
        ],
      }),
    );
    await screen.findByText("45.00 ILS");
    expect(within(technolab()).getByText("Out of stock")).toBeInTheDocument();
    expect(screen.queryByText("Lower local price")).toBeNull();
  });

  it("keeps a last known price with its original date after a partial shop failure", async () => {
    setup(
      comparison({
        localShops: [
          row("TECHNOLAB", {
            priceStatus: "FETCH_FAILED",
            price: "40.00",
            observedAt: old,
            lastSuccessfulCheck: old,
            stale: true,
            offerId: null,
          }),
          row("PIC_INDUSTRIAL"),
        ],
      }),
    );
    await screen.findByText("40.00 ILS");
    const t = technolab();
    expect(within(t).getByText("Update failed")).toBeInTheDocument();
    expect(within(t).getByText(/last known price from 20 Nov 2026/)).toBeInTheDocument();
    expect(within(t).getByText("Price checked 20 Nov 2026")).toBeInTheDocument();
    expect(within(t).getByText("Last successful check: 20 Nov 2026")).toBeInTheDocument();
    expect(screen.queryByText("Lower local price")).toBeNull();
  });

  it("marks an old successful price as not recently checked", async () => {
    setup(
      comparison({
        localShops: [
          row("TECHNOLAB", { observedAt: old, lastSuccessfulCheck: old, stale: true }),
          row("PIC_INDUSTRIAL"),
        ],
      }),
    );
    await screen.findByText("45.00 ILS");
    expect(within(technolab()).getByText("Not checked recently")).toBeInTheDocument();
    expect(screen.queryByText("Lower local price")).toBeNull();
  });

  it("rejects an out-of-order response after the variant changes", async () => {
    const pending: Record<string, (r: Response) => void> = {};
    const { rerender, wrap } = setup(
      (url) => new Promise((resolve) => (pending[url.searchParams.get("variantId")!] = resolve)),
    );
    rerender(wrap(<ShopPriceCards variantId="v2" />));
    await waitFor(() => expect(pending["v2"]).toBeDefined());
    await act(async () =>
      pending["v2"]!(
        reply(
          comparison({
            variantId: "v2",
            localShops: [row("TECHNOLAB", { price: "22.00" }), row("PIC_INDUSTRIAL")],
          }),
        ),
      ),
    );
    await screen.findByText("22.00 ILS");
    await act(async () =>
      pending["v1"]!(
        reply(
          comparison({ localShops: [row("TECHNOLAB", { price: "99.00" }), row("PIC_INDUSTRIAL")] }),
        ),
      ),
    );
    expect(screen.queryByText("99.00 ILS")).toBeNull();
    expect(screen.getByText("22.00 ILS")).toBeInTheDocument();
  });

  it("clears results on logout and never shows a previous account's late response", async () => {
    const pending: ((r: Response) => void)[] = [];
    const { rerender, wrap, fetchImpl } = setup(
      () => new Promise((resolve) => pending.push(resolve)),
    );
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0]!(reply(comparison())));
    await screen.findByText("45.00 ILS");
    rerender(wrap(<ShopPriceCards variantId="v1" />, unavailableSession));
    expect(await screen.findByText("Sign in to LabAssist to see shop prices.")).toBeInTheDocument();
    expect(screen.queryByText("45.00 ILS")).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // Account A starts a request, then account B signs in before A's response arrives.
    rerender(wrap(<ShopPriceCards variantId="v1" />, tokenSession("token-a2", "student-a")));
    await waitFor(() => expect(pending).toHaveLength(2));
    const sessionB = tokenSession("token-b", "student-b");
    rerender(wrap(<ShopPriceCards variantId="v1" />, sessionB));
    await waitFor(() => expect(pending).toHaveLength(3));
    expect((fetchImpl.mock.calls[2]![1]!.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer token-b",
    );
    await act(async () =>
      pending[2]!(
        reply(
          comparison({ localShops: [row("TECHNOLAB", { price: "31.00" }), row("PIC_INDUSTRIAL")] }),
        ),
      ),
    );
    await act(async () =>
      pending[1]!(
        reply(
          comparison({ localShops: [row("TECHNOLAB", { price: "77.00" }), row("PIC_INDUSTRIAL")] }),
        ),
      ),
    );
    expect(screen.getByText("31.00 ILS")).toBeInTheDocument();
    expect(screen.queryByText("77.00 ILS")).toBeNull();
  });

  it("offers retry after an error without showing sample prices", async () => {
    let fail = true;
    const { fetchImpl } = setup(async () =>
      fail ? reply({ message: "Service unavailable" }, 503) : reply(comparison()),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Shop prices could not be loaded.");
    expect(screen.queryByText(/ILS/)).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: /Retry/ }));
    await screen.findByText("45.00 ILS");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("renders Arabic in RTL with locale dates and isolated Latin prices", async () => {
    setup(
      comparison({
        localShops: [row("TECHNOLAB", { observedAt: old }), missing("PIC_INDUSTRIAL", "NO_MATCH")],
      }),
    );
    await screen.findByText("45.00 ILS");
    fireEvent.click(screen.getByRole("button", { name: "Show shop prices in Arabic" }));
    const section = screen.getByTestId("shop-prices");
    expect(section).toHaveAttribute("dir", "rtl");
    expect(section).toHaveAttribute("lang", "ar");
    expect(within(technolab()).getByText("تكنولاب · نابلس")).toBeInTheDocument();
    expect(within(technolab()).getByText("45.00 ILS").closest("bdi")).toHaveAttribute("dir", "ltr");
    expect(within(technolab()).getByText(/تاريخ فحص السعر 20 نوفمبر 2026/)).toBeInTheDocument();
    expect(within(pic()).getByText("لا يوجد منتج مطابق لدى هذا المتجر.")).toBeInTheDocument();
  });
});

describe("ExactShopPrices (catalog details)", () => {
  it("offers only exact identities and loads prices only after an explicit choice", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/variants"))
        return reply({
          items: [
            {
              id: "v-exact",
              partKey: "arduino_uno",
              manufacturer: "Fixture",
              modelNumber: "R3",
              packageOrRevision: "DIP",
              sourceUrl: null,
              exact: true,
              createdAt: old,
            },
            {
              id: "v-loose",
              partKey: "arduino_uno",
              manufacturer: null,
              modelNumber: "Uno",
              packageOrRevision: null,
              sourceUrl: null,
              exact: false,
              createdAt: old,
            },
          ],
          nextCursor: null,
        });
      return reply(comparison({ variantId: "v-exact" }));
    });
    render(
      <MarketSessionProvider session={sessionA} baseUrl="https://api.test" fetchImpl={fetchImpl}>
        <ExactShopPrices partKey="arduino_uno" />
      </MarketSessionProvider>,
    );
    const select = await screen.findByRole("combobox");
    expect(
      within(select)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Choose an exact identity · اختر هوية دقيقة", "Fixture · R3 · DIP"]);
    expect(
      screen.getByText("Incomplete identities are not offered for shop prices."),
    ).toBeInTheDocument();
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes("/prices/compare"))).toBe(false);
    fireEvent.change(select, { target: { value: "v-exact" } });
    await screen.findByText("45.00 ILS");
    expect(fetchImpl.mock.calls.at(-1)![0]).toContain(
      "/v1/market/prices/compare?variantId=v-exact&quantity=1",
    );
  });
});
