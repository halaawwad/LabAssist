import { describe, it, expect } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { starterDeck, slideTips, validDeck } from "@/lib/presentations";
import { exportDeckPptx } from "@/lib/presentationExport";
import { templates, composeSlide } from "@/lib/presentationTemplates";
import { deckPalette, themes, layouts } from "@/lib/presentations";
describe("presentation studio", () => {
  it("provides twenty structural designs independently of palette, with safe drawing bounds", () => {
    const d = starterDeck("Test"),
      signatures = new Set<string>();
    expect(templates).toHaveLength(20);
    for (const t of templates) {
      const c = composeSlide(t.id, d.slides[0]!, deckPalette(d));
      signatures.add(
        JSON.stringify({
          shapes: c.shapes.map(({ fill, stroke, ...s }) => s),
          texts: c.texts.map(({ text, color, ...s }) => s),
          image: c.image,
        }),
      );
      for (const l of layouts) {
        const result = composeSlide(t.id, { ...d.slides[0]!, layout: l.id }, deckPalette(d));
        for (const b of [...result.texts, ...result.shapes, result.image]) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(980);
          expect(b.y + b.h).toBeLessThanOrEqual(540);
        }
      }
      const recolored = composeSlide(t.id, d.slides[0]!, deckPalette({ ...d, theme: "teal" }));
      expect(recolored.image).toEqual(c.image);
      expect(recolored.texts.map(({ color, ...s }) => s)).toEqual(
        c.texts.map(({ color, ...s }) => s),
      );
      expect(validDeck({ ...d, template: t.id, accent: "#123abc" })).toBe(true);
    }
    expect(signatures.size).toBe(20);
    expect(themes.length).toBeGreaterThan(3);
    expect(validDeck({ ...d, template: "missing" })).toBe(false);
    expect(validDeck({ ...d, accent: "red;display:none" })).toBe(false);
  });
  it("builds editable starter slides without invented test results", () => {
    const d = starterDeck("Smart Car");
    expect(validDeck(d)).toBe(true);
    expect(d.slides).toHaveLength(8);
    expect(new Set(d.slides.map((s) => s.id)).size).toBe(8);
    expect(d.slides[5]!.body).toContain("your measured result");
  });
  it("exports every template as a distinct native editable PowerPoint", async () => {
    const source = starterDeck("Same content"),
      signatures = new Set<string>();
    for (const t of templates) {
      const d = { ...source, template: t.id, slides: [source.slides[0]!] };
      const blob = await exportDeckPptx(d);
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as ArrayBuffer);
        r.onerror = () => reject(r.error);
        r.readAsArrayBuffer(blob);
      });
      const files = unzipSync(new Uint8Array(buffer));
      const slide = strFromU8(files["ppt/slides/slide1.xml"]!);
      expect(
        new DOMParser().parseFromString(slide, "application/xml").querySelector("parsererror"),
        t.id,
      ).toBeNull();
      expect(slide).toContain("Same content");
      expect(slide).toContain('name="title"');
      signatures.add(slide);
    }
    expect(signatures.size).toBe(20);
  });
  it("responds to content, image captions and deck structure", () => {
    const d = starterDeck("Test");
    const s = {
      ...d.slides[0]!,
      title: "",
      body: Array(80).fill("word").join(" "),
      image: "data:image/png;base64,YQ==",
    };
    expect(slideTips(s, d).map((t) => t.id)).toEqual(
      expect.arrayContaining(["title", "text", "caption", "notes"]),
    );
  });
  it("rejects corrupt drafts and unsafe images", () => {
    const d = starterDeck("Test");
    expect(validDeck({ ...d, slides: [] })).toBe(false);
    expect(validDeck({ ...d, slides: [{ ...d.slides[0], image: "javascript:alert(1)" }] })).toBe(
      false,
    );
    expect(validDeck({ ...d, slides: [d.slides[0], d.slides[0]] })).toBe(false);
  });
  it("exports a well-formed editable PPTX with all slides, notes and 16:9 size", async () => {
    const d = starterDeck("A & B <prototype>");
    d.slides[0]!.notes = "Discuss the design & constraints.";
    const blob = await exportDeckPptx(d),
      bytes = new Uint8Array(
        await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(blob);
        }),
      ),
      files = unzipSync(bytes);
    expect(files["ppt/slides/slide8.xml"]).toBeTruthy();
    expect(strFromU8(files["ppt/presentation.xml"]!)).toContain('cx="12192000" cy="6858000"');
    expect(strFromU8(files["ppt/slides/slide1.xml"]!)).toContain("A &amp; B &lt;prototype&gt;");
    expect(strFromU8(files["ppt/notesSlides/notesSlide1.xml"]!)).toContain(
      "Discuss the design &amp; constraints.",
    );
    for (const [name, content] of Object.entries(files)) {
      if (!name.endsWith(".xml") && !name.endsWith(".rels")) continue;
      const doc = new DOMParser().parseFromString(strFromU8(content), "application/xml");
      expect(doc.querySelector("parsererror"), name).toBeNull();
    }
  });
});
