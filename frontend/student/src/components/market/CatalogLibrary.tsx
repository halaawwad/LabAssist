import { useEffect, useRef, useState } from "react";
import { Box, Check, CircuitBoard, Cpu, Filter, Package, Search, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalogCategories, type BomEntry, type CatalogComponent } from "@/lib/componentCatalog";
import { localPartForKey } from "@/lib/market/partKeys";
import { useMarketClient } from "@/lib/market/session";
import { useDebouncedValue, usePagedResource } from "@/lib/market/useMarketData";
import { LocalWiringSheet } from "./LocalWiringSheet";
import { LoadMore, MarketStatus } from "./MarketStatus";
/** Component library backed by the LabAssist catalog API; local 3D models attach only by exact catalog key. */
export function CatalogLibrary({
  previews,
  bom,
  onDetails,
  onShowOnBench,
  onAdd,
  onLab,
}: {
  previews: Record<string, string>;
  bom: BomEntry[];
  onDetails: (key: string) => void;
  onShowOnBench: (item: CatalogComponent) => void;
  onAdd: (item: CatalogComponent) => void;
  onLab: (item: CatalogComponent) => void;
}) {
  const client = useMarketClient();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All"),
    [voltage, setVoltage] = useState("All");
  const search = useDebouncedValue(query.trim());
  const categories = usePagedResource(
    "categories",
    (cursor, signal) => client.categories({ limit: 100, cursor }, signal),
    client,
  );
  const parts = usePagedResource(
    `${search}|${category}`,
    (cursor, signal) =>
      client.parts(
        {
          search: search || undefined,
          category: category === "All" ? undefined : category,
          limit: 24,
          cursor,
        },
        signal,
      ),
    client,
  );
  const tone = new Map(categories.items.map((c, index) => [c.id, index]));
  const categoryName = (id: string) => categories.items.find((c) => c.id === id)?.nameEn ?? id;
  // The API has no voltage filter, so it applies to the parts loaded so far (stated in the UI).
  const shown = parts.items.filter(
    (p) => voltage === "All" || p.typicalSupplyVoltage === Number(voltage),
  );
  const clear = () => {
    setQuery("");
    setCategory("All");
    setVoltage("All");
  };
  const cardsRef = useRef<HTMLDivElement>(null);
  const resultKey = shown.map((p) => p.key).join("|");
  useEffect(() => {
    const grid = cardsRef.current;
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".catalog-library-card"));
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    if (
      !window.IntersectionObserver ||
      media.matches ||
      document.documentElement.dataset["workspaceMotion"] === "off"
    ) {
      cards.forEach((card) => card.classList.add("bubble-arrived"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("bubble-waiting");
            entry.target.classList.add("bubble-arrived");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.06, rootMargin: "0px 0px -18px 0px" },
    );
    cards.forEach((card, index) => {
      if (card.classList.contains("bubble-arrived")) return;
      card.style.setProperty("--bubble-delay", `${(index % 3) * 75}ms`);
      card.style.setProperty("--bubble-lean", `${index % 2 ? 1.5 : -1.5}deg`);
      card.classList.add("bubble-waiting");
      observer.observe(card);
    });
    return () => observer.disconnect();
  }, [resultKey]);
  const loadedLabel = `${shown.length}${parts.nextCursor ? "+" : ""}`;
  return (
    <section id="catalog-library" className="catalog-flow-library" aria-label="Component library">
      <div className="catalog-library-search">
        <Search size={18} />
        <input
          aria-label="Search components"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a part · English / عربي"
        />
        {query && (
          <button aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={16} />
          </button>
        )}
        {parts.status === "ready" && <span>{loadedLabel} components</span>}
      </div>
      <div className="grid gap-4 xl:grid-cols-[190px_1fr]">
        <aside className="glass-panel catalog-filter-panel h-fit rounded-[18px] p-4 xl:sticky xl:top-4">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-bold">
            <Filter size={15} />
            Filter Components
          </h2>
          <div className="catalog-category-filters" role="group" aria-label="Component categories">
            <button
              className="catalog-category-choice"
              aria-pressed={category === "All"}
              onClick={() => setCategory("All")}
            >
              <span className="catalog-category-dot" />
              All categories
            </button>
            {categories.status === "ready" ? (
              categories.items.map((c, index) => (
                <button
                  key={c.id}
                  data-category-tone={index}
                  className="catalog-category-choice"
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  <span className="catalog-category-dot" />
                  <span>
                    {c.nameEn} <span dir="rtl">· {c.nameAr}</span>
                  </span>
                </button>
              ))
            ) : (
              <MarketStatus
                compact
                status={categories.status}
                message={categories.message}
                onRetry={categories.retry}
                label="categories"
              />
            )}
          </div>
          {categories.status === "ready" && (
            <LoadMore {...categories} onMore={categories.loadMore} label="categories" />
          )}
          <p className="mb-2 mt-5 text-[11px] font-semibold">Typical supply voltage</p>
          <div className="flex flex-wrap gap-1.5">
            {["All", "3.3", "5", "12"].map((value) => (
              <button
                key={value}
                aria-pressed={voltage === value}
                onClick={() => setVoltage(value)}
                className={`catalog-filter rounded-lg px-2.5 py-2 text-xs ${voltage === value ? "catalog-filter-active" : ""}`}
              >
                {value === "All" ? "All" : `${value}V`}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-4 w-full text-xs" onClick={clear}>
            Clear Filters
          </Button>
          <p className="mt-4 border-t border-border/50 pt-3 text-[10px] leading-5 text-muted-foreground">
            Supply voltage depends on the board variant. Check pin voltage before wiring; supply and
            logic voltage can differ. The voltage filter applies to the parts loaded so far.
          </p>
        </aside>
        <div id="catalog-results" className="catalog-results">
          <div className="mb-3 flex items-center justify-between text-xs">
            <p>
              <strong>{parts.status === "ready" ? loadedLabel : "–"}</strong>
              <span className="text-muted-foreground"> components loaded</span>
            </p>
            <span className="text-[10px] text-primary">LabAssist catalog</span>
          </div>
          {parts.status !== "ready" ? (
            <MarketStatus
              status={parts.status}
              message={parts.message}
              onRetry={parts.retry}
              label="catalog"
            />
          ) : (
            <>
              <div
                ref={cardsRef}
                className="catalog-library-grid catalog-bubble-grid grid gap-4 sm:grid-cols-2 2xl:grid-cols-3"
              >
                {shown.map((part) => {
                  const local = localPartForKey(part.key);
                  return (
                    <article
                      key={part.key}
                      data-category-tone={
                        local
                          ? catalogCategories.indexOf(local.category)
                          : tone.get(part.categoryId)
                      }
                      className="glass-panel catalog-card catalog-library-card flex min-w-0 flex-col rounded-[22px] p-4"
                    >
                      {local ? (
                        <button
                          aria-label={`Show ${part.nameEn} on workbench`}
                          onClick={() => onShowOnBench(local)}
                          className="catalog-image flex h-44 items-center justify-center rounded-2xl"
                        >
                          {previews[local.model] ? (
                            <img
                              src={previews[local.model]}
                              alt={part.nameEn}
                              loading="lazy"
                              className="h-36 w-full object-contain"
                            />
                          ) : (
                            <Cpu size={42} className="text-primary" />
                          )}
                          <span className="catalog-preview-label">Bring to workbench ↗</span>
                        </button>
                      ) : (
                        <div className="catalog-image flex h-44 flex-col items-center justify-center rounded-2xl">
                          <Cpu size={42} className="text-primary" />
                          <span className="mt-2 text-[10px] text-muted-foreground">
                            No local 3D model for this key
                          </span>
                        </div>
                      )}
                      <div className="catalog-card-info mt-3 flex-1">
                        <span className="catalog-category">{categoryName(part.categoryId)}</span>
                        <h2 className="mt-2 text-left text-sm font-bold leading-6">
                          {part.nameEn}
                        </h2>
                        <p dir="rtl" className="text-xs">
                          {part.nameAr}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                          {part.key}
                        </p>
                        <div className="catalog-tech-chips">
                          <span>
                            <Zap size={12} />
                            {part.typicalSupplyVoltage !== null
                              ? `${part.typicalSupplyVoltage}V supply`
                              : "Supply voltage unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="catalog-card-footer">
                        {local && (
                          <button className="catalog-to-bench" onClick={() => onShowOnBench(local)}>
                            <CircuitBoard size={13} />
                            Show on workbench <span aria-hidden="true">↗</span>
                          </button>
                        )}
                        <button
                          onClick={() => onDetails(part.key)}
                          className="catalog-specifications"
                        >
                          View specifications <span aria-hidden="true">→</span>
                        </button>
                        {local ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="px-1.5 text-[10px]"
                              onClick={() => onAdd(local)}
                            >
                              {bom.some((entry) => entry.key === local.key) ? (
                                <Check size={13} />
                              ) : (
                                <Package size={13} />
                              )}
                              Add to BOM
                            </Button>
                            <Button
                              size="sm"
                              className="px-1.5 text-[10px]"
                              onClick={() => onLab(local)}
                            >
                              <Box size={13} />
                              Add to 3D Lab
                            </Button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground">
                            BOM and 3D Lab need a local model with this exact key.
                          </p>
                        )}
                      </div>
                      <LocalWiringSheet partKey={part.key} />
                    </article>
                  );
                })}
              </div>
              {!shown.length && (
                <div className="glass-panel rounded-2xl p-10 text-center">
                  <Search className="mx-auto text-primary" />
                  <h2 className="mt-3 text-sm font-bold">No matching components</h2>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {parts.nextCursor
                      ? "None in the loaded results; load more or clear the filters."
                      : "Try another name or clear the filters."}
                  </p>
                  <Button className="mt-4" variant="secondary" onClick={clear}>
                    Clear Filters
                  </Button>
                </div>
              )}
              <LoadMore {...parts} onMore={parts.loadMore} label="components" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
