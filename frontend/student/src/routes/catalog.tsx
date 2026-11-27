import { useProjectWorkspace } from "@/lib/projectWorkspace";
import { CatalogCategoryShowcase } from "@/components/CatalogCategoryShowcase";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Package, X } from "lucide-react";
import { CatalogLibrary } from "@/components/market/CatalogLibrary";
import { CatalogPartDialog } from "@/components/market/CatalogPartDialog";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { usePartPreviews } from "@/lib/lab/usePartPreviews";
import { addToBom, readBom, type CatalogComponent, type BomEntry } from "@/lib/componentCatalog";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Component Catalog | LabAssist" }] }),
  component: CatalogPage,
});
function CatalogPage() {
  const navigate = useNavigate();
  const previews = usePartPreviews();
  const workspace = useProjectWorkspace();
  const [menu, setMenu] = useState(false),
    [category, setCategory] = useState("All");

  const [spotlightKey, setSpotlightKey] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const browseLibrary = () => {
    setLibraryOpen(true);
    requestAnimationFrame(() =>
      document.getElementById("catalog-library-toggle")?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      }),
    );
  };
  const showOnBench = (item: CatalogComponent) => {
    setCategory(item.category);
    setSpotlightKey(item.key);
    requestAnimationFrame(() => {
      const bench = document.getElementById("catalog-workbench");
      bench?.focus({ preventScroll: true });
      bench?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
  };
  // Details are keyed by API catalog key; the workbench passes local parts, matched by exact key only.
  const [selectedKey, setSelectedKey] = useState<string | null>(null),
    [bom, setBom] = useState<BomEntry[]>([]),
    [notice, setNotice] = useState("");
  useEffect(() => setBom(readBom()), []);
  const add = async (item: CatalogComponent) => {
    if (workspace.live) {
      if (!workspace.finance.data?.budget) {
        setNotice("Set your project budget in My Project → Components before adding parts.");
        return;
      }
      const ok = await workspace.finance.save("bom", "POST", {
        name: item.name,
        quantityRequired: 1,
        estimatedUnitPrice: null,
        notes: "Catalog component: " + item.key,
      });
      setNotice(
        ok
          ? `${item.name} added to the shared project BOM`
          : "Could not add the part. Retry after checking project finances.",
      );
      return;
    }
    try {
      setBom(addToBom(item.key));
      setNotice(`${item.name} added to BOM`);
    } catch {
      setNotice("Could not save BOM in this browser. Please enable local storage.");
    }
  };
  const openLab = (item: CatalogComponent) =>
    navigate({ to: "/lab", search: { add: item.model, request: Date.now().toString() } });
  return (
    <div className="dashboard-background catalog-background min-h-screen">
      <div className="mx-auto flex max-w-[1800px] gap-4 p-3 lg:p-4">
        {menu && (
          <button
            onClick={() => setMenu(false)}
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          />
        )}
        <WorkspaceSidebar
          active="Component Catalog"
          open={menu}
          onClose={() => setMenu(false)}
          onSelect={(label) => {
            if (label === "Dashboard") navigate({ to: "/" });
            else if (label === "3D Lab") navigate({ to: "/lab" });
            else if (label !== "Component Catalog") navigate({ to: "/project" });
          }}
          className="lg:sticky lg:top-4 lg:h-[calc(100vh-32px)]"
        />
        <main
          className={`catalog-page-main min-w-0 flex-1 space-y-4 pb-6 ${libraryOpen ? "catalog-library-open" : ""}`}
        >
          <div id="catalog-workbench" tabIndex={-1} className="catalog-bench-anchor">
            <h1 className="sr-only">Component Catalog</h1>
            <CatalogCategoryShowcase
              category={category}
              onCategory={setCategory}
              previews={previews}
              onDetails={(item: CatalogComponent) => setSelectedKey(item.key)}
              onAdd={add}
              onLab={openLab}
              spotlightKey={spotlightKey}
              onSpotlight={showOnBench}
              onBrowse={browseLibrary}
              actions={
                <>
                  <button
                    onClick={() => setMenu(true)}
                    aria-label="Open menu"
                    className="catalog-workbench-menu lg:hidden"
                  >
                    <Menu size={16} />
                  </button>
                  <Link to="/project" search={{ action: "bom" }}>
                    <Package size={13} />
                    View BOM <b>{bom.reduce((sum, item) => sum + item.quantity, 0)}</b>
                  </Link>
                </>
              }
            />
          </div>
          {notice && (
            <div
              role="status"
              className="catalog-notice mb-3 flex items-center justify-between gap-3 rounded-xl p-3 text-xs"
            >
              <span>{notice}</span>
              <button aria-label="Dismiss message" onClick={() => setNotice("")}>
                <X size={14} />
              </button>
            </div>
          )}
          <button
            id="catalog-library-toggle"
            className="catalog-library-toggle"
            aria-expanded={libraryOpen}
            aria-controls="catalog-library"
            onClick={() => setLibraryOpen((open) => !open)}
          >
            <span className="catalog-library-toggle-icon">
              <Package size={20} />
            </span>
            <span>
              <strong>{libraryOpen ? "Hide component library" : "Browse all components"}</strong>
              <small>
                {libraryOpen
                  ? "Close the library and return to your workbench"
                  : "Open the live LabAssist catalog"}
              </small>
            </span>
            <ChevronDown size={19} />
          </button>
          {libraryOpen && (
            <CatalogLibrary
              previews={previews}
              bom={bom}
              onDetails={setSelectedKey}
              onShowOnBench={showOnBench}
              onAdd={add}
              onLab={openLab}
            />
          )}
        </main>
        <CatalogPartDialog
          partKey={selectedKey}
          onClose={() => setSelectedKey(null)}
          onAdd={add}
          onLab={openLab}
        />
      </div>
    </div>
  );
}
