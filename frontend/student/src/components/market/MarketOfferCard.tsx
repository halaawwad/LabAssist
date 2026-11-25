import { ArrowUpRight, MapPin, Package, Phone, Store } from "lucide-react";
import type { PublicOffer } from "@/lib/market/client";
import { formatDate, formatMoney } from "@/lib/market/format";
/** One public offer: price with currency, the source of that price and its own observation date. */
export function MarketOfferCard({ offer }: { offer: PublicOffer }) {
  const observed = formatDate(offer.priceObservedAt);
  const student = offer.seller.kind === "STUDENT";
  return (
    <article
      className={`inventory-stock-card ${student ? "inv-green" : "inv-blue"} inventory-offer-card`}
    >
      <div className="inventory-card-top">
        <span className="inventory-component-icon">{student ? <Package /> : <Store />}</span>
        <span className="inventory-store-offer-label">{offer.quantity} available</span>
      </div>
      <small className="inventory-category">
        {offer.seller.name} · {offer.seller.city}
        {offer.seller.isDemo ? " · Demo listing" : ""}
      </small>
      <h3>{offer.partName}</h3>
      {offer.variant && <p className="inventory-technical">{offer.variant}</p>}
      <div className="inventory-card-tags">
        <span>{student ? "Student resale" : "Store offer"}</span>
        <span>Condition: {offer.condition === "NEW" ? "new" : "used"}</span>
        {offer.identity.exact && <span>Exact identity</span>}
      </div>
      <div className="inventory-offer-location">
        <MapPin size={13} />
        Address not published
      </div>
      <p className="inventory-offer-date">
        {observed ? `Price observed ${observed}` : "Price observation date unknown (legacy price)"}
      </p>
      <footer>
        <div>
          <strong>{formatMoney(offer.unitPrice, offer.currency)}</strong>
          <small> / unit</small>
          <small className="block">
            {offer.shippingCost
              ? `+ ${formatMoney(offer.shippingCost, offer.currency)} shipping`
              : "Shipping cost unknown"}
          </small>
        </div>
        {offer.source.url && (
          <a
            href={offer.source.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Evidence for this price, not a product page"
          >
            Price evidence <ArrowUpRight size={14} />
          </a>
        )}
      </footer>
      {(offer.seller.phone || offer.seller.website) && (
        <div className="inventory-offer-contact">
          {offer.seller.phone && (
            <a href={`tel:${offer.seller.phone}`}>
              <Phone size={13} />
              Call {student ? "seller" : "store"}
            </a>
          )}
          {offer.seller.website && (
            <a href={offer.seller.website} target="_blank" rel="noopener noreferrer">
              <ArrowUpRight size={13} />
              {student ? "Seller" : "Store"} website
            </a>
          )}
        </div>
      )}
    </article>
  );
}
