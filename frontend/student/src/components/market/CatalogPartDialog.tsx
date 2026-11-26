import { ArrowUpRight, Box, Package } from "lucide-react";
import { ComponentPreview } from "@/components/ComponentPreview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { catalogCategories, type CatalogComponent } from "@/lib/componentCatalog";
import { localPartForKey } from "@/lib/market/partKeys";
import { LocalWiringSheet } from "./LocalWiringSheet";
import { useMarketClient } from "@/lib/market/session";
import { useMarketResource, usePagedResource } from "@/lib/market/useMarketData";
import { formatDate, pinValue } from "@/lib/market/format";
import { LoadMore, MarketEmpty, MarketStatus } from "./MarketStatus";
import { ExactShopPrices } from "./ShopPrices";
/** Part specifications from the API; pins and documents are paged separately. */
export function CatalogPartDialog({
  partKey,
  onClose,
  onAdd,
  onLab,
}: {
  partKey: string | null;
  onClose: () => void;
  onAdd: (item: CatalogComponent) => void;
  onLab: (item: CatalogComponent) => void;
}) {
  const client = useMarketClient();
  const detail = useMarketResource(
    `part|${partKey}`,
    partKey ? (signal) => client.part(partKey, signal) : null,
    client,
  );
  const pins = usePagedResource(
    `pins|${partKey}`,
    partKey ? (cursor, signal) => client.pins(partKey, { limit: 50, cursor }, signal) : null,
    client,
  );
  const documents = usePagedResource(
    `documents|${partKey}`,
    partKey ? (cursor, signal) => client.documents(partKey, { limit: 20, cursor }, signal) : null,
    client,
  );
  const local = partKey ? localPartForKey(partKey) : null;
  const part = detail.data;
  return (
    <Dialog open={!!partKey} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-category-tone={local ? catalogCategories.indexOf(local.category) : undefined}
        className="glass-panel glass-strong catalog-details sheet-preview-details max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{part?.nameEn ?? partKey}</DialogTitle>
          <DialogDescription dir="rtl">
            {part?.nameAr ?? "Catalog specifications"}
          </DialogDescription>
        </DialogHeader>
        {detail.status !== "ready" || !part ? (
          <MarketStatus
            status={detail.status}
            message={detail.message}
            onRetry={detail.retry}
            label="part details"
          />
        ) : (
          <>
            <span className="catalog-category catalog-detail-category font-mono">{part.key}</span>
            {local ? (
              <ComponentPreview model={local.model} />
            ) : (
              <p className="glass-inset rounded-xl p-3 text-xs">
                No local 3D model is mapped to this exact catalog key.
              </p>
            )}
            {part.description && (
              <p dir="auto" className="text-sm leading-7">
                {part.description}
              </p>
            )}
            <div className="glass-inset grid grid-cols-2 gap-3 rounded-xl p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Typical supply</p>
                <strong>
                  {part.typicalSupplyVoltage !== null
                    ? `${part.typicalSupplyVoltage} V`
                    : "Unknown"}
                </strong>
              </div>
              <div>
                <p className="text-muted-foreground">Exact identity needs</p>
                <strong>
                  {part.exactIdentityFields.length
                    ? part.exactIdentityFields.join(", ").toLowerCase().replaceAll("_", " ")
                    : "catalog part only"}
                </strong>
              </div>
            </div>
            <LocalWiringSheet partKey={part.key} expanded />
            <ExactShopPrices key={part.key} partKey={part.key} />
            <section aria-label="Pins">
              <h3 className="text-xs font-bold">Pins · {part.pinCount}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Catalog pin data is unverified or unknown. Wiring safety is not evaluated; check the
                datasheet before wiring.
              </p>
              {pins.status === "ready" ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {pins.items.map((pin) => (
                      <span
                        key={pin.id}
                        title={`Function: ${pinValue(pin.functions)} · direction: ${pinValue(pin.direction)} · physical number: ${pinValue(pin.physicalNumber)}`}
                        className="glass-inset rounded-md px-2 py-1 font-mono text-[10px]"
                      >
                        {pin.name} ·{" "}
                        {pin.voltage.status === "UNKNOWN"
                          ? "voltage unknown"
                          : pinValue(pin.voltage, "V")}
                      </span>
                    ))}
                  </div>
                  <LoadMore {...pins} onMore={pins.loadMore} label="pins" />
                </>
              ) : (
                <MarketStatus
                  compact
                  status={pins.status}
                  message={pins.message}
                  onRetry={pins.retry}
                  label="pins"
                />
              )}
            </section>
            <section aria-label="Documents">
              <h3 className="text-xs font-bold">Documents · {part.documentCount}</h3>
              {documents.status === "ready" ? (
                documents.items.length ? (
                  <>
                    <ul className="mt-2 space-y-1.5 text-xs">
                      {documents.items.map((doc) => (
                        <li key={doc.url} className="glass-inset rounded-lg p-2">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold"
                          >
                            {doc.title} <ArrowUpRight size={11} className="inline" />
                          </a>
                          <span className="block text-muted-foreground">
                            {doc.publisher} · {doc.format} · {doc.referenceScope} ·{" "}
                            {formatDate(doc.sourceVerifiedAt)
                              ? `source verified ${formatDate(doc.sourceVerifiedAt)}`
                              : "source not verified"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <LoadMore {...documents} onMore={documents.loadMore} label="documents" />
                  </>
                ) : (
                  <MarketEmpty
                    title="No documents"
                    hint="No reference documents are listed for this part."
                  />
                )
              ) : (
                <MarketStatus
                  compact
                  status={documents.status}
                  message={documents.message}
                  onRetry={documents.retry}
                  label="documents"
                />
              )}
            </section>
            {local && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => onAdd(local)}>
                  <Package size={15} />
                  Add to BOM
                </Button>
                <Button onClick={() => onLab(local)}>
                  <Box size={15} />
                  Add to 3D Lab
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
