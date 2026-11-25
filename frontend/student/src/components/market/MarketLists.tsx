import { ArrowUpRight, MapPin, Phone, Store } from "lucide-react";
import { useMarketClient } from "@/lib/market/session";
import { useDebouncedValue, usePagedResource } from "@/lib/market/useMarketData";
import { MarketOfferCard } from "./MarketOfferCard";
import { LoadMore, MarketEmpty, MarketStatus } from "./MarketStatus";
/** Public offers from the API (ACTIVE, approved price source, in stock), optionally limited to one seller kind. */
export function MarketOfferList({
  sellerKind,
  search,
  title,
  description,
  label,
}: {
  sellerKind?: "SHOP" | "STUDENT";
  search: string;
  title: string;
  description: string;
  label: string;
}) {
  const client = useMarketClient();
  const term = useDebouncedValue(search.trim());
  const offers = usePagedResource(
    `${sellerKind ?? "all"}|${term}`,
    (cursor, signal) =>
      client.offers({ sellerKind, search: term || undefined, limit: 12, cursor }, signal),
    client,
  );
  return (
    <section className="inventory-market-section" aria-label={title}>
      <h3 className="inventory-directory-title">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      {offers.status === "ready" ? (
        offers.items.length ? (
          <>
            <div className="inventory-stock-grid">
              {offers.items.map((offer) => (
                <MarketOfferCard key={offer.id} offer={offer} />
              ))}
            </div>
            <LoadMore {...offers} onMore={offers.loadMore} label={label} />
          </>
        ) : (
          <MarketEmpty
            title={`No ${label} found`}
            hint={term ? "Try another search." : "Nothing is published right now."}
          />
        )
      ) : (
        <MarketStatus
          status={offers.status}
          message={offers.message}
          onRetry={offers.retry}
          label={label}
        />
      )}
    </section>
  );
}
/** Store directory from the API. Addresses and notes are not part of the API, so they are shown as unknown. */
export function MarketSellerList({ search }: { search: string }) {
  const client = useMarketClient();
  const sellers = usePagedResource(
    "SHOP",
    (cursor, signal) => client.sellers({ kind: "SHOP", limit: 24, cursor }, signal),
    client,
  );
  const term = search.trim().toLowerCase();
  const shown = sellers.items.filter((seller) =>
    `${seller.name} ${seller.city}`.toLowerCase().includes(term),
  );
  return (
    <section aria-label="Store directory">
      <h3 className="inventory-directory-title">Store directory</h3>
      {sellers.status === "ready" ? (
        <>
          {term && sellers.nextCursor && (
            <p className="mb-2 text-xs text-muted-foreground">
              Search applies to the stores loaded so far.
            </p>
          )}
          {shown.length ? (
            <div className="inventory-store-grid">
              {shown.map((seller) => (
                <article className="inventory-store-card inv-blue" key={seller.id}>
                  <header>
                    <span className="inventory-component-icon">
                      <Store />
                    </span>
                    <div>
                      <h4>{seller.name}</h4>
                      <small>
                        {seller.city}
                        {seller.isDemo ? " · Demo listing" : ""}
                      </small>
                    </div>
                  </header>
                  <p className="inventory-offer-location">
                    <MapPin size={13} />
                    Address not published
                    {seller.latitude !== null && seller.longitude !== null
                      ? " · map location on file"
                      : ""}
                  </p>
                  <div className="inventory-offer-contact">
                    {seller.phone ? (
                      <a href={`tel:${seller.phone}`}>
                        <Phone size={13} />
                        Call store
                      </a>
                    ) : (
                      <span>Phone not published</span>
                    )}
                    {seller.website && (
                      <a href={seller.website} target="_blank" rel="noopener noreferrer">
                        <ArrowUpRight size={13} />
                        Store website
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <MarketEmpty title="No stores match" hint="Try another name or city." />
          )}
          <LoadMore {...sellers} onMore={sellers.loadMore} label="stores" />
        </>
      ) : (
        <MarketStatus
          status={sellers.status}
          message={sellers.message}
          onRetry={sellers.retry}
          label="stores"
        />
      )}
    </section>
  );
}
