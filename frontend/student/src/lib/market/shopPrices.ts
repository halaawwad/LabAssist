/**
 * Presentation rules for GET /v1/market/prices/compare (Technolab and PIC Industrial, Nablus).
 * Pure TypeScript, kept identical in frontend/student and mobile. It never invents prices:
 * a missing price stays missing ("—"), never zero, and nothing falls back to sample data.
 */
export type ShopCode = "TECHNOLAB" | "PIC_INDUSTRIAL";
export type PriceStatus =
  "PRICE_FOUND" | "PRICE_NOT_LISTED" | "NO_MATCH" | "FETCH_FAILED" | "MATCH_UNRESOLVED";
export type Inclusion = "UNKNOWN" | "INCLUDED" | "EXCLUDED";
export type LocalShopPrice = {
  shop: ShopCode;
  priceStatus: PriceStatus;
  availability: string | null;
  stockCheckedAt?: string | null;
  price: string | null;
  currency: string | null;
  sourceUrl: string | null;
  observedAt: string | null;
  lastSuccessfulCheck: string | null;
  stale: boolean;
  offerId: string | null;
};
export type GlobalPriceReference = {
  supplier: string;
  url: string;
  currency: string;
  price: string;
  quantity: number;
  observedAt: string;
  shippingInclusion: Inclusion;
  taxInclusion: Inclusion;
};
export type ShopPriceComparison = {
  variantId: string;
  quantity: number;
  localShops: LocalShopPrice[];
  globalFallbackEligible: boolean;
  globalReference: GlobalPriceReference | null;
};
/** Rejects a malformed comparison body so the UI shows an error state instead of guessing. */
export function assertShopPriceComparison(value: unknown): ShopPriceComparison {
  const body = value as Partial<ShopPriceComparison> | null;
  if (
    !body ||
    !Array.isArray(body.localShops) ||
    typeof body.globalFallbackEligible !== "boolean" ||
    body.localShops.some(
      (row) => !row || typeof row.shop !== "string" || typeof row.priceStatus !== "string",
    )
  )
    throw new Error("Shop prices returned an unexpected response. Please retry.");
  return body as ShopPriceComparison;
}
export type PriceLanguage = "en" | "ar";
export type Tone = "neutral" | "good" | "warn" | "muted";

export const SHOP_ORDER: readonly ShopCode[] = ["TECHNOLAB", "PIC_INDUSTRIAL"];
export const MISSING_PRICE = "—";
const SHOP_NAMES: Record<ShopCode, { en: string; ar: string }> = {
  TECHNOLAB: { en: "Technolab · Nablus", ar: "تكنولاب · نابلس" },
  PIC_INDUSTRIAL: { en: "PIC Industrial · Nablus", ar: "PIC Industrial · نابلس" },
};

/** Unicode isolate so Latin names, numbers and currency codes keep their order inside Arabic text. */
export const isolate = (value: string) => `⁨${value}⁩`;
const pick = (lang: PriceLanguage, en: string, ar: string) => (lang === "ar" ? ar : en);
const locale = (lang: PriceLanguage) => (lang === "ar" ? "ar-u-nu-latn" : "en-GB");

/** Parses an API decimal string. Anything that is not a finite, non-negative number is missing. */
export function priceAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}
export function formatShopPrice(
  value: string | null | undefined,
  currency: string | null | undefined,
  lang: PriceLanguage,
): string | null {
  const amount = priceAmount(value);
  const code = currency?.trim().toUpperCase();
  if (amount === null || !code) return null;
  const number = new Intl.NumberFormat(locale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${number} ${code}`;
}
export function formatShopDate(value: string | null | undefined, lang: PriceLanguage) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(locale(lang), { year: "numeric", month: "short", day: "numeric" });
}
export function availabilityLabel(value: string | null, lang: PriceLanguage) {
  switch (value) {
    case "IN_STOCK":
      return pick(lang, "In stock", "متوفر");
    case "OUT_OF_STOCK":
      return pick(lang, "Out of stock", "غير متوفر حالياً");
    case "ON_DEMAND":
      return pick(lang, "Available to order", "متوفر عند الطلب");
    case "COMING_SOON":
      return pick(lang, "Coming soon", "قريباً");
    default:
      return pick(lang, "Availability unknown", "التوفر غير معروف");
  }
}

export type ShopCardModel = {
  shop: ShopCode;
  name: string;
  /** Formatted price with currency, or "—" when there is no usable price. */
  priceText: string;
  hasPrice: boolean;
  /** Shown separately from the price; null when the listing itself is not confirmed. */
  availability: string | null;
  badge: { text: string; tone: Tone } | null;
  /** Short secondary explanation for missing, unresolved, failed or old prices. */
  note: string | null;
  /** Date the displayed price was observed (its original date, never refreshed). */
  priceDate: string | null;
  lastCheck: string;
  stockCheck: string | null;
  sourceUrl: string | null;
  lower: boolean;
};

const confirmedListing = (status: PriceStatus) =>
  status === "PRICE_FOUND" || status === "PRICE_NOT_LISTED" || status === "FETCH_FAILED";

function cardFor(
  shop: ShopCode,
  row: LocalShopPrice | undefined,
  lang: PriceLanguage,
  lowerShop: ShopCode | null,
): ShopCardModel {
  const t = (en: string, ar: string) => pick(lang, en, ar);
  const name = SHOP_NAMES[shop][lang];
  if (!row)
    return {
      shop,
      name,
      priceText: MISSING_PRICE,
      hasPrice: false,
      availability: null,
      badge: null,
      note: t(
        "No price information was returned for this shop.",
        "لم تصل معلومات سعر لهذا المتجر.",
      ),
      priceDate: null,
      lastCheck: t("No successful check yet", "لا يوجد فحص ناجح بعد"),
      stockCheck: null,
      sourceUrl: null,
      lower: false,
    };
  const price = formatShopPrice(row.price, row.currency, lang);
  const checked = formatShopDate(row.lastSuccessfulCheck, lang);
  const observed = formatShopDate(row.observedAt, lang);
  const lastCheck = checked
    ? t(`Last successful check: ${checked}`, `آخر فحص ناجح: ${checked}`)
    : t("No successful check yet", "لا يوجد فحص ناجح بعد");
  let badge: ShopCardModel["badge"] = null,
    note: string | null = null,
    shownPrice = price;
  switch (row.priceStatus) {
    case "PRICE_FOUND":
      if (!price) note = t("No listed price was returned.", "لم يصل سعر منشور.");
      else if (row.stale) {
        badge = { text: t("Not checked recently", "لم يُفحص مؤخراً"), tone: "warn" };
        note = t(
          "This price may have changed since it was checked.",
          "قد يكون السعر تغيّر منذ فحصه.",
        );
      }
      break;
    case "PRICE_NOT_LISTED":
      shownPrice = null;
      note = t("The shop lists this item without a price.", "يعرض المتجر القطعة دون سعر.");
      break;
    case "NO_MATCH":
      shownPrice = null;
      note = t("This shop has no matching product.", "لا يوجد منتج مطابق لدى هذا المتجر.");
      break;
    case "MATCH_UNRESOLVED":
      shownPrice = null;
      badge = { text: t("Match not confirmed", "المطابقة غير مؤكدة"), tone: "muted" };
      note = t(
        "This shop's listing has not been confirmed as this exact part, so no price is shown.",
        "لم يُؤكَّد أن منتج المتجر هو هذه القطعة نفسها، لذلك لا يُعرض سعر.",
      );
      break;
    case "FETCH_FAILED":
      badge = { text: t("Update failed", "تعذّر التحديث"), tone: "warn" };
      note = price
        ? t(
            `Latest update failed. Showing the last known price from ${observed ?? "an unknown date"}.`,
            `تعذّر آخر تحديث. يُعرض آخر سعر معروف بتاريخ ${observed ?? "غير معروف"}.`,
          )
        : t(
            "Latest update failed and no earlier price is available.",
            "تعذّر آخر تحديث ولا يوجد سعر سابق.",
          );
      break;
  }
  const confirmed = confirmedListing(row.priceStatus);
  return {
    shop,
    name,
    priceText: shownPrice ?? MISSING_PRICE,
    hasPrice: !!shownPrice,
    availability:
      confirmed && (shownPrice || row.availability)
        ? availabilityLabel(row.availability, lang)
        : null,
    badge,
    note,
    priceDate: shownPrice ? observed : null,
    lastCheck,
    stockCheck: confirmed
      ? t(
          `Stock last checked: ${formatShopDate(row.stockCheckedAt ?? null, lang) ?? "unknown"}`,
          `آخر فحص للتوفر: ${formatShopDate(row.stockCheckedAt ?? null, lang) ?? "غير معروف"}`,
        )
      : null,
    sourceUrl: confirmed ? row.sourceUrl : null,
    lower: lowerShop === shop,
  };
}

const unavailableNow = (availability: string | null) =>
  availability === "OUT_OF_STOCK" || availability === "COMING_SOON";
/**
 * The lower of the two local prices, only when both are current confirmed prices for the same
 * request (same variant and quantity), in the same currency, and purchasable. Otherwise null.
 */
export function lowerLocalShop(rows: LocalShopPrice[]): ShopCode | null {
  const usable = SHOP_ORDER.map((shop) => rows.find((row) => row.shop === shop));
  if (usable.some((row) => !row)) return null;
  const [a, b] = usable as [LocalShopPrice, LocalShopPrice];
  const comparable = (row: LocalShopPrice) =>
    row.priceStatus === "PRICE_FOUND" &&
    !row.stale &&
    !!row.currency &&
    priceAmount(row.price) !== null &&
    !unavailableNow(row.availability);
  if (!comparable(a) || !comparable(b)) return null;
  if (a.currency!.trim().toUpperCase() !== b.currency!.trim().toUpperCase()) return null;
  const pa = priceAmount(a.price)!,
    pb = priceAmount(b.price)!;
  return pa === pb ? null : pa < pb ? a.shop : b.shop;
}
export function currencyMismatch(rows: LocalShopPrice[]) {
  const codes = new Set(
    rows
      .filter((row) => priceAmount(row.price) !== null && row.currency)
      .map((row) => row.currency!.trim().toUpperCase()),
  );
  return codes.size > 1;
}
export function shopCards(data: ShopPriceComparison, lang: PriceLanguage): ShopCardModel[] {
  const lower = lowerLocalShop(data.localShops);
  return SHOP_ORDER.map((shop) =>
    cardFor(
      shop,
      data.localShops.find((row) => row.shop === shop),
      lang,
      lower,
    ),
  );
}

const inclusion = (value: Inclusion, lang: PriceLanguage, what: "shipping" | "tax") => {
  const en = what === "shipping" ? "Shipping" : "Tax";
  const ar = what === "shipping" ? "الشحن" : "الضريبة";
  const state =
    value === "INCLUDED"
      ? pick(lang, "included", "مشمول")
      : value === "EXCLUDED"
        ? pick(lang, "not included", "غير مشمول")
        : pick(lang, "unknown", "غير معروف");
  return pick(lang, `${en}: ${state}`, `${ar}: ${state}`);
};
export const GLOBAL_REFERENCE_LABEL = {
  en: "Global reference price — not a Technolab or PIC price",
  ar: "سعر عالمي مرجعي — ليس سعر تكنولاب أو PIC",
} as const;
export type GlobalCardModel =
  | { kind: "hidden" }
  | { kind: "unavailable"; title: string; note: string }
  | {
      kind: "reference";
      title: string;
      supplier: string;
      priceText: string;
      quantity: string | null;
      observed: string;
      shipping: string;
      tax: string;
      url: string;
    };
/** Global reference only when the backend says fallback is eligible; never on local failure alone. */
export function globalCard(data: ShopPriceComparison, lang: PriceLanguage): GlobalCardModel {
  if (!data.globalFallbackEligible) return { kind: "hidden" };
  const title = GLOBAL_REFERENCE_LABEL[lang];
  const ref = data.globalReference;
  const priceText = ref ? formatShopPrice(ref.price, ref.currency, lang) : null;
  if (!ref || !priceText || !ref.url)
    return {
      kind: "unavailable",
      title,
      note: pick(
        lang,
        "No reliable global reference price is available for this exact part.",
        "لا يتوفر سعر عالمي مرجعي موثوق لهذه القطعة.",
      ),
    };
  const observed = formatShopDate(ref.observedAt, lang);
  return {
    kind: "reference",
    title,
    supplier: ref.supplier,
    priceText,
    quantity:
      ref.quantity > 1 ? pick(lang, `For ${ref.quantity} units`, `لعدد ${ref.quantity} قطع`) : null,
    observed: observed
      ? pick(lang, `Observed ${observed}`, `تاريخ الرصد ${observed}`)
      : pick(lang, "Observation date unknown", "تاريخ الرصد غير معروف"),
    shipping: inclusion(ref.shippingInclusion, lang, "shipping"),
    tax: inclusion(ref.taxInclusion, lang, "tax"),
    url: ref.url,
  };
}

/** Fixed student-facing strings for both apps. */
export function shopPriceCopy(lang: PriceLanguage) {
  const t = (en: string, ar: string) => pick(lang, en, ar);
  return {
    heading: t("Prices in Nablus shops", "الأسعار في متاجر نابلس"),
    forQuantity: (quantity: number) =>
      quantity === 1
        ? t("Price for 1 unit", "سعر القطعة الواحدة")
        : t(`Price for ${quantity} units`, `السعر لعدد ${quantity} قطع`),
    lower: t("Lower local price", "السعر المحلي الأقل"),
    noPrice: t("No price available", "لا يوجد سعر"),
    exactIdentity: t("Exact identity", "الهوية الدقيقة"),
    chooseOption: t("Choose an exact identity", "اختر هوية دقيقة"),
    noExact: t(
      "No exact identities are available for this part yet.",
      "لا توجد هويات دقيقة لهذه القطعة بعد.",
    ),
    incomplete: t(
      "Incomplete identities are not offered for shop prices.",
      "لا تُعرض الهويات غير المكتملة لأسعار المتاجر.",
    ),
    priceObserved: (date: string) => t(`Price checked ${date}`, `تاريخ فحص السعر ${date}`),
    viewShop: t("View on shop site", "عرض في موقع المتجر"),
    viewSupplier: t("View supplier page", "عرض صفحة المورّد"),
    currencyMismatch: t(
      "These shops list different currencies, so the prices are not compared.",
      "يعرض المتجران عملات مختلفة، لذلك لا تُقارن الأسعار.",
    ),
    caution: t(
      "Shop listings do not confirm authenticity or wiring safety. Check the datasheet before wiring.",
      "قوائم المتاجر لا تؤكد أصالة القطعة أو سلامة التوصيل. راجع نشرة البيانات قبل التوصيل.",
    ),
    chooseIdentity: t(
      "Choose an exact identity to see Technolab and PIC Industrial prices.",
      "اختر هوية دقيقة لعرض أسعار تكنولاب وPIC Industrial.",
    ),
    notExact: t(
      "This identity is not specific enough to match shop listings.",
      "هذه الهوية غير محددة بما يكفي لمطابقة منتجات المتاجر.",
    ),
    loading: t("Loading shop prices…", "جارٍ تحميل أسعار المتاجر…"),
    signIn: t(
      "Sign in to LabAssist to see shop prices.",
      "سجّل الدخول إلى LabAssist لعرض أسعار المتاجر.",
    ),
    unconfigured: t(
      "Shop prices are not available in this build.",
      "أسعار المتاجر غير متاحة في هذه النسخة.",
    ),
    failed: t("Shop prices could not be loaded.", "تعذّر تحميل أسعار المتاجر."),
    retry: t("Retry", "إعادة المحاولة"),
    language: t("عربي", "English"),
    languageLabel: t("Show shop prices in Arabic", "عرض أسعار المتاجر بالإنجليزية"),
  };
}
