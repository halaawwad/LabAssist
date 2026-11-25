import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogLibrary } from "@/components/market/CatalogLibrary";
import { CatalogPartDialog } from "@/components/market/CatalogPartDialog";
import { MarketSessionProvider } from "@/lib/market/session";

vi.mock("@/components/ComponentPreview", () => ({ ComponentPreview: () => <div>Preview</div> }));
const part = (key: string) => ({
  key,
  categoryId: "boards",
  nameEn: key,
  nameAr: "أردوينو",
  description: "",
  typicalSupplyVoltage: 5,
  modelId: "arduino-uno",
  modelVersion: 1,
  active: true,
  revision: 0,
  exactIdentityFields: [],
  guides: [],
  pinCount: 0,
  documentCount: 0,
});
const session = {
  getAccessToken: async () => "test-token",
  getCurrentUser: async () => ({ id: "test", role: "STUDENT" }),
};
const fetchImpl = vi.fn(async (input: string) => {
  const path = new URL(input).pathname;
  const body = path.endsWith("/categories")
    ? { items: [], nextCursor: null }
    : path.endsWith("/pins") || path.endsWith("/documents")
      ? { items: [], nextCursor: null }
      : path.endsWith("/parts")
        ? { items: [part("arduino_uno"), part("arduino-uno")], nextCursor: null }
        : part(path.split("/").pop()!);
  return { ok: true, status: 200, json: async () => body } as Response;
});
const wrap = (children: React.ReactNode) => (
  <MarketSessionProvider session={session} baseUrl="http://api.test" fetchImpl={fetchImpl}>
    {children}
  </MarketSessionProvider>
);

describe("local wiring sheets", () => {
  it("loads further category pages for filtering", async () => {
    const pagingFetch = vi.fn(async (input: string) => {
      const url = new URL(input);
      const body = url.pathname.endsWith("/categories")
        ? url.searchParams.has("cursor")
          ? {
              items: [{ id: "other", nameEn: "Other category", nameAr: "أخرى", sortOrder: 2 }],
              nextCursor: null,
            }
          : {
              items: [{ id: "boards", nameEn: "Boards", nameAr: "لوحات", sortOrder: 1 }],
              nextCursor: "next",
            }
        : { items: [], nextCursor: null };
      return { ok: true, status: 200, json: async () => body } as Response;
    });
    render(
      <MarketSessionProvider session={session} baseUrl="http://api.test" fetchImpl={pagingFetch}>
        <CatalogLibrary
          previews={{}}
          bom={[]}
          onDetails={() => {}}
          onShowOnBench={() => {}}
          onAdd={() => {}}
          onLab={() => {}}
        />
      </MarketSessionProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Load more categories" }));
    expect(await screen.findByRole("button", { name: /Other category/ })).toBeInTheDocument();
  });
  it("renders the sheet only for the exact key in the library, with Arabic text and working tabs", async () => {
    render(
      wrap(
        <CatalogLibrary
          previews={{}}
          bom={[]}
          onDetails={() => {}}
          onShowOnBench={() => {}}
          onAdd={() => {}}
          onLab={() => {}}
        />,
      ),
    );
    const sheet = await screen.findByRole("region", { name: /Local reference wiring sheet/ });
    expect(screen.getAllByText("أردوينو")[0]).toHaveAttribute("dir", "rtl");
    expect(screen.getAllByRole("region", { name: /Local reference wiring sheet/ })).toHaveLength(1);
    expect(within(sheet).getByText(/not live catalog data/)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: /Connection sheet/ }));
    expect(
      within(sheet).getByText(/Functional grouping, not a physical package drawing/),
    ).toBeInTheDocument();
    expect(within(sheet).getByText(/check the original datasheet/)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("tab", { name: "How to connect" }));
    expect(within(sheet).getByText(/From the part to a working connection/)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("tab", { name: "Original sources" }));
    expect(within(sheet).getByRole("link", { name: /Open original/ })).toBeInTheDocument();
  });
  it("shows the expanded sheet in known details and none for an unknown lookalike", async () => {
    const view = render(
      wrap(
        <CatalogPartDialog
          partKey="arduino_uno"
          onClose={() => {}}
          onAdd={() => {}}
          onLab={() => {}}
        />,
      ),
    );
    const sheet = await screen.findByRole("region", { name: /Local reference wiring sheet/ });
    expect(
      within(sheet).getByText(/Functional grouping, not a physical package drawing/),
    ).toBeInTheDocument();
    expect(screen.getByText("أردوينو")).toHaveAttribute("dir", "rtl");
    view.unmount();
    render(
      wrap(
        <CatalogPartDialog
          partKey="arduino-uno"
          onClose={() => {}}
          onAdd={() => {}}
          onLab={() => {}}
        />,
      ),
    );
    expect(await screen.findByText(/No local 3D model is mapped/)).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /Local reference wiring sheet/ }),
    ).not.toBeInTheDocument();
  });
});
