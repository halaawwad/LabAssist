import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Variant } from "@/lib/market/client";
import { useMarketClient } from "@/lib/market/session";
import { useDebouncedValue, usePagedResource } from "@/lib/market/useMarketData";
import { formatDate, formatMoney } from "@/lib/market/format";
import { LoadMore, MarketEmpty, MarketStatus } from "./MarketStatus";
const CURRENCIES = ["ILS", "USD", "JOD", "EUR"];
const identityLabel = (v: Variant) =>
  `${v.manufacturer ?? "Unknown manufacturer"} · ${v.modelNumber ?? "unknown model"} · ${v.packageOrRevision ?? "unknown package/revision"}${v.exact ? "" : " (not specific enough for exact matching)"}`;
/** Compares published prices for one catalog part, or exactly for one catalog variant. */
export function MarketPriceComparison({ initialSearch = "" }: { initialSearch?: string }) {
  const client = useMarketClient();
  const [search, setSearch] = useState(initialSearch),
    [partKey, setPartKey] = useState<string | null>(null),
    [currency, setCurrency] = useState("ILS"),
    [condition, setCondition] = useState(""),
    [variantId, setVariantId] = useState("");
  const term = useDebouncedValue(search.trim());
  const parts = usePagedResource(
    `parts|${term}`,
    (cursor, signal) => client.parts({ search: term || undefined, limit: 8, cursor }, signal),
    client,
  );
  const variants = usePagedResource(
    `variants|${partKey}`,
    partKey ? (cursor, signal) => client.variants(partKey, { limit: 50, cursor }, signal) : null,
    client,
  );
  const offers = usePagedResource(
    `compare|${partKey}|${variantId}|${currency}|${condition}`,
    partKey
      ? (cursor, signal) =>
          variantId
            ? client.compareExact(
                { variantId, currency, condition: condition || undefined, limit: 20, cursor },
                signal,
              )
            : client.compare(
                {
                  catalogKey: partKey,
                  currency,
                  condition: condition || undefined,
                  limit: 20,
                  cursor,
                },
                signal,
              )
      : null,
    client,
  );
  const choosePart = (key: string) => {
    setPartKey(key);
    setVariantId("");
  };
  return (
    <div className="inventory-compare-live space-y-3">
      <label className="block text-xs font-semibold">
        Catalog part
        <input
          className="glass-inset mt-1 w-full rounded-lg px-3 py-2 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the catalog · English / عربي"
        />
      </label>
      {parts.status === "ready" ? (
        parts.items.length ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a catalog part">
            {parts.items.map((part) => (
              <button
                key={part.key}
                aria-pressed={partKey === part.key}
                className={`catalog-filter rounded-lg px-2.5 py-1.5 text-xs ${partKey === part.key ? "catalog-filter-active" : ""}`}
                onClick={() => choosePart(part.key)}
              >
                {part.nameEn} <span dir="rtl">· {part.nameAr}</span>
              </button>
            ))}
          </div>
        ) : (
          <MarketEmpty title="No catalog parts match" hint="Try another name." />
        )
      ) : (
        <MarketStatus
          compact
          status={parts.status}
          message={parts.message}
          onRetry={parts.retry}
          label="catalog parts"
        />
      )}
      {parts.status === "ready" && (
        <LoadMore {...parts} onMore={parts.loadMore} label="catalog parts" />
      )}
      {partKey && (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Currency
              <select
                className="glass-inset mt-1 w-full rounded-lg px-2 py-2"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Condition
              <select
                className="glass-inset mt-1 w-full rounded-lg px-2 py-2"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option value="">Any condition</option>
                <option value="NEW">New</option>
                <option value="USED">Used</option>
              </select>
            </label>
            <label className="text-xs font-semibold">
              Exact identity
              <select
                className="glass-inset mt-1 w-full rounded-lg px-2 py-2"
                value={variantId}
                disabled={variants.status !== "ready"}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">Any identity (not an exact match)</option>
                {variants.items.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {identityLabel(variant)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {variants.status !== "ready" && variants.status !== "idle" && (
            <MarketStatus
              compact
              status={variants.status}
              message={variants.message}
              onRetry={variants.retry}
              label="part identities"
            />
          )}
          {variants.status === "ready" && (
            <LoadMore {...variants} onMore={variants.loadMore} label="variants" />
          )}
          <p className="text-[11px] text-muted-foreground">
            {variantId
              ? "Only offers linked to this exact catalog identity are compared."
              : "All published offers for this catalog part. Identity is not confirmed as exact unless an offer says so."}{" "}
            Prices in other currencies are never mixed in.
          </p>
          {offers.status === "ready" ? (
            offers.items.length ? (
              <ol className="space-y-2">
                {offers.items.map((offer) => {
                  const observed = formatDate(offer.priceObservedAt);
                  return (
                    <li key={offer.id} className="glass-inset rounded-xl p-3 text-xs">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <strong className="text-sm">
                          {formatMoney(offer.unitPrice, offer.currency)}
                        </strong>
                        <span>
                          {offer.seller.name} · {offer.seller.city} ·{" "}
                          {offer.seller.kind === "STUDENT" ? "Student resale" : "Store"}
                        </span>
                      </div>
                      <p className="mt-1">
                        {offer.partName}
                        {offer.variant ? ` · ${offer.variant}` : ""} ·{" "}
                        {offer.condition === "NEW" ? "new" : "used"} · {offer.quantity} available ·{" "}
                        {offer.shippingCost
                          ? `+ ${formatMoney(offer.shippingCost, offer.currency)} shipping`
                          : "shipping unknown"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {observed
                          ? `Price observed ${observed}`
                          : "Price observation date unknown (legacy price)"}{" "}
                        · {offer.identity.exact ? "Exact identity" : "Identity not confirmed exact"}
                        {offer.source.url && (
                          <>
                            {" · "}
                            <a href={offer.source.url} target="_blank" rel="noopener noreferrer">
                              Price evidence <ArrowUpRight size={11} className="inline" />
                            </a>
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <MarketEmpty
                title="No published offers"
                hint={`Nothing is published in ${currency} for this selection.`}
              />
            )
          ) : (
            <MarketStatus
              status={offers.status}
              message={offers.message}
              onRetry={offers.retry}
              label="price comparison"
            />
          )}
          {offers.status === "ready" && (
            <LoadMore {...offers} onMore={offers.loadMore} label="offers" />
          )}
        </>
      )}
    </div>
  );
}
