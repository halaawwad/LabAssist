/* Test-only Expo Web screen integration. Copy market-screen.fixture.tsx to src/app/market-check.tsx and run Expo before invoking. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.EXPO_TEST_URL || "http://localhost:8096";
const part = (key) => ({
  key,
  categoryId: "boards",
  nameEn: key,
  nameAr: "أردوينو",
  description: "API description",
  typicalSupplyVoltage: 5,
  modelId: "arduino-uno",
  modelVersion: 1,
  active: true,
  revision: 0,
  exactIdentityFields: [],
  guides: [],
  pinCount: 1,
  documentCount: 1,
});
const field = (value) => ({
  value,
  status: value === null ? "UNKNOWN" : "UNVERIFIED",
  source: null,
});
const offer = {
  id: "o1",
  partName: "Live Uno",
  catalogKey: "arduino_uno",
  unitPrice: "25.00",
  currency: "ILS",
  quantity: 2,
  condition: "USED",
  shippingCost: null,
  priceObservedAt: null,
  seller: { name: "Live Shop", city: "Nablus" },
  source: { url: "https://example.test/evidence" },
  identity: { exact: false },
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    let calls = [];
    let requestUrls = [];
    let fail = true;
    let variantFail = true;
    await page.route("http://market.test/**", async (route) => {
      const request = route.request(),
        u = new URL(request.url());
      calls.push(u.pathname);
      requestUrls.push(u.toString());
      if (request.method() === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "authorization,accept",
          },
        });
      assert.equal(request.headers().authorization, "Bearer test-only");
      let body;
      if (u.pathname.endsWith("/categories"))
        body = {
          items: [{ id: "boards", nameEn: "Boards", nameAr: "لوحات", sortOrder: 1 }],
          nextCursor: null,
        };
      else if (u.pathname.endsWith("/pins"))
        body = {
          items: [{ id: "p1", name: "VCC", voltage: field(null) }],
          nextCursor: null,
          wiringSafety: "NOT_EVALUATED",
        };
      else if (u.pathname.endsWith("/documents"))
        body = {
          items: [
            {
              url: "https://example.test/data",
              title: "Datasheet",
              publisher: "Maker",
              note: "reference",
              sourceVerifiedAt: null,
            },
          ],
          nextCursor: null,
        };
      else if (u.pathname.endsWith("/variants") && variantFail) {
        variantFail = false;
        return route.fulfill({
          status: 500,
          headers: { "access-control-allow-origin": "*" },
          json: { message: "Variant test failure" },
        });
      } else if (u.pathname.endsWith("/variants"))
        body = u.searchParams.has("cursor")
          ? {
              items: [
                {
                  id: "v-exact",
                  partKey: "arduino_uno",
                  manufacturer: "Arduino",
                  modelNumber: "A000066",
                  packageOrRevision: "Rev3",
                  exact: true,
                  sourceUrl: null,
                  createdAt: "2026-11-24T00:00:00Z",
                },
              ],
              nextCursor: null,
            }
          : {
              items: [
                {
                  id: "v-incomplete",
                  partKey: "arduino_uno",
                  manufacturer: "Arduino",
                  modelNumber: null,
                  packageOrRevision: null,
                  exact: false,
                  sourceUrl: null,
                  createdAt: "2026-11-24T00:00:00Z",
                },
              ],
              nextCursor: "variant-page-2",
            };
      else if (u.pathname.endsWith("/parts")) {
        if (u.searchParams.get("search") === "slow") {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          body = { items: [part("stale_result")], nextCursor: null };
        } else if (u.searchParams.get("search") === "fast") {
          body = { items: [part("arduino_uno")], nextCursor: null };
        } else {
          body = u.searchParams.has("cursor")
            ? { items: [part("arduino-uno")], nextCursor: null }
            : { items: [part("arduino_uno")], nextCursor: "page-2" };
        }
      } else if (u.pathname.includes("/catalog/parts/"))
        body = part(decodeURIComponent(u.pathname.split("/").pop()));
      else if (u.pathname.endsWith("/sellers"))
        body = {
          items: [
            {
              id: "s1",
              name: "Live Shop",
              city: "Nablus",
              phone: null,
              website: null,
              latitude: null,
              longitude: null,
            },
          ],
          nextCursor: null,
        };
      else if (u.pathname.endsWith("/offers") && fail) {
        fail = false;
        return route.fulfill({
          status: 500,
          headers: { "access-control-allow-origin": "*" },
          json: { message: "Test failure" },
        });
      } else if (u.pathname.endsWith("/compare/exact"))
        body = {
          items: [{ ...offer, id: "exact-offer", identity: { exact: true } }],
          nextCursor: null,
        };
      else body = { items: [offer], nextCursor: null };
      return route.fulfill({
        status: 200,
        headers: { "access-control-allow-origin": "*" },
        json: body,
      });
    });
    await page.goto(`${base}/market-check`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page
      .getByRole("button", { name: /arduino_uno, View details/ })
      .waitFor({ timeout: 120000 });
    await page.getByRole("button", { name: "Load more" }).click();
    await page.getByRole("button", { name: /arduino-uno, View details/ }).waitFor();
    await page.getByRole("button", { name: /arduino_uno, View details/ }).click();
    await page.getByText("voltage unknown", { exact: false }).waitFor();
    assert(
      await page
        .getByText("Functional grouping does not indicate physical pin placement", { exact: false })
        .count(),
    );
    assert(calls.some((x) => x.endsWith("/pins")) && calls.some((x) => x.endsWith("/documents")));
    await page.getByLabel("Back to components").click();
    await page.getByRole("button", { name: /arduino-uno, View details/ }).click();
    await page.getByText("No local preview or wiring sheet for this exact key.").waitFor();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    const search = page.getByLabel("Search components in English or Arabic");
    await search.fill("slow");
    await page.waitForTimeout(450);
    await search.fill("fast");
    await page.waitForTimeout(1500);
    assert.equal(await page.getByText("stale_result").count(), 0);
    await search.fill("");
    await page.getByRole("button", { name: "Test inventory" }).click();
    await page.getByText("Test failure").first().waitFor();
    await page.getByRole("button", { name: "Retry" }).first().click();
    await page.getByText("Live Uno").first().waitFor();
    await page.getByRole("tab", { name: "Local Stores" }).click();
    await page.getByText("Live Shop").first().waitFor();
    await page.getByText("Filters & comparison").click();
    await page.getByRole("button", { name: /Compare prices/ }).click();
    await page.getByRole("button", { name: "arduino_uno" }).first().click();
    await page.getByRole("button", { name: "Load more catalog parts" }).click();
    await page.getByText("Variant test failure").waitFor();
    await page.getByRole("button", { name: "Retry" }).click();
    await page.getByText("Incomplete identities are not offered for exact comparison.").waitFor();
    assert.equal(await page.getByRole("button", { name: /Unknown/ }).count(), 0);
    await page.getByRole("button", { name: "Load more exact identities" }).click();
    await page.getByRole("button", { name: "Arduino · A000066 · Rev3" }).click();
    await page
      .getByText("Only offers linked to the selected exact identity are compared.")
      .waitFor();
    await page.getByText("Exact identity", { exact: true }).last().waitFor();
    assert(
      requestUrls.some((url) =>
        url.includes("/v1/market/compare/exact?variantId=v-exact&currency=ILS"),
      ),
    );
    await page.getByRole("button", { name: "arduino-uno" }).first().click();
    await page
      .getByText("All published offers for this part are compared; no exact match is inferred.")
      .waitFor();
    await page.getByText("Live Uno").last().waitFor();
    assert(calls.some((x) => x.endsWith("/compare")));
    await page.getByLabel("Close inventory dialog").click();
    await page.getByRole("radio", { name: /Arabic|العربية/ }).click();
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await page.getByRole("button", { name: "Test catalog" }).click();
    await page.getByText("أردوينو").first().waitFor();
    assert((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 2);
    await page.getByRole("button", { name: "Test inventory" }).click();
    await page.getByText("إعادة بيع الطلاب").first().waitFor();
    assert((await page.evaluate(() => document.documentElement.scrollWidth)) <= width + 2);
    await page.getByRole("button", { name: "Test catalog" }).click();
    await page.getByText("أردوينو").first().waitFor();
    await page.getByRole("button", { name: "Test no session" }).click();
    const count = calls.length;
    await page.getByText("سجّل الدخول بحساب LabAssist لعرض البيانات المباشرة.").first().waitFor();
    assert.equal(calls.length, count);
    assert.equal(await page.getByText("أردوينو").count(), 0);
    console.log(`PASS ${width}px: mocked catalog, details, stores, retry, comparison and RTL`);
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
