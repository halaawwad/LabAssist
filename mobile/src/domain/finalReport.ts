export type ReportBlock = {
  id: string;
  kind: "paragraph" | "heading" | "image" | "table";
  text: string;
  url?: string;
  size?: "small" | "medium" | "large";
  rows?: string[][];
};
export type ReportSection = {
  id: string;
  title: string;
  chapter?: number;
  optional?: boolean;
  blocks: ReportBlock[];
};
export type FinalMeta = {
  title: string;
  specialization: string;
  department: string;
  supervisor: string;
  date: string;
  students: { name: string; number: string }[];
};
export const sectionTemplate: Omit<ReportSection, "blocks">[] = [
  { id: "dedication", title: "Dedication", optional: true },
  { id: "acknowledgment", title: "Acknowledgment" },
  { id: "disclaimer", title: "Disclaimer" },
  { id: "nomenclature", title: "Nomenclature / List of Symbols", optional: true },
  { id: "abbreviations", title: "List of Abbreviations" },
  { id: "abstract", title: "Abstract" },
  { id: "introduction", title: "Introduction", chapter: 1 },
  { id: "background", title: "Theoretical Background and Previous Work", chapter: 2 },
  { id: "methodology", title: "Methodology", chapter: 3 },
  { id: "results", title: "Results and Analysis", chapter: 4 },
  { id: "discussion", title: "Discussion", chapter: 5 },
  { id: "conclusions", title: "Conclusions and Recommendations", chapter: 6 },
  { id: "references", title: "References" },
  { id: "appendices", title: "Appendices", optional: true },
];
export function disclaimerText(department: string) {
  return `This report was written by student(s) at the (${department || "[Department]"}) Engineering Department, Faculty of Engineering, An-Najah National University. It has not been altered or corrected, other than editorial corrections, as a result of assessment and it may contain language as well as content errors. The views expressed in it together with any outcomes and recommendations are solely those of the student(s). An-Najah National University accepts no responsibility or liability for the consequences of this report being used for a purpose other than the purpose for which it was commissioned.`;
}
export type ReportCheck = {
  id: string;
  title: string;
  state: "present" | "review" | "missing";
  detail: string;
  section: string;
};
export function checkFinal(meta: FinalMeta, sections: ReportSection[]): ReportCheck[] {
  const text = (id: string) =>
    sections
      .find((s) => s.id === id)
      ?.blocks.map((b) => b.text)
      .join("\n")
      .trim() || "";
  const checks: ReportCheck[] = [];
  checks.push({
    id: "cover",
    title: "Cover information",
    state:
      meta.title.trim() &&
      meta.specialization.trim() &&
      meta.department.trim() &&
      meta.supervisor.trim() &&
      meta.date.trim() &&
      meta.students.every((s) => s.name.trim() && s.number.trim())
        ? "present"
        : "missing",
    detail: "Title, specialization, department, students, IDs, supervisor and date.",
    section: "cover",
  });
  for (const s of sections.filter((s) => !s.optional && s.id !== "disclaimer")) {
    const value = text(s.id);
    checks.push({
      id: s.id,
      title: s.title,
      state: value ? "review" : "missing",
      detail: value
        ? "Content is present; quality and completeness still need review."
        : "Add your own content to this required section.",
      section: s.id,
    });
  }
  checks.push({
    id: "disclaimer",
    title: "University disclaimer",
    state: meta.department.trim() ? "present" : "missing",
    detail: meta.department.trim()
      ? "Generated from the statement in your supplied Word form."
      : "Set your engineering department in the cover details.",
    section: "disclaimer",
  });
  const methods = text("methodology");
  for (const item of [
    {
      id: "standards",
      title: "Standards & specifications",
      test: /standard|specification|IEEE|ISO|IEC|code/i,
    },
    {
      id: "constraints",
      title: "Engineering design constraints",
      test: /constraint|budget|cost|environment|sustainab|safety|ethic|manufactur/i,
    },
  ])
    checks.push({
      id: item.id,
      title: item.title,
      state: item.test.test(methods) ? "review" : "missing",
      detail: item.test.test(methods)
        ? "Relevant terms found. Explain how they apply and provide evidence; this is not a compliance judgment."
        : "Document applicable standards and project-specific constraints in Methodology.",
      section: "methodology",
    });
  const abs = text("abstract");
  if (abs)
    checks.push({
      id: "abstract-style",
      title: "Abstract citation scan",
      state: /\[\d+\]|figure\s+\d|table\s+\d|chapter\s+\d/i.test(abs) ? "review" : "present",
      detail:
        "Check for reference, figure or table citations, undefined symbols and writing style. Its one-page limit is checked after PDF layout.",
      section: "abstract",
    });
  const media = sections.flatMap((s) =>
    s.blocks.filter((b) => b.kind === "image" || b.kind === "table").map((b) => ({ b, s })),
  );
  checks.push({
    id: "captions",
    title: "Figure & table captions",
    state: media.every(({ b }) => b.text.trim()) ? "present" : "missing",
    detail: media.length
      ? `${media.length} figures/tables; all need a descriptive caption.`
      : "Captions and lists update automatically when you add figures or tables.",
    section: media.find(({ b }) => !b.text.trim())?.s.id || "methodology",
  });
  return checks;
}

export function reportFolio(physical: number, bodyStart: number) {
  if (physical === 1) return "";
  if (physical >= bodyStart) return String(physical - bodyStart + 1);
  let value = physical - 1,
    result = "";
  for (const [number, symbol] of [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ] as [number, string][]) {
    while (value >= number) {
      result += symbol;
      value -= number;
    }
  }
  return result;
}

export type FinalDocument = { meta: FinalMeta; sections: ReportSection[]; savedAt?: string };
export const guidance: Record<string, string> = {
  nomenclature:
    "Define symbols and units. Order Roman letters, Greek letters, subscripts and superscripts as described in the Word form.",
  acknowledgment: "Acknowledge people, companies or scholarships that contributed to your project.",
  abstract:
    "Summarize what was done, how it was done and the results. Maximum one PDF page; no citations to references, figures, tables or chapters.",
  introduction: "Background, objectives, significance and organization of the report.",
  background: "Relevant theory, earlier work, citations and the gap your work addresses.",
  methodology:
    "Reproducible methods, standards and specifications, design alternatives, constraints and safety precautions. Discuss applicable economic, environmental, social, political, ethical, health/safety, manufacturability and sustainability constraints. Tailor this chapter to your engineering program.",
  results:
    "Relevant data, units, analysis, measurement errors and evidence supporting your conclusions.",
  discussion: "Interpret and compare the results, limitations, contributions and implications.",
  conclusions:
    "Summarize important findings, practical recommendations, future work and open problems.",
  references:
    "Use your program's accepted reference style. The supplied Word form describes APA examples and also permits a numeric style; agree the choice with your supervisor.",
  abbreviations:
    "Define the abbreviations you use. Write one abbreviation and its meaning per line.",
  appendices:
    "Supporting calculations, raw data or derivations that do not belong in the main chapters.",
};
