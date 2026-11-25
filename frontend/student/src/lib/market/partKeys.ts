import { componentCatalog, type CatalogComponent } from "@/lib/componentCatalog";
/**
 * Explicit mapping from an API catalog key to the local 3D/BOM/lab component.
 * Only an identical `key` matches: model ids (for example `arduino-uno`) and look-alike keys are never
 * normalised or guessed, so parts without an exact local key simply have no local 3D model.
 */
const byKey = new Map(componentCatalog.map((item) => [item.key, item]));
export function localPartForKey(key: string): CatalogComponent | null {
  return byKey.get(key) ?? null;
}
