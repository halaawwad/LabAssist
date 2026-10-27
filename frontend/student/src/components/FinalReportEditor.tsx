import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  List,
  Plus,
  Save,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  checkFinal,
  disclaimerText,
  reportFolio,
  useReports,
  type ReportBlock,
} from "@/lib/reports";
import background from "@/assets/report-page-background.jpg";
const guidance: Record<string, string> = {
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
export function FinalReportEditor() {
  const { meta, setMeta, sections, setSections, setFinalSavedAt, finalSavedAt } = useReports();
  const [selected, setSelected] = useState("cover"),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [pdfUrl, setPdfUrl] = useState<string | null>(null),
    [showPreview, setShowPreview] = useState(false),
    [positions, setPositions] = useState<Record<string, number> | null>(null),
    [exportResult, setExportResult] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const section = sections.find((s) => s.id === selected),
    checks = checkFinal(meta, sections),
    required = sections.filter((s) => !s.optional && s.id !== "disclaimer"),
    started = required.filter((s) => s.blocks.some((b) => b.text.trim())).length,
    allBlocks = sections.flatMap((s) => s.blocks),
    figures = allBlocks.filter((b) => b.kind === "image"),
    tables = allBlocks.filter((b) => b.kind === "table");
  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );
  useEffect(() => {
    setPositions(null);
    setExportResult("");
  }, [meta, sections]);
  const updateBlock = (id: string, change: Partial<ReportBlock>) =>
    setSections((list) =>
      list.map((s) =>
        s.id === selected
          ? { ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...change } : b)) }
          : s,
      ),
    );
  const addBlock = (kind: ReportBlock["kind"], text = "", url?: string) => {
    if (!section) return;
    setSections((list) =>
      list.map((s) =>
        s.id === selected
          ? {
              ...s,
              blocks: [
                ...s.blocks,
                {
                  id: crypto.randomUUID(),
                  kind,
                  text,
                  ...(url ? { url } : {}),
                  ...(kind === "image" ? { size: "medium" as const } : {}),
                  ...(kind === "table"
                    ? {
                        rows: [
                          ["Column 1", "Column 2"],
                          ["", ""],
                          ["", ""],
                        ],
                      }
                    : {}),
                },
              ],
            }
          : s,
      ),
    );
  };
  const move = (id: string, direction: number) =>
    setSections((list) =>
      list.map((s) => {
        if (s.id !== selected) return s;
        const blocks = [...s.blocks],
          i = blocks.findIndex((b) => b.id === id),
          target = i + direction;
        if (target < 0 || target >= blocks.length) return s;
        [blocks[i], blocks[target]] = [blocks[target]!, blocks[i]!];
        return { ...s, blocks };
      }),
    );
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setNotice("Choose a JPG, PNG or WebP under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result),
        image = new window.Image();
      image.onload = () => {
        addBlock("image", "", url);
        setNotice("Image added. Write a caption so it appears correctly in the figure list.");
      };
      image.onerror = () => setNotice("This image could not be opened.");
      image.src = url;
    };
    reader.onerror = () => setNotice("Could not read this image.");
    reader.readAsDataURL(file);
  };
  const generate = async (download: boolean) => {
    if (busy) return;
    setBusy(true);
    setNotice("Laying out pages and updating the contents, figures and tables…");
    try {
      const bufferModule = await import("pdf-buffer");
      const BrowserBuffer =
        bufferModule.Buffer ||
        (bufferModule as unknown as { default: { Buffer: typeof globalThis.Buffer } }).default
          .Buffer;
      globalThis.Buffer = BrowserBuffer as unknown as typeof globalThis.Buffer;
      const { buildReportPdf } = await import("@/lib/reportPdf");
      const result = await buildReportPdf(meta, sections);
      setPositions(result.positions);
      setExportResult(
        result.abstractPages > 1
          ? `Abstract spans ${result.abstractPages} pages. Shorten it to meet the one-page limit.`
          : "PDF page numbers and indexes updated.",
      );
      const url = URL.createObjectURL(result.blob);
      setPdfUrl(url);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(meta.title || "Graduation-Project").replace(/[^\p{L}\p{N}_-]+/gu, "-")}-final-report.pdf`;
        link.click();
      } else setShowPreview(true);
      setNotice(
        result.abstractPages > 1
          ? `PDF generated, but the Abstract is ${result.abstractPages} pages; the Word form limits it to one page.`
          : "PDF generated with updated indexes. Review the checklist before final submission.",
      );
    } catch (error) {
      setNotice(
        `Could not generate the PDF: ${error instanceof Error ? error.message : "please try again"}`,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="final-report-workspace">
      <div className="final-report-banner">
        <span>
          <CheckCircle2 size={15} />
          Final Report · Open for editing
        </span>
        <p>Supervisor unlocking will be connected later. This local version is always open.</p>
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setFinalSavedAt(new Date().toISOString());
              setNotice("Final report draft saved for this session.");
            }}
          >
            <Save size={13} />
            Save Draft
          </Button>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => generate(false)}>
            <Eye size={13} />
            Preview PDF
          </Button>
          <Button size="sm" disabled={busy} onClick={() => generate(true)}>
            <Download size={13} />
            {busy ? "Preparing…" : "Export PDF"}
          </Button>
        </div>
      </div>
      {notice && (
        <p role="status" className="reports-notice">
          {notice}
        </p>
      )}
      <div className="final-editor-layout" inert={busy}>
        <aside className="final-outline">
          <h2>
            <List size={15} />
            Report structure
          </h2>
          <button
            className={selected === "cover" ? "is-active" : ""}
            onClick={() => setSelected("cover")}
          >
            <span>Cover page</span>
            <small>Title & team details</small>
          </button>
          {sections.slice(0, 3).map((s) => (
            <button
              key={s.id}
              className={selected === s.id ? "is-active" : ""}
              onClick={() => setSelected(s.id)}
            >
              <span>{s.title}</span>
              {s.optional && <small>Optional</small>}
            </button>
          ))}
          <button
            className={selected === "indexes" ? "is-active" : ""}
            onClick={() => setSelected("indexes")}
          >
            <span>Contents, figures & tables</span>
            <small>Generated automatically</small>
          </button>
          {sections.slice(3).map((s) => (
            <button
              key={s.id}
              className={selected === s.id ? "is-active" : ""}
              onClick={() => setSelected(s.id)}
            >
              <span>
                {s.chapter && <b>{s.chapter}.</b>}
                {s.title}
              </span>
              {s.optional && <small>Optional</small>}
            </button>
          ))}
          <p>
            {finalSavedAt
              ? `Saved ${new Date(finalSavedAt).toLocaleTimeString("en-US", { timeZone: "Asia/Hebron", hour: "numeric", minute: "2-digit" })}`
              : "Draft kept for this session"}
          </p>
        </aside>
        <div className="final-writing-area">
          <div className="final-editor-toolbar">
            <span>
              {selected === "cover"
                ? "Cover details"
                : selected === "indexes"
                  ? "Automatic indexes"
                  : section?.title}
            </span>
            {section && section.id !== "disclaimer" && (
              <div>
                <button
                  title="Add paragraph"
                  aria-label="Add paragraph"
                  onClick={() => addBlock("paragraph")}
                >
                  <Type size={15} />
                  <span>Text</span>
                </button>
                <button
                  title="Add subsection"
                  aria-label="Add subsection"
                  onClick={() => addBlock("heading")}
                >
                  <Plus size={14} />
                  <span>Heading</span>
                </button>
                <button
                  title="Add image"
                  aria-label="Add report image"
                  onClick={() => imageInput.current?.click()}
                >
                  <ImageIcon size={15} />
                </button>
                <button
                  title="Add table"
                  aria-label="Add report table"
                  onClick={() => addBlock("table")}
                >
                  <Table2 size={15} />
                </button>
              </div>
            )}
            <input
              ref={imageInput}
              type="file"
              aria-label="Final report image"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {selected === "cover" ? (
            <div className="final-cover-editor">
              <div className="final-cover-mini" style={{ backgroundImage: `url(${background})` }}>
                <strong>{meta.title || "Project title"}</strong>
                <span>Graduation Project Report</span>
                <p>{meta.students.map((s) => s.name).join(" · ")}</p>
                <p>{meta.supervisor || "Supervisor name"}</p>
              </div>
              <div className="report-cover-fields">
                <label htmlFor="final-project-title">
                  Project title
                  <input
                    id="final-project-title"
                    value={meta.title}
                    maxLength={160}
                    onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                  />
                </label>
                <div>
                  <label htmlFor="final-specialization">
                    Specialization
                    <input
                      id="final-specialization"
                      value={meta.specialization}
                      maxLength={100}
                      onChange={(e) => setMeta({ ...meta, specialization: e.target.value })}
                    />
                  </label>
                  <label htmlFor="final-department">
                    Engineering department
                    <input
                      id="final-department"
                      value={meta.department}
                      maxLength={100}
                      onChange={(e) => setMeta({ ...meta, department: e.target.value })}
                    />
                  </label>
                </div>
                <div>
                  <label htmlFor="final-supervisor">
                    Supervisor name
                    <input
                      id="final-supervisor"
                      value={meta.supervisor}
                      maxLength={100}
                      onChange={(e) => setMeta({ ...meta, supervisor: e.target.value })}
                    />
                  </label>
                  <label htmlFor="final-date">
                    Report date
                    <input
                      id="final-date"
                      type="date"
                      value={meta.date}
                      onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                    />
                  </label>
                </div>
                <h3>Students · 2–3 equal teammates</h3>
                {meta.students.map((s, i) => (
                  <div className="final-student-fields" key={i}>
                    <label htmlFor={`final-student-${i}`}>
                      Name
                      <input
                        id={`final-student-${i}`}
                        value={s.name}
                        maxLength={100}
                        onChange={(e) =>
                          setMeta({
                            ...meta,
                            students: meta.students.map((p, j) =>
                              j === i ? { ...p, name: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    <label htmlFor={`final-number-${i}`}>
                      Student number
                      <input
                        id={`final-number-${i}`}
                        value={s.number}
                        maxLength={30}
                        onChange={(e) =>
                          setMeta({
                            ...meta,
                            students: meta.students.map((p, j) =>
                              j === i ? { ...p, number: e.target.value } : p,
                            ),
                          })
                        }
                      />
                    </label>
                    {meta.students.length > 2 && (
                      <button
                        aria-label={`Remove student ${i + 1}`}
                        onClick={() =>
                          setMeta({ ...meta, students: meta.students.filter((_, j) => j !== i) })
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
                {meta.students.length < 3 && (
                  <button
                    className="insight-text-link"
                    onClick={() =>
                      setMeta({ ...meta, students: [...meta.students, { name: "", number: "" }] })
                    }
                  >
                    <Plus size={13} />
                    Add third student
                  </button>
                )}
                <p className="final-cover-statement">
                  Presented in partial fulfilment of the requirements for Bachelor degree in{" "}
                  {meta.specialization || "[Name of Specialization]"}.
                </p>
              </div>
            </div>
          ) : selected === "indexes" ? (
            <div className="final-index-preview">
              <span className="final-auto-tag">Generated from your headings and captions</span>
              <h2>Table of contents</h2>
              {sections
                .filter((s) => !s.optional || s.blocks.length)
                .map((s) => (
                  <div key={s.id}>
                    <button onClick={() => setSelected(s.id)}>
                      {s.chapter ? `${s.chapter}. ` : ""}
                      {s.title}
                    </button>
                    <span>
                      {positions?.[s.id]
                        ? reportFolio(positions[s.id]!, positions["introduction"] || 1)
                        : "At export"}
                    </span>
                  </div>
                ))}
              <h2>List of figures · {figures.length}</h2>
              {figures.map((b, i) => (
                <div key={b.id}>
                  <span>
                    {i + 1}. {b.text || "Add a figure caption"}
                  </span>
                  <span>
                    {positions?.[b.id]
                      ? reportFolio(positions[b.id]!, positions["introduction"] || 1)
                      : "At export"}
                  </span>
                </div>
              ))}
              {!figures.length && (
                <p>Add images and captions in your chapters to build this list.</p>
              )}
              <h2>List of tables · {tables.length}</h2>
              {tables.map((b, i) => (
                <div key={b.id}>
                  <span>
                    {i + 1}. {b.text || "Add a table caption"}
                  </span>
                  <span>
                    {positions?.[b.id]
                      ? reportFolio(positions[b.id]!, positions["introduction"] || 1)
                      : "At export"}
                  </span>
                </div>
              ))}
              {!tables.length && <p>Add tables with captions to build this list.</p>}
              <p>
                Cover has no page number. Front matter uses Roman numerals; the main body starts at
                1. Page numbers update after PDF layout.
              </p>
            </div>
          ) : (
            section && (
              <>
                <p className="final-section-guidance">
                  {guidance[section.id] ||
                    "Write your own report content. This section is optional."}
                </p>
                <article
                  className="final-section-paper"
                  style={{ backgroundImage: `url(${background})` }}
                >
                  <div className="final-paper-content">
                    <h2>
                      {section.chapter ? `${section.chapter}  ` : ""}
                      {section.title.toUpperCase()}
                    </h2>
                    {section.id === "disclaimer" ? (
                      <>
                        <p className="final-disclaimer-copy">{disclaimerText(meta.department)}</p>
                        <small className="final-paper-note">
                          This statement is generated from your Word form. Set the department in
                          Cover details.
                        </small>
                      </>
                    ) : (
                      <>
                        {section.blocks.map((b, index) => (
                          <div key={b.id} className={`final-block block-${b.kind}`}>
                            <div className="final-block-controls">
                              <span>{b.kind}</span>
                              <button
                                aria-label={`Move block ${index + 1} up`}
                                disabled={index === 0}
                                onClick={() => move(b.id, -1)}
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                aria-label={`Move block ${index + 1} down`}
                                disabled={index === section.blocks.length - 1}
                                onClick={() => move(b.id, 1)}
                              >
                                <ArrowDown size={11} />
                              </button>
                              <button
                                aria-label={`Remove block ${index + 1}`}
                                onClick={() =>
                                  setSections((list) =>
                                    list.map((s) =>
                                      s.id === selected
                                        ? {
                                            ...s,
                                            blocks: s.blocks.filter((item) => item.id !== b.id),
                                          }
                                        : s,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                            {b.kind === "paragraph" ? (
                              <textarea
                                aria-label={`Paragraph ${index + 1}`}
                                dir="auto"
                                placeholder="Write your report in your own words…"
                                value={b.text}
                                maxLength={20000}
                                onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                              />
                            ) : b.kind === "heading" ? (
                              <label className="final-subheading">
                                <span>
                                  {section.chapter ? `${section.chapter}.` : ""}
                                  {
                                    section.blocks
                                      .slice(0, index + 1)
                                      .filter((block) => block.kind === "heading").length
                                  }
                                </span>
                                <input
                                  aria-label={`Subsection heading ${index + 1}`}
                                  value={b.text}
                                  placeholder="Subsection title"
                                  maxLength={160}
                                  onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                                />
                              </label>
                            ) : b.kind === "image" ? (
                              <>
                                <img
                                  src={b.url}
                                  alt={b.text || "Report figure"}
                                  className={`final-image-${b.size || "medium"}`}
                                />
                                <label className="final-caption-field">
                                  Figure {figures.findIndex((f) => f.id === b.id) + 1}
                                  <input
                                    aria-label={`Figure caption ${figures.findIndex((f) => f.id === b.id) + 1}`}
                                    value={b.text}
                                    maxLength={300}
                                    onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                                    placeholder="Describe this image…"
                                  />
                                </label>
                                <select
                                  aria-label="Image size"
                                  value={b.size || "medium"}
                                  onChange={(e) =>
                                    updateBlock(b.id, {
                                      size: e.target.value as "small" | "medium" | "large",
                                    })
                                  }
                                >
                                  {["small", "medium", "large"].map((size) => (
                                    <option key={size}>{size}</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                <div className="final-table-scroll">
                                  <table>
                                    <tbody>
                                      {b.rows?.map((row, i) => (
                                        <tr key={i}>
                                          {row.map((cell, j) => (
                                            <td key={j}>
                                              <input
                                                aria-label={`Table cell ${i + 1}-${j + 1}`}
                                                value={cell}
                                                maxLength={300}
                                                onChange={(e) =>
                                                  updateBlock(b.id, {
                                                    rows: b.rows!.map((r, ri) =>
                                                      ri === i
                                                        ? r.map((c, ci) =>
                                                            ci === j ? e.target.value : c,
                                                          )
                                                        : r,
                                                    ),
                                                  })
                                                }
                                              />
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="final-table-actions">
                                  <button
                                    onClick={() =>
                                      updateBlock(b.id, {
                                        rows: [...b.rows!, b.rows![0]!.map(() => "")],
                                      })
                                    }
                                    disabled={b.rows!.length >= 30}
                                  >
                                    + Row
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateBlock(b.id, { rows: b.rows!.map((r) => [...r, ""]) })
                                    }
                                    disabled={b.rows![0]!.length >= 6}
                                  >
                                    + Column
                                  </button>
                                  {b.rows!.length > 2 && (
                                    <button
                                      onClick={() =>
                                        updateBlock(b.id, { rows: b.rows!.slice(0, -1) })
                                      }
                                    >
                                      − Row
                                    </button>
                                  )}
                                  {b.rows![0]!.length > 2 && (
                                    <button
                                      onClick={() =>
                                        updateBlock(b.id, {
                                          rows: b.rows!.map((r) => r.slice(0, -1)),
                                        })
                                      }
                                    >
                                      − Column
                                    </button>
                                  )}
                                </div>
                                <label className="final-caption-field">
                                  Table {tables.findIndex((t) => t.id === b.id) + 1}
                                  <input
                                    aria-label={`Table caption ${tables.findIndex((t) => t.id === b.id) + 1}`}
                                    value={b.text}
                                    maxLength={300}
                                    onChange={(e) => updateBlock(b.id, { text: e.target.value })}
                                    placeholder="Describe this table…"
                                  />
                                </label>
                              </>
                            )}
                          </div>
                        ))}
                        {!section.blocks.length && (
                          <div className="final-empty-section">
                            <FileText size={30} />
                            <p>Start this section with your own writing.</p>
                            <button onClick={() => addBlock("paragraph")}>
                              <Plus size={13} />
                              Add first paragraph
                            </button>
                          </div>
                        )}
                        <div className="final-inline-tools">
                          <button onClick={() => addBlock("paragraph")}>
                            <Type size={13} />
                            Text
                          </button>
                          <button onClick={() => addBlock("heading")}>
                            <Plus size={13} />
                            Heading
                          </button>
                          <button onClick={() => imageInput.current?.click()}>
                            <ImageIcon size={13} />
                            Image
                          </button>
                          <button onClick={() => addBlock("table")}>
                            <Table2 size={13} />
                            Table
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </article>
                <p className="final-paper-note">
                  Section editor · Long sections flow onto additional A4 pages in the PDF. Use
                  Preview PDF to see exact page breaks.
                </p>
              </>
            )
          )}
        </div>
        <aside className="final-checklist">
          <div>
            <span className="final-review-icon">
              <CheckCircle2 size={21} />
            </span>
            <h2>Requirement Review</h2>
            <p>Based on your supplied university Word form.</p>
          </div>
          <div className="final-coverage">
            <strong>
              {started}/{required.length}
            </strong>
            <span>Required sections started</span>
          </div>
          <p className="final-review-disclosure">
            Local structure checks only. AI content review is not connected; finding a keyword is
            not evidence of compliance or ABET approval.
          </p>
          <div className="final-checklist-items">
            {checks.map((check) => (
              <button
                key={check.id}
                onClick={() => setSelected(check.section)}
                className={`check-${check.state}`}
              >
                <span>
                  {check.state === "present" ? (
                    <CheckCircle2 size={13} />
                  ) : check.state === "review" ? (
                    <Eye size={13} />
                  ) : (
                    <Plus size={13} />
                  )}
                </span>
                <div>
                  <strong>{check.title}</strong>
                  <small>
                    {check.state === "present"
                      ? "Format check passed"
                      : check.state === "review"
                        ? "Needs content review"
                        : "Missing"}
                  </small>
                  <p>{check.detail}</p>
                </div>
              </button>
            ))}
          </div>
          {exportResult && <p className="final-review-disclosure">{exportResult}</p>}
        </aside>
      </div>
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="final-pdf-dialog">
          <DialogHeader>
            <DialogTitle>Final report PDF preview</DialogTitle>
            <DialogDescription>
              Exact A4 pages with updated contents and figure/table indexes.
            </DialogDescription>
          </DialogHeader>
          {pdfUrl && <iframe src={pdfUrl} title="Final graduation report PDF preview" />}
          {pdfUrl && (
            <a
              className="final-download-link"
              href={pdfUrl}
              download={`${meta.title || "Graduation-Project"}-final-report.pdf`}
            >
              <Download size={14} />
              Download this PDF
            </a>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
