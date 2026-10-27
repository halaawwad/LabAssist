import {
  validObject,
  validCanvasImage,
  type CanvasObject,
  type ObjectPatch,
} from "./presentationScene";
import { templates } from "./presentationTemplates";
export type SlideLayout = "cover" | "bullets" | "split" | "results" | "closing";
export type Slide = {
  id: string;
  layout: SlideLayout;
  title: string;
  kicker: string;
  body: string;
  image?: string | undefined;
  caption: string;
  notes: string;
  positions?: Record<string, ObjectPatch> | undefined;
  objects?: CanvasObject[] | undefined;
  sourcePart?: string | undefined;
  sourceShapeIds?: string[] | undefined;
  background?: string | undefined;
};
export type ImportedPresentation = {
  name: string;
  package: string;
  width: number;
  height: number;
  warnings: string[];
};
export type Deck = {
  title: string;
  theme: string;
  template?: string | undefined;
  accent?: string | undefined;
  slides: Slide[];
  status: "Draft" | "Submitted";
  savedAt?: string | undefined;
  submittedAt?: string | undefined;
  imported?: ImportedPresentation | undefined;
};
export const themes = [
  {
    id: "sage",
    name: "Sage Circuit",
    description: "Warm paper. Quiet green. A little engineering.",
    ink: "#28483e",
    accent: "#738e61",
    soft: "#e7eedf",
    paper: "#fafaf2",
    secondary: "#7794a7",
  },
  {
    id: "blueprint",
    name: "Blue Studio",
    description: "Clear structure, cool blue and technical detail.",
    ink: "#2c455e",
    accent: "#648aa7",
    soft: "#e3edf6",
    paper: "#f5f8fb",
    secondary: "#86a58e",
  },
  {
    id: "iris",
    name: "Iris Notes",
    description: "Soft lilac with a confident, clean finish.",
    ink: "#49405f",
    accent: "#9680ad",
    soft: "#eee7f5",
    paper: "#faf7fc",
    secondary: "#83a092",
  },
  {
    id: "rose",
    name: "Rose",
    description: "",
    ink: "#542f43",
    accent: "#aa587d",
    soft: "#f3e3eb",
    paper: "#fffafb",
    secondary: "#b78098",
  },
  {
    id: "sand",
    name: "Sand",
    description: "",
    ink: "#514335",
    accent: "#a17b4c",
    soft: "#f2e8d9",
    paper: "#fdfbf6",
    secondary: "#b69b79",
  },
  {
    id: "teal",
    name: "Teal",
    description: "",
    ink: "#214c4d",
    accent: "#338383",
    soft: "#dcefed",
    paper: "#f6fcfb",
    secondary: "#6ba7a2",
  },
  {
    id: "slate",
    name: "Graphite",
    description: "",
    ink: "#303b4a",
    accent: "#586b85",
    soft: "#e4e9ef",
    paper: "#fafbfc",
    secondary: "#8998ac",
  },
  {
    id: "terracotta",
    name: "Clay",
    description: "",
    ink: "#563d35",
    accent: "#aa6651",
    soft: "#f2e3dc",
    paper: "#fffbf8",
    secondary: "#bc9685",
  },
] as const;
export function deckPalette(deck: Pick<Deck, "theme" | "accent">) {
  const t = themes.find((t) => t.id === deck.theme) ?? themes[0];
  return { ...t, accent: deck.accent ?? t.accent };
}
export const layouts: { id: SlideLayout; name: string }[] = [
  { id: "cover", name: "Cover" },
  { id: "bullets", name: "Key points" },
  { id: "split", name: "Image & story" },
  { id: "results", name: "Results" },
  { id: "closing", name: "Closing" },
];
export const slideId = () => `slide-${Math.random().toString(36).slice(2, 10)}`;
export function newSlide(layout: SlideLayout = "bullets"): Slide {
  return {
    id: slideId(),
    layout,
    title: "",
    kicker: "YOUR NEXT IDEA",
    body: "",
    caption: "",
    notes: "",
  };
}
export function starterDeck(title: string): Deck {
  const content: [SlideLayout, string, string, string][] = [
    ["cover", title, "GRADUATION PROJECT", "Autonomous Navigation\nDesign. Build. Learn."],
    [
      "bullets",
      "The problem worth solving.",
      "01 / THE CHALLENGE",
      "Describe the problem your project addresses.\nWho experiences it, and why does it matter?\nWhat limitation does your design aim to improve?",
    ],
    [
      "bullets",
      "A clear direction.",
      "02 / OUR OBJECTIVES",
      "State your main project objective.\nAdd two measurable design goals.\nDescribe the constraints you considered.",
    ],
    [
      "split",
      "From an idea to a system.",
      "03 / SYSTEM DESIGN",
      "Introduce the major hardware blocks.\nExplain how information and power move through the system.",
    ],
    [
      "split",
      "Small parts. One working idea.",
      "04 / IMPLEMENTATION",
      "Show your actual circuit or prototype.\nExplain one important design choice.",
    ],
    [
      "results",
      "Let the evidence speak.",
      "05 / RESULTS",
      "Test / condition — Add your measured result\nComparison — Add your baseline or target\nLimitation — Explain what still needs work",
    ],
    [
      "bullets",
      "What we learned.",
      "06 / NEXT STEPS",
      "Summarize the finding supported by your results.\nDescribe the next improvement you would make.",
    ],
    ["closing", "Good ideas keep moving.", "THANK YOU", "Questions & discussion"],
  ];
  return {
    title,
    theme: "sage",
    template: "margin",
    status: "Draft",
    slides: content.map(([layout, title, kicker, body]) => ({
      ...newSlide(layout),
      title,
      kicker,
      body,
    })),
  };
}
export function slideTips(slide: Slide, deck: Deck) {
  const tips: { id: string; level: "good" | "suggestion"; title: string; detail: string }[] = [],
    words = slide.body.trim().split(/\s+/).filter(Boolean).length,
    lines = slide.body.split("\n").filter((s) => s.trim());
  if (!slide.title.trim())
    tips.push({
      id: "title",
      level: "suggestion",
      title: "Give this slide one clear idea.",
      detail: "Add a short heading that tells your audience what matters.",
    });
  else if (slide.title.length > 65)
    tips.push({
      id: "title-long",
      level: "suggestion",
      title: "Let the heading breathe.",
      detail: "Try a shorter heading; move the explanation into the body.",
    });
  if (words > 65)
    tips.push({
      id: "text",
      level: "suggestion",
      title: "A little less text.",
      detail: `${words} words on this slide. Aim for roughly 30–60; move detail to speaker notes.`,
    });
  if (lines.length > 5)
    tips.push({
      id: "lines",
      level: "suggestion",
      title: "Split the story.",
      detail: "More than five points can be hard to scan. Consider a second slide.",
    });
  if ((slide.layout === "split" || slide.layout === "results") && !slide.image)
    tips.push({
      id: "image",
      level: "suggestion",
      title: "Show your evidence.",
      detail:
        slide.layout === "results"
          ? "Add a real chart, test photo or result table. Label axes and units."
          : "Add your prototype photo, system diagram or wiring image.",
    });
  if (slide.image && !slide.caption.trim())
    tips.push({
      id: "caption",
      level: "suggestion",
      title: "Give the image context.",
      detail: "Add a short caption and source where needed.",
    });
  if (slide.layout === "results")
    tips.push({
      id: "units",
      level: "suggestion",
      title: "Make the result measurable.",
      detail: "Include the test conditions, units and a comparison. Use your own measurements.",
    });
  if (!slide.notes.trim())
    tips.push({
      id: "notes",
      level: "suggestion",
      title: "Keep the detail in your voice.",
      detail: "Speaker notes are for explanations you want to say, not put on the slide.",
    });
  if (!deck.slides.some((s) => s.layout === "results"))
    tips.push({
      id: "results",
      level: "suggestion",
      title: "Your story needs evidence.",
      detail: "Add a Results slide before your conclusion.",
    });
  if (!tips.length)
    tips.push({
      id: "ready",
      level: "good",
      title: "A clear, focused slide.",
      detail: "Check image readability and rehearse the transition to the next slide.",
    });
  return tips;
}
export const DECK_STORAGE = "hardwaremate.presentation.draft.v1";
export function validDeck(data: unknown): data is Deck {
  if (!data || typeof data !== "object") return false;
  const d = data as Deck;
  return (
    typeof d.title === "string" &&
    d.title.length <= 90 &&
    themes.some((t) => t.id === d.theme) &&
    (!d.template || templates.some((t) => t.id === d.template)) &&
    (!d.accent || /^#[0-9a-f]{6}$/i.test(d.accent)) &&
    ["Draft", "Submitted"].includes(d.status) &&
    (!d.imported ||
      (typeof d.imported.name === "string" &&
        typeof d.imported.package === "string" &&
        /^[a-zA-Z0-9+/=]+$/.test(d.imported.package) &&
        Number.isFinite(d.imported.width) &&
        d.imported.width > 0 &&
        d.imported.width <= 100000000 &&
        Number.isFinite(d.imported.height) &&
        d.imported.height >= 200 &&
        d.imported.height <= 1800 &&
        Array.isArray(d.imported.warnings) &&
        d.imported.warnings.every((s) => typeof s === "string"))) &&
    Array.isArray(d.slides) &&
    d.slides.length > 0 &&
    d.slides.length <= 40 &&
    new Set(d.slides.map((s) => s?.id)).size === d.slides.length &&
    d.slides.every(
      (s) =>
        s &&
        typeof s.id === "string" &&
        layouts.some((l) => l.id === s.layout) &&
        ["title", "kicker", "body", "caption", "notes"].every(
          (k) => typeof s[k as keyof Slide] === "string",
        ) &&
        s.title.length <= 110 &&
        s.body.length <= 1200 &&
        s.notes.length <= 3000 &&
        s.kicker.length <= 70 &&
        s.caption.length <= 160 &&
        (!s.image || validCanvasImage(s.image)) &&
        (!s.background || /^#[0-9a-f]{6}$/i.test(s.background)) &&
        (!s.sourcePart ||
          (!!d.imported && /^ppt\/slides\/[a-zA-Z0-9_.-]+\.xml$/.test(s.sourcePart))) &&
        (!s.objects ||
          (Array.isArray(s.objects) &&
            s.objects.length <= 500 &&
            new Set(s.objects.map((o) => o?.id)).size === s.objects.length &&
            s.objects.every(validObject))) &&
        (!s.positions ||
          (typeof s.positions === "object" &&
            !Array.isArray(s.positions) &&
            Object.entries(s.positions).every(
              ([id, p]) =>
                ["title", "body", "kicker", "footer", "page", "image", "caption"].includes(id) &&
                p &&
                typeof p === "object" &&
                Object.keys(p).every((k) =>
                  [
                    "x",
                    "y",
                    "w",
                    "h",
                    "size",
                    "font",
                    "color",
                    "bold",
                    "align",
                    "rotation",
                    "fit",
                    "hidden",
                    "z",
                    "text",
                  ].includes(k),
                ) &&
                validObject({ id, kind: "text", x: 0, y: 0, w: 100, h: 100, ...p }),
            ))),
    )
  );
}
export function readDeck(title: string): Deck {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(DECK_STORAGE) || "null");
    if (validDeck(data)) return data;
  } catch {
    /* Unavailable storage or invalid cached JSON falls back to a starter deck. */
  }
  return starterDeck(title);
}
