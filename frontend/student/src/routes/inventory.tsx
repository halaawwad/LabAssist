import { InventoryRequests } from "@/components/InventoryRequests";
import { usePartRequests } from "@/lib/partRequests";
import { MarketOfferList, MarketSellerList } from "@/components/market/MarketLists";
import { MarketPriceComparison } from "@/components/market/MarketPriceComparison";
import { InventoryCatchGame } from "@/components/InventoryCatchGame";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Box,
  CircuitBoard,
  Cpu,
  ExternalLink,
  MapPin,
  Menu,
  Navigation,
  Package,
  Phone,
  Search,
  SlidersHorizontal,
  Store,
  Wrench,
  X,
} from "lucide-react";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  stores,
  storeOffers,
  workshopStock,
  stockStatus,
  storeForOffer,
  type StockItem,
} from "@/lib/workshopInventory";

export const Route = createFileRoute("/inventory")({
  validateSearch: (search: Record<string, unknown>): { tab?: "requests" } =>
    search["tab"] === "requests" ? { tab: "requests" } : {},
  head: () => ({ meta: [{ title: "Workshop Inventory | LabAssist" }] }),
  component: InventoryPage,
});
function InventoryPage() {
  const routeSearch = Route.useSearch();
  const navigate = useNavigate();
  const { requests } = usePartRequests();
  const [stockSource, setStockSource] = useState("All sources");
  const [menu, setMenu] = useState(false),
    [tab, setTab] = useState(routeSearch.tab === "requests" ? "My Requests" : "Find Parts"),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All categories"),
    [status, setStatus] = useState("All statuses"),
    [purpose, setPurpose] = useState("All types"),
    [city, setCity] = useState("All cities"),
    [map, setMap] = useState<string | null>(null),
    [compare, setCompare] = useState(false),
    [request, setRequest] = useState<StockItem | null>(null);
  useEffect(() => {
    if (routeSearch.tab === "requests") setTab("My Requests");
  }, [routeSearch.tab]);
  const filtered = workshopStock.filter(
    (item) =>
      (item.source || "Workshop") !== "Student Resale" &&
      (stockSource === "All sources" || (item.source || "Workshop") === stockSource) &&
      `${item.name} ${item.arabic} ${item.detail}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (category === "All categories" || item.category === category) &&
      (status === "All statuses" || stockStatus(item) === status) &&
      (purpose === "All types" || item.purpose === purpose),
  );
  const selectedStore = stores.find((s) => s.id === map);
  const reset = () => {
    setQuery("");
    setCategory("All categories");
    setStatus("All statuses");
    setPurpose("All types");
    setCity("All cities");
    setStockSource("All sources");
  };
  const openRequest = (item: StockItem) => setRequest(item);
  return (
    <div className="inventory-background min-h-screen">
      <div className="insight-shell">
        <WorkspaceSidebar
          active="Inventory"
          open={menu}
          onClose={() => setMenu(false)}
          onSelect={(label) => {
            if (label === "Dashboard") navigate({ to: "/" });
            else if (label === "My Project") navigate({ to: "/project" });
            else if (label === "Component Catalog") navigate({ to: "/catalog" });
            else if (label === "3D Lab") navigate({ to: "/lab" });
          }}
          className="lg:sticky lg:top-4 lg:h-[calc(100vh-32px)]"
        />
        {menu && (
          <button
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          />
        )}
        <main className="insight-main inventory-main">
          <header className="project-page-heading">
            <div className="flex items-center gap-3">
              <button aria-label="Open menu" className="lg:hidden" onClick={() => setMenu(true)}>
                <Menu />
              </button>
              <div>
                <p className="insight-eyebrow">YOUR WORKSPACE / FIND YOUR NEXT PART</p>
                <h1>Workshop Inventory</h1>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setTab("My Requests")}>
              My Requests{" "}
              <span>
                {requests.filter((item) => !item.sample && item.status !== "Cancelled").length}
              </span>
            </Button>
          </header>
          {tab !== "My Requests" && (
            <section className="inventory-hero">
              <div>
                <span className="inventory-kicker">
                  <Package size={14} /> FROM THE SHELF TO YOUR NEXT BUILD
                </span>
                <h2>
                  Good parts.
                  <br />
                  <em>More possibilities.</em>
                </h2>
                <p>
                  Explore the workshop, discover local stores,
                  <br className="hidden sm:block" /> and find the right fit for your project.
                </p>
                <div className="inventory-hero-counts">
                  <span>
                    <b>{workshopStock.filter((i) => i.quantity > 0).length}</b>Available parts
                  </span>
                  <span>
                    <b>Live</b>Local stores
                  </span>
                  <span>
                    <b>₪</b>Prices in ILS
                  </span>
                </div>
              </div>
              <InventoryCatchGame />
            </section>
          )}
          <div className="inventory-global-search">
            <label className="inventory-search">
              <Search size={17} />
              <input
                aria-label="Search inventory"
                placeholder={
                  tab === "My Requests"
                    ? "Search your requested parts…"
                    : "Search a component across workshop stock and local stores…"
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            {query && (
              <span>
                Searching for <b>{query}</b> · kept across tabs
              </span>
            )}
          </div>
          <div className="inventory-source-bar">
            <div role="tablist" aria-label="Inventory source">
              {["Find Parts", "Workshop Stock", "Local Stores", "My Requests"].map((value, i) => (
                <button
                  role="tab"
                  aria-selected={tab === value}
                  key={value}
                  onClick={() => {
                    setTab(value);
                    setCategory("All categories");
                    setStatus("All statuses");
                    setPurpose("All types");
                  }}
                >
                  {i === 0 ? <Package size={16} /> : <Store size={16} />} {value}
                </button>
              ))}
            </div>
            {tab !== "My Requests" && (
              <button className="inventory-compare" onClick={() => setCompare(true)}>
                Compare prices <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          <section className="inventory-content">
            <InventoryRequests
              part={request}
              onClose={() => setRequest(null)}
              showList={tab === "My Requests"}
              onBrowse={() => setTab("Workshop Stock")}
              onSaved={() => {
                setTab("My Requests");
                setQuery("");
              }}
              query={query}
              onQuery={setQuery}
            />
            {tab !== "My Requests" && (
              <>
                <div className="inventory-section-title">
                  <div>
                    <h2>
                      {tab !== "Local Stores"
                        ? tab === "Find Parts"
                          ? "One part. Every available option."
                          : "On the workshop shelf"
                        : "A little closer to your next component"}
                    </h2>
                    <p>
                      {tab !== "Local Stores"
                        ? tab === "Find Parts"
                          ? "Search a component to see workshop stock and published store offers together."
                          : "New and used components · Student view only"
                        : "Palestinian stores · Published contact details"}
                    </p>
                  </div>
                  <span className="inventory-preview-label">
                    {tab !== "Local Stores"
                      ? "Sample workshop stock · live prices"
                      : "Live LabAssist store data"}
                  </span>
                </div>
                <div className="inventory-toolbar">
                  {tab !== "Local Stores" ? (
                    <>
                      <select
                        aria-label="Category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {["All categories", ...new Set(workshopStock.map((i) => i.category))].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </select>
                      <select
                        aria-label="Stock status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        {["All statuses", "In Stock", "Low Stock", "Out of Stock"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Availability type"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      >
                        {["All types", "For Sale", "For Use"].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  <button className="inventory-reset" onClick={reset}>
                    <SlidersHorizontal size={14} />
                    Reset
                  </button>
                </div>
                {tab !== "Local Stores" ? (
                  <>
                    <div className="inventory-stock-sources" aria-label="Stock source">
                      {["All sources", "Workshop", "Student Resale"].map((source) => (
                        <button
                          key={source}
                          aria-pressed={stockSource === source}
                          onClick={() => setStockSource(source)}
                        >
                          {source}
                          <span>
                            {source === "Student Resale"
                              ? "live"
                              : workshopStock.filter(
                                  (item) => (item.source || "Workshop") === "Workshop",
                                ).length}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="inventory-resale-intro">
                      <span>
                        <Package size={18} />
                      </span>
                      <div>
                        <strong>Give good parts another project.</strong>
                        <p>
                          Components from previous students, listed through the workshop assistant.
                          Check condition and inspection notes before requesting.
                        </p>
                      </div>
                      <small>Live listings</small>
                    </div>
                    <div className="inventory-stock-grid">
                      {filtered.map((item) => (
                        <article
                          className={`inventory-stock-card inv-${item.category === "Sensors" ? "blue" : item.category === "Power Drivers" ? "purple" : item.category === "Motors & Actuators" ? "rose" : "olive"}`}
                          key={item.id}
                        >
                          <div className="inventory-card-top">
                            <span className="inventory-component-icon">
                              {item.category === "Control Boards" ? (
                                <Cpu />
                              ) : item.category === "Tools" ? (
                                <Wrench />
                              ) : (
                                <CircuitBoard />
                              )}
                            </span>
                            <span
                              className={`inventory-stock-status status-${item.quantity === 0 ? "out" : item.quantity <= 3 ? "low" : "in"}`}
                            >
                              {stockStatus(item)}
                            </span>
                          </div>
                          <small className="inventory-category">
                            {item.source || "Workshop"} · {item.category}
                          </small>
                          <h3>{item.name}</h3>
                          <p className="inventory-technical">{item.detail}</p>
                          <div className="inventory-card-tags">
                            <span>{item.condition}</span>
                            <span>{item.purpose}</span>
                            {item.source && (
                              <span className="inventory-resale-badge">Student Resale</span>
                            )}
                          </div>
                          {item.source && (
                            <div
                              className={`inventory-inspection ${item.inspection === "Tested" ? "inspection-tested" : ""}`}
                            >
                              <strong>
                                {item.inspection === "Tested"
                                  ? "Tested · sample inspection"
                                  : "Inspection pending · sample"}
                              </strong>
                              <p>{item.resaleNote}</p>
                            </div>
                          )}
                          <div className="inventory-stock-meta">
                            <div>
                              <b>{item.quantity}</b>
                              <span>Available quantity</span>
                            </div>
                            <div>
                              <MapPin size={13} />
                              <span>{item.location}</span>
                            </div>
                          </div>
                          <footer>
                            <div>
                              {item.price !== undefined ? (
                                <>
                                  <strong>₪{item.price}</strong>
                                  <small> / unit · sample</small>
                                </>
                              ) : (
                                <strong className="inventory-use-label">Workshop use</strong>
                              )}
                            </div>
                            <button disabled={!item.quantity} onClick={() => openRequest(item)}>
                              {item.quantity ? "Request Part" : "Unavailable"}
                              {item.quantity > 0 && <ArrowUpRight size={14} />}
                            </button>
                          </footer>
                        </article>
                      ))}
                    </div>
                    {!filtered.length && stockSource !== "Student Resale" && (
                      <div className="inventory-empty">
                        <Box size={32} />
                        <h3>No matching parts</h3>
                        <button onClick={reset}>Clear filters</button>
                      </div>
                    )}
                    {tab === "Find Parts" && stockSource === "All sources" && (
                      <MarketOfferList
                        sellerKind="SHOP"
                        search={query}
                        title="Published store offers"
                        description="Live prices from LabAssist. Each price shows its currency, source and observation date."
                        label="store offers"
                      />
                    )}
                    {stockSource !== "Workshop" && (
                      <MarketOfferList
                        sellerKind="STUDENT"
                        search={query}
                        title="Student resale"
                        description="Live listings from previous students. Inspection notes are not provided; check the condition before requesting."
                        label="resale listings"
                      />
                    )}
                  </>
                ) : (
                  <>
                    <MarketOfferList
                      sellerKind="SHOP"
                      search={query}
                      title="Store prices"
                      description="Published store prices with their currency, source and observation date."
                      label="store prices"
                    />
                    <MarketSellerList search={query} />
                  </>
                )}
              </>
            )}
          </section>
        </main>
      </div>
      <Dialog open={!!selectedStore} onOpenChange={(open) => !open && setMap(null)}>
        <DialogContent className="inventory-map-dialog">
          <DialogHeader>
            <DialogTitle>{selectedStore?.name}</DialogTitle>
            <DialogDescription>{selectedStore?.address}</DialogDescription>
          </DialogHeader>
          {selectedStore && (
            <>
              <iframe
                title={`${selectedStore.name} address search map`}
                loading="lazy"
                referrerPolicy="no-referrer"
                src={`https://www.google.com/maps?q=${encodeURIComponent(selectedStore.name + " " + selectedStore.address)}&output=embed`}
              />
              <p className="text-xs text-muted-foreground">
                Address search · Confirm the exact entrance with the store.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  className="inventory-link-button"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedStore.name + " " + selectedStore.address)}`}
                >
                  <Navigation size={16} />
                  Get directions
                </a>
                <a className="inventory-link-button" href={`tel:${selectedStore.phone}`}>
                  <Phone size={16} />
                  Call store
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={compare} onOpenChange={setCompare}>
        <DialogContent className="inventory-compare-dialog">
          <DialogHeader>
            <DialogTitle>Compare stores, not just prices</DialogTitle>
            <DialogDescription>
              See the price, variant, availability and city for each source.
            </DialogDescription>
          </DialogHeader>
          <MarketPriceComparison initialSearch={query} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
