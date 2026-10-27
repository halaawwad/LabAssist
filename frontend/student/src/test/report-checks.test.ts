import { describe, expect, it } from "vitest";
import {
  checkFinal,
  reportFolio,
  sectionTemplate,
  type FinalMeta,
  type ReportSection,
} from "@/lib/reports";
const meta: FinalMeta = {
  title: "Prototype",
  specialization: "Computer Engineering",
  department: "Computer",
  supervisor: "Dr. Hassan",
  date: "2026-10-14",
  students: [
    { name: "Student One", number: "001" },
    { name: "Student Two", number: "002" },
  ],
};
function sections(): ReportSection[] {
  return sectionTemplate.map((s) => ({ ...s, blocks: [] }));
}
describe("Graduation report checks", () => {
  it("does not declare compliance from standards keywords", () => {
    const data = sections();
    data.find((s) => s.id === "methodology")!.blocks = [
      { id: "method", kind: "paragraph", text: "IEEE standards and safety constraints." },
    ];
    const result = checkFinal(meta, data);
    expect(result.find((c) => c.id === "standards")?.state).toBe("review");
    expect(result.find((c) => c.id === "constraints")?.state).toBe("review");
  });
  it("requires a department before the generated disclaimer is complete", () => {
    expect(
      checkFinal({ ...meta, department: "" }, sections()).find((c) => c.id === "disclaimer")?.state,
    ).toBe("missing");
  });
  it("flags missing captions even when an image has been added", () => {
    const data = sections();
    data.find((s) => s.id === "results")!.blocks = [
      { id: "figure", kind: "image", text: "", url: "data:image/png;base64,AA==" },
    ];
    expect(checkFinal(meta, data).find((c) => c.id === "captions")?.state).toBe("missing");
  });
  it("does not mark missing report chapters as complete", () => {
    expect(checkFinal(meta, sections()).find((c) => c.id === "results")?.state).toBe("missing");
  });
  it("keeps the cover unnumbered and switches to Arabic numbering at the main body", () => {
    expect(reportFolio(1, 9)).toBe("");
    expect(reportFolio(4, 9)).toBe("iii");
    expect(reportFolio(8, 9)).toBe("vii");
    expect(reportFolio(9, 9)).toBe("1");
    expect(reportFolio(15, 9)).toBe("7");
  });
});
