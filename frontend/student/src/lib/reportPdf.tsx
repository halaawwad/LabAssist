import {
  Document,
  Page,
  View,
  Text,
  Image,
  Link,
  Font,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import background from "@/assets/report-page-background.jpg";
import {
  disclaimerText,
  type FinalMeta,
  type ReportSection,
  type ReportBlock,
} from "@/lib/reports";
Font.register({
  family: "ReportSerif",
  fonts: [
    { src: "/report-fonts/amiri-regular.ttf", fontWeight: 400 },
    { src: "/report-fonts/amiri-bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);
const styles = StyleSheet.create({
  page: {
    paddingTop: 132,
    paddingBottom: 58,
    paddingHorizontal: 56,
    fontFamily: "ReportSerif",
    fontSize: 12,
    color: "#171717",
  },
  background: { position: "absolute", top: 0, left: 0, width: 595.28, height: 841.89 },
  title: { fontSize: 19, fontWeight: 700, marginBottom: 16 },
  heading: { fontSize: 14, fontWeight: 700, marginTop: 14, marginBottom: 8 },
  paragraph: { marginBottom: 12, textAlign: "justify", lineHeight: 1.5 },
  caption: { fontSize: 10, marginTop: 7, marginBottom: 14, textAlign: "center" },
  coverTitle: {
    fontSize: 27,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 25,
    lineHeight: 1.25,
  },
  coverSubtitle: {
    fontSize: 17,
    fontWeight: 700,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 35,
  },
  coverGroup: { marginBottom: 21 },
  coverLabel: { fontWeight: 700, marginBottom: 6 },
  coverDate: { textAlign: "center", marginTop: 35 },
  folio: { position: "absolute", bottom: 45, left: 0, right: 0, textAlign: "center", fontSize: 10 },
  tocRow: { flexDirection: "row", marginBottom: 6 },
  tocLabel: { flex: 1, fontSize: 10, color: "#171717", textDecoration: "none" },
  tocNumber: { fontSize: 10, width: 32, textAlign: "right" },
  figure: { marginTop: 8, marginBottom: 6 },
  table: { marginTop: 9, marginBottom: 10 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#b8b8b8" },
  cell: { flex: 1, padding: 5, fontSize: 9 },
  headerRow: { backgroundColor: "#efefed", fontWeight: 700 },
});
function roman(value: number) {
  const list: [number, string][] = [
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
  ];
  let text = "";
  for (const [n, s] of list)
    while (value >= n) {
      text += s;
      value -= n;
    }
  return text;
}
type Positions = Record<string, number>;
function contentEntries(sections: ReportSection[]) {
  let figure = 0,
    table = 0;
  return sections.flatMap((s) => {
    let sub = 0;
    return s.blocks.map((b) => ({
      section: s,
      block: b,
      label:
        b.kind === "heading"
          ? `${s.chapter ? `${s.chapter}.` : ""}${++sub} ${b.text}`
          : b.kind === "image"
            ? `Figure ${++figure}: ${b.text || "Caption missing"}`
            : b.kind === "table"
              ? `Table ${++table}: ${b.text || "Caption missing"}`
              : "",
    }));
  });
}
function ReportDocument({
  meta,
  sections,
  positions,
  capture,
}: {
  meta: FinalMeta;
  sections: ReportSection[];
  positions: Positions;
  capture: (id: string, page: number) => void;
}) {
  const included = sections.filter(
    (s) => !s.optional || s.blocks.some((b) => b.text.trim() || b.url),
  );
  const entries = contentEntries(included);
  const firstBody = positions["introduction"] || 1;
  const pageLabel = (id: string) => {
    const physical = positions[id];
    return !physical
      ? "—"
      : physical < firstBody
        ? roman(physical - 1)
        : String(physical - firstBody + 1);
  };
  const backgroundImage = <Image src={background} style={styles.background} fixed />;
  const footer = (
    <Text
      style={styles.folio}
      fixed
      render={({ pageNumber }) =>
        pageNumber < firstBody ? roman(pageNumber - 1) : String(pageNumber - firstBody + 1)
      }
    />
  );
  const mark = (id: string, title: string) => (
    <Text
      id={id}
      style={styles.title}
      render={({ pageNumber }) => {
        capture(id, pageNumber);
        return title;
      }}
    />
  );
  const sectionContent = (section: ReportSection) => (
    <>
      {section.id === "disclaimer" ? (
        <Text style={styles.paragraph}>{disclaimerText(meta.department)}</Text>
      ) : (
        entries
          .filter((e) => e.section.id === section.id)
          .map((e) => {
            const b = e.block;
            if (b.kind === "heading")
              return (
                <Text
                  key={b.id}
                  id={b.id}
                  style={styles.heading}
                  minPresenceAhead={40}
                  render={({ pageNumber }) => {
                    capture(b.id, pageNumber);
                    return e.label;
                  }}
                />
              );
            if (b.kind === "paragraph")
              return (
                <Text key={b.id} style={styles.paragraph} orphans={2} widows={2}>
                  {b.text}
                </Text>
              );
            if (b.kind === "image")
              return (
                <View key={b.id} style={styles.figure} wrap={false}>
                  {b.url && (
                    <Image
                      src={b.url}
                      style={{
                        height: b.size === "small" ? 125 : b.size === "large" ? 280 : 200,
                        objectFit: "contain",
                      }}
                    />
                  )}
                  <Text
                    id={b.id}
                    style={styles.caption}
                    render={({ pageNumber }) => {
                      capture(b.id, pageNumber);
                      return e.label;
                    }}
                  />
                </View>
              );
            return (
              <View key={b.id} style={styles.table}>
                {b.rows?.map((row, i) => (
                  <View
                    key={i}
                    style={[styles.row, ...(i === 0 ? [styles.headerRow] : [])]}
                    wrap={false}
                  >
                    {row.map((cell, j) => (
                      <Text key={j} style={styles.cell}>
                        {cell}
                      </Text>
                    ))}
                  </View>
                ))}
                <Text
                  id={b.id}
                  style={styles.caption}
                  render={({ pageNumber }) => {
                    capture(b.id, pageNumber);
                    return e.label;
                  }}
                />
              </View>
            );
          })
      )}
    </>
  );
  const contents = (kind: "contents" | "figures" | "tables") => {
    const rows =
      kind === "contents"
        ? included.flatMap((s) => [
            { id: s.id, label: `${s.chapter ? `${s.chapter} ` : ""}${s.title}`, sub: false },
            ...entries
              .filter((e) => e.section.id === s.id && e.block.kind === "heading")
              .map((e) => ({ id: e.block.id, label: e.label, sub: true })),
          ])
        : entries
            .filter((e) => e.block.kind === (kind === "figures" ? "image" : "table"))
            .map((e) => ({ id: e.block.id, label: e.label, sub: false }));
    return rows.length ? (
      rows.map((row) => (
        <View key={row.id} style={styles.tocRow} wrap={false}>
          <Link src={`#${row.id}`} style={[styles.tocLabel, { paddingLeft: row.sub ? 14 : 0 }]}>
            {row.label}
          </Link>
          <Text style={styles.tocNumber}>{pageLabel(row.id)}</Text>
        </View>
      ))
    ) : (
      <Text style={{ fontSize: 11 }}>No {kind} have been added.</Text>
    );
  };
  return (
    <Document
      title={meta.title}
      author={meta.students.map((s) => s.name).join(", ")}
      subject="Graduation Project Report"
    >
      <Page size="A4" style={styles.page}>
        {backgroundImage}
        <Text style={styles.coverTitle}>{meta.title || "[Project title]"}</Text>
        <Text style={styles.coverSubtitle}>Graduation Project Report</Text>
        <Text style={{ textAlign: "center", marginBottom: 22 }}>
          {meta.department || "[Department]"} Engineering Department
        </Text>
        <View style={styles.coverGroup}>
          <Text style={styles.coverLabel}>Prepared by:</Text>
          {meta.students.map((s, i) => (
            <Text key={i}>
              {s.name || "[Student name]"} {s.number}
            </Text>
          ))}
        </View>
        <View style={styles.coverGroup}>
          <Text style={styles.coverLabel}>Supervisor:</Text>
          <Text>{meta.supervisor || "[Supervisor name]"}</Text>
        </View>
        <Text>
          Presented in partial fulfilment of the requirements for Bachelor degree in{" "}
          {meta.specialization || "[Name of Specialization]"}.
        </Text>
        <Text style={styles.coverDate}>{meta.date || "[Date]"}</Text>
      </Page>
      {included
        .filter((s) => ["dedication", "acknowledgment", "disclaimer"].includes(s.id))
        .map((s) => (
          <Page key={s.id} size="A4" style={styles.page}>
            {backgroundImage}
            {mark(s.id, s.title.toUpperCase())}
            {sectionContent(s)}
            {footer}
          </Page>
        ))}
      {(["contents", "figures", "tables"] as const).map((kind) => (
        <Page key={kind} size="A4" style={styles.page}>
          {backgroundImage}
          {mark(
            kind,
            kind === "contents"
              ? "TABLE OF CONTENTS"
              : kind === "figures"
                ? "LIST OF FIGURES"
                : "LIST OF TABLES",
          )}
          {contents(kind)}
          {footer}
        </Page>
      ))}
      {included
        .filter((s) => !["dedication", "acknowledgment", "disclaimer"].includes(s.id))
        .map((s) => (
          <Page key={s.id} size="A4" style={styles.page}>
            {backgroundImage}
            {mark(s.id, `${s.chapter ? `${s.chapter}  ` : ""}${s.title.toUpperCase()}`)}
            {sectionContent(s)}
            {footer}
          </Page>
        ))}
    </Document>
  );
}
export async function buildReportPdf(meta: FinalMeta, sections: ReportSection[]) {
  let positions: Positions = {};
  let blob: Blob | undefined;
  let stable = false;
  for (let pass = 0; pass < 6; pass++) {
    const next: Positions = {};
    blob = await pdf(
      <ReportDocument
        meta={meta}
        sections={sections}
        positions={positions}
        capture={(id, page) => {
          next[id] = page;
        }}
      />,
    ).toBlob();
    const signature = (p: Positions) =>
      JSON.stringify(Object.entries(p).sort(([a], [b]) => a.localeCompare(b)));
    if (signature(next) === signature(positions)) {
      positions = next;
      stable = true;
      break;
    }
    positions = next;
  }
  if (!blob || !stable)
    throw Error(
      "Page indexes did not settle. Try shortening long headings and captions, then export again.",
    );
  const abstractPages =
    positions["abstract"] && positions["introduction"]
      ? positions["introduction"] - positions["abstract"]
      : 0;
  return { blob, positions, abstractPages };
}
