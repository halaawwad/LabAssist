import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { HardwareLab } from "@/components/lab/HardwareLab";

export const Route = createFileRoute("/lab")({
  validateSearch: (search: Record<string, unknown>): { add?: string; request?: string } => ({ ...(typeof search["add"] === "string" ? {add:search["add"]} : {}), ...(typeof search["request"] === "string" ? {request:search["request"]} : {}) }),
  ssr: false,
  head: () => ({
    meta: [
      { title: "3D Virtual Hardware Lab · HardwareMate AI" },
      { name: "description", content: "Assemble and wire electronics circuits in 3D, then validate power, ground, pin types and shorts." },
      { property: "og:title", content: "3D Virtual Hardware Lab · HardwareMate AI" },
      { property: "og:description", content: "Assemble and wire electronics circuits in 3D with instant wiring validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const search = Route.useSearch();
  return (
    <div className="relative">
      <HardwareLab addComponent={search.add} addRequest={search.request} />
      <Link to="/" className="fixed bottom-4 right-[336px] z-50 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-lg hover:bg-accent">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
    </div>
  );
}
