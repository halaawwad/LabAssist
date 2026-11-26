import { useEffect, useId, useState } from "react";
import { ArrowUpRight, Globe2, Languages, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Variant } from "@/lib/market/client";
import { useMarketClient } from "@/lib/market/session";
import { useMarketResource, usePagedResource } from "@/lib/market/useMarketData";
import {
  currencyMismatch,
  globalCard,
  shopCards,
  shopPriceCopy,
  type PriceLanguage,
  type ShopCardModel,
  type Tone,
} from "@/lib/market/shopPrices";
import { LoadMore, MarketStatus } from "./MarketStatus";

const toneClass: Record<Tone, string> = {
  good: "border-success/40 bg-success/10 text-success",
  warn: "border-warning/50 bg-warning/10 text-foreground",
  muted: "border-border bg-muted text-muted-foreground",
  neutral: "border-border bg-background/60 text-foreground",
};
function Badge({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}
function useInitialLanguage(): [PriceLanguage, (lang: PriceLanguage) => void] {
  const [lang, setLang] = useState<PriceLanguage>("en");
  useEffect(() => {
    if (document.documentElement.lang?.toLowerCase().startsWith("ar")) setLang("ar");
  }, []);
  return [lang, setLang];
}
function ShopCard({ card, lang }: { card: ShopCardModel; lang: PriceLanguage }) {
  const copy = shopPriceCopy(lang);
  return (
    <article
      aria-label={card.name}
      data-shop={card.shop}
      className={`glass-inset min-w-0 rounded-xl p-3 text-xs ${card.lower ? "ring-1 ring-success/50" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h4 className="text-sm font-bold">
          <bdi>{card.name}</bdi>
        </h4>
        <div className="flex flex-wrap gap-1">
          {card.lower && <Badge tone="good">{copy.lower}</Badge>}
          {card.badge && <Badge tone={card.badge.tone}>{card.badge.text}</Badge>}
        </div>
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums" data-testid="shop-price">
        {card.hasPrice ? (
          <bdi dir="ltr">{card.priceText}</bdi>
        ) : (
          <>
            <span aria-hidden="true">{card.priceText}</span>
            <span className="sr-only">{copy.noPrice}</span>
          </>
        )}
      </p>
      {card.availability && (
        <p className="mt-1">
          <Badge tone="neutral">{card.availability}</Badge>
        </p>
      )}
      {card.note && <p className="mt-2 leading-5 text-muted-foreground">{card.note}</p>}
      <p className="mt-2 text-[11px] text-muted-foreground">
        {card.priceDate && <span className="block">{copy.priceObserved(card.priceDate)}</span>}
        {card.stockCheck && <span className="block">{card.stockCheck}</span>}
        <span className="block">{card.lastCheck}</span>
      </p>
      {card.sourceUrl && (
        <a
          className="mt-2 inline-flex min-h-6 items-center gap-1 font-semibold underline-offset-2 hover:underline"
          href={card.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.viewShop} <ArrowUpRight size={11} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

/** Technolab and PIC Industrial prices for one exact catalog variant, with an eligible global reference. */
export function ShopPriceCards({
  variantId,
  quantity = 1,
}: {
  variantId: string;
  quantity?: number;
}) {
  const client = useMarketClient();
  const [lang, setLang] = useInitialLanguage();
  const headingId = useId();
  const copy = shopPriceCopy(lang);
  const prices = useMarketResource(
    `shop-prices|${variantId}|${quantity}`,
    (signal) => client.shopPrices({ variantId, quantity }, signal),
    client,
  );
  const data = prices.status === "ready" ? prices.data : null;
  const cards = data ? shopCards(data, lang) : [];
  const global = data ? globalCard(data, lang) : null;
  return (
    <section
      aria-labelledby={headingId}
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
      className="shop-prices space-y-2"
      data-testid="shop-prices"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id={headingId} className="text-sm font-bold">
            {copy.heading}
          </h3>
          <p className="text-[11px] text-muted-foreground">{copy.forQuantity(quantity)}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={copy.languageLabel}
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        >
          <Languages size={14} aria-hidden="true" /> {copy.language}
        </Button>
      </div>
      {prices.status === "loading" && (
        <div className="glass-inset rounded-xl p-3 text-xs" role="status" aria-busy="true">
          <Loader2 size={14} className="inline animate-spin text-primary" aria-hidden="true" />{" "}
          {copy.loading}
        </div>
      )}
      {(prices.status === "session" || prices.status === "unconfigured") && (
        <p className="glass-inset rounded-xl p-3 text-xs" role="status">
          {prices.status === "session" ? copy.signIn : copy.unconfigured}
        </p>
      )}
      {prices.status === "error" && (
        <div className="glass-inset rounded-xl p-3 text-xs" role="alert">
          <p className="font-semibold">{copy.failed}</p>
          {prices.message && <p className="mt-1 text-muted-foreground">{prices.message}</p>}
          <Button className="mt-2" size="sm" variant="secondary" onClick={prices.retry}>
            <RotateCcw size={13} aria-hidden="true" /> {copy.retry}
          </Button>
        </div>
      )}
      {data && (
        <div aria-live="polite" className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {cards.map((card) => (
              <ShopCard key={card.shop} card={card} lang={lang} />
            ))}
          </div>
          {currencyMismatch(data.localShops) && (
            <p className="text-[11px] text-muted-foreground">{copy.currencyMismatch}</p>
          )}
          {global && global.kind !== "hidden" && (
            <article
              aria-label={global.title}
              data-testid="global-reference"
              className="rounded-xl border border-dashed border-border p-3 text-xs"
            >
              <h4 className="flex items-center gap-1.5 text-xs font-bold">
                <Globe2 size={14} aria-hidden="true" /> {global.title}
              </h4>
              {global.kind === "unavailable" ? (
                <p className="mt-1 text-muted-foreground">{global.note}</p>
              ) : (
                <>
                  <p className="mt-1">
                    <bdi>{global.supplier}</bdi>
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    <bdi dir="ltr">{global.priceText}</bdi>
                  </p>
                  {global.quantity && <p>{global.quantity}</p>}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {global.observed} · {global.shipping} · {global.tax}
                  </p>
                  <a
                    className="mt-1 inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
                    href={global.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.viewSupplier} <ArrowUpRight size={11} aria-hidden="true" />
                  </a>
                </>
              )}
            </article>
          )}
          <p className="text-[11px] text-muted-foreground">{copy.caution}</p>
        </div>
      )}
    </section>
  );
}

const identity = (v: Variant) =>
  [v.manufacturer, v.modelNumber, v.packageOrRevision].map((value) => value ?? "—").join(" · ");
/** Catalog details: explicit exact-identity choice (paged), then the shop price cards. */
export function ExactShopPrices({ partKey }: { partKey: string }) {
  const client = useMarketClient();
  const [variantId, setVariantId] = useState("");
  const copy = shopPriceCopy("en"),
    ar = shopPriceCopy("ar");
  const variants = usePagedResource(
    `shop-variants|${partKey}`,
    (cursor, signal) => client.variants(partKey, { limit: 50, cursor }, signal),
    client,
  );
  const exact = variants.items.filter((variant) => variant.exact);
  return (
    <section aria-label="Shop prices · أسعار المتاجر" className="space-y-2">
      {variants.status === "ready" ? (
        <>
          {exact.length ? (
            <label className="block text-xs font-semibold">
              {copy.exactIdentity} · <span lang="ar">{ar.exactIdentity}</span>
              <select
                className="glass-inset mt-1 w-full rounded-lg px-2 py-2"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
              >
                <option value="">
                  {copy.chooseOption} · {ar.chooseOption}
                </option>
                {exact.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {identity(variant)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            !variants.nextCursor && (
              <p className="glass-inset rounded-xl p-3 text-xs">
                {copy.noExact}{" "}
                <span lang="ar" dir="rtl">
                  {ar.noExact}
                </span>
              </p>
            )
          )}
          {variants.items.some((variant) => !variant.exact) && (
            <p className="text-[11px] text-muted-foreground">{copy.incomplete}</p>
          )}
          <LoadMore {...variants} onMore={variants.loadMore} label="part identities" />
          {variantId ? (
            <ShopPriceCards variantId={variantId} />
          ) : (
            exact.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {copy.chooseIdentity}{" "}
                <span lang="ar" dir="rtl">
                  {ar.chooseIdentity}
                </span>
              </p>
            )
          )}
        </>
      ) : (
        <MarketStatus
          compact
          status={variants.status}
          message={variants.message}
          onRetry={variants.retry}
          label="part identities"
        />
      )}
    </section>
  );
}
