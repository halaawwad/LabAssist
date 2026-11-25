import { ComponentConnectionSheet } from "@/components/ComponentConnectionSheet";
import { localPartForKey } from "@/lib/market/partKeys";
/**
 * The existing built-in wiring sheet, attached only when the API catalog key exactly matches a local part key.
 * It is local reference content, not live catalog data, and keeps the sheet's own limitation notes.
 */
export function LocalWiringSheet({
  partKey,
  expanded = false,
}: {
  partKey: string;
  expanded?: boolean;
}) {
  const local = localPartForKey(partKey);
  if (!local) return null;
  return (
    <section
      className="local-wiring-sheet"
      data-source="local-reference"
      aria-label={`Local reference wiring sheet for ${local.name}`}
    >
      <p className="glass-inset mb-1 rounded-lg px-2 py-1 text-[10px] leading-4 text-muted-foreground">
        <strong>Local reference</strong> · built-in LabAssist wiring sheet, not live catalog data.
        Not verified: follow its notes on pin placement and documents, and check the original
        datasheet for your exact part before wiring.
      </p>
      <ComponentConnectionSheet key={local.key} item={local} expanded={expanded} />
    </section>
  );
}
