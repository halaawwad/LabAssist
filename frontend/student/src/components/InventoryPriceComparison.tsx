import { useState } from "react";
import { MapPin, Phone, ArrowUpRight } from "lucide-react";
import { stores, storeOffers, storeForOffer, workshopStock } from "@/lib/workshopInventory";
export function InventoryPriceComparison({ onMap }: { onMap: (id: string) => void }) {
  const [part, setPart] = useState("esp32"),
    [city, setCity] = useState(""),
    [sort, setSort] = useState("price");
  const offers = storeOffers
    .filter((offer) => offer.id === part)
    .sort((a, b) => {
      if (sort === "city" && city) {
        const diff =
          Number(storeForOffer(b).city === city) - Number(storeForOffer(a).city === city);
        if (diff) return diff;
      }
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
  const priced = offers.filter((offer) => offer.price !== null),
    range =
      priced.length > 1
        ? Math.max(...priced.map((o) => o.price!)) - Math.min(...priced.map((o) => o.price!))
        : 0;
  return (
    <div className="inventory-comparison">
      <div className="inventory-comparison-filters">
        <label>
          Component
          <select value={part} onChange={(e) => setPart(e.target.value)}>
            {workshopStock
              .filter((item) => storeOffers.some((offer) => offer.id === item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Your city
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Choose your city</option>
            {[
              ...new Set(stores.map((s) => s.city)),
              "Ramallah",
              "Hebron",
              "Tulkarm",
              "Qalqilya",
            ].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Show first
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="price">Lowest listed price</option>
            <option value="city">Stores in my city</option>
          </select>
        </label>
      </div>
      {range > 0 && (
        <p className="inventory-price-spread">
          <b>₪{range} price spread</b> across listed variants · Shipping excluded
        </p>
      )}
      <p className="inventory-comparison-note">
        Compare the exact model, condition and included accessories. Out-of-stock prices remain
        visible; they are not available offers. City matching does not measure travel distance.
      </p>
      {offers.map((offer) => {
        const store = storeForOffer(offer);
        const lowest =
          offer.price !== null && offer.price === Math.min(...priced.map((o) => o.price!));
        return (
          <article
            key={offer.offerId}
            className={`inventory-comparison-row ${offer.availability === "Out of Stock" ? "offer-unavailable" : ""}`}
          >
            <header>
              <div>
                <strong>{store.name}</strong>
                <span>
                  <MapPin size={12} />
                  {store.city}
                  {city === store.city && <em>In your city</em>}
                </span>
              </div>
              <div>
                <b>{offer.price === null ? "Ask for price" : `₪${offer.price}`}</b>
                {lowest && priced.length > 1 && (
                  <small>
                    {offer.availability === "Out of Stock"
                      ? "Lowest listing · unavailable"
                      : "Lowest listed · check variant"}
                  </small>
                )}
              </div>
            </header>
            <h3>{offer.name}</h3>
            <p>{offer.note}</p>
            <div className="inventory-comparison-meta">
              <span className={offer.availability === "Out of Stock" ? "is-unavailable" : ""}>
                {offer.availability}
              </span>
              <small>Checked {offer.checked}</small>
            </div>
            <footer>
              <button onClick={() => onMap(store.id)}>
                <MapPin size={12} />
                Map
              </button>
              <a href={`tel:${store.phone}`}>
                <Phone size={12} />
                {offer.price === null ? "Ask for price" : "Call store"}
              </a>
              <a href={offer.url} target="_blank" rel="noopener noreferrer">
                Source <ArrowUpRight size={12} />
              </a>
            </footer>
          </article>
        );
      })}
      <p className="inventory-comparison-note">
        Workshop prices are sample data and are excluded from real-store price rankings.
      </p>
    </div>
  );
}
