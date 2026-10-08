import { ExternalLink, FileText } from "lucide-react";
import { componentDocuments, documentationStatus } from "@/lib/componentDocuments";

export function ComponentDocuments({ componentKey }: { componentKey: string }) {
  const documents = componentDocuments[componentKey] ?? [];
  const status = documentationStatus(componentKey);
  return <section className="catalog-documents rounded-xl p-3" aria-label="Datasheets and original documentation">
    <h3 className="flex items-center gap-2 text-sm font-bold"><FileText size={16} /> Datasheets & Documentation</h3>
    {status && <p dir="rtl" className="mt-2 text-xs leading-6 text-muted-foreground">{status}</p>}
    <div className="mt-3 space-y-3">{documents.map(document => <div key={document.url} className="catalog-document rounded-lg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold">{document.publisher}</p><span className="catalog-category">{document.scope} · {document.format}</span></div>
      <p className="mt-1 text-xs">{document.title}</p>
      <p dir="rtl" className="mt-2 text-[11px] leading-6 text-muted-foreground">{document.note}</p>
      <a href={document.url} target="_blank" rel="noopener noreferrer" className="catalog-document-link mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold">{document.format === "PDF" ? "Open datasheet" : "Open original documentation"}<ExternalLink size={13} /><span className="sr-only"> (opens in a new tab)</span></a>
    </div>)}</div>
  </section>;
}
