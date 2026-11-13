// Minimal, data-only OOXML support using the ZIP dependency already used by Student.
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";

export const columns = [
  "Project Number",
  "Project Name",
  "Supervisor Number",
  "Supervisor Name",
  "Supervisor Email",
  "Student Number",
  "Student Name",
  "Student Email",
] as const;
export type Column = (typeof columns)[number];
export type WorkbookRow = { number: number; values: string[]; formula: boolean };
export type Workbook = { headers: string[]; rows: WorkbookRow[] };
const aliases: Record<Column, string[]> = {
  "Project Number": ["project number", "project code", "رقم المشروع", "رمز المشروع"],
  "Project Name": ["project name", "project title", "اسم المشروع", "عنوان المشروع"],
  "Supervisor Number": [
    "supervisor number",
    "staff number",
    "employee number",
    "رقم المشرف",
    "الرقم الوظيفي",
  ],
  "Supervisor Name": ["supervisor name", "اسم المشرف"],
  "Supervisor Email": ["supervisor email", "بريد المشرف", "البريد الإلكتروني للمشرف"],
  "Student Number": ["student number", "university number", "رقم الطالب", "الرقم الجامعي"],
  "Student Name": ["student name", "اسم الطالب"],
  "Student Email": ["student email", "بريد الطالب", "البريد الإلكتروني للطالب"],
};
export function initialMapping(headers: string[]): Record<Column, number> {
  return Object.fromEntries(
    columns.map((c) => {
      const matches = headers.flatMap((h, i) =>
        aliases[c].includes((h ?? "").trim().toLowerCase()) ? [i] : [],
      );
      return [c, matches.length === 1 ? matches[0] : -1];
    }),
  ) as Record<Column, number>;
}
function xml(text: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("XML entities are not supported.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Invalid workbook XML.");
  return doc;
}
const nodes = (root: Document | Element, tag: string) =>
  Array.from(root.getElementsByTagNameNS("*", tag));
const textOf = (root: Element, tag: string) =>
  nodes(root, tag)
    .map((n) => n.textContent ?? "")
    .join("");
export async function readWorkbook(file: File): Promise<Workbook> {
  if (!/\.xlsx$/i.test(file.name) || file.size > 2 * 1024 * 1024)
    throw new Error("Choose an .xlsx file up to 2 MB.");
  let expanded = 0;
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => {
      expanded += entry.originalSize;
      if (expanded > 12 * 1024 * 1024) throw new Error("Expanded workbook exceeds 12 MB.");
      return /^(xl\/|\[Content_Types\]\.xml)/.test(entry.name);
    },
  });
  const read = (path: string) => {
    if (!files[path]) throw new Error(`Missing workbook part: ${path}`);
    return xml(strFromU8(files[path]));
  };
  const sheets = nodes(read("xl/workbook.xml"), "sheet");
  if (sheets.length !== 1)
    throw new Error("Use a workbook with exactly one worksheet; no rows will be skipped.");
  const id = sheets[0].getAttributeNS(
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "id",
  );
  const rel = nodes(read("xl/_rels/workbook.xml.rels"), "Relationship").find(
    (r) => r.getAttribute("Id") === id,
  );
  const target = rel?.getAttribute("Target") ?? "";
  if (rel?.getAttribute("TargetMode") === "External")
    throw new Error("External worksheets are unsupported.");
  const path = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  if (!/^xl\/worksheets\/[\w.-]+\.xml$/.test(path))
    throw new Error("Unsupported worksheet location.");
  const strings = files["xl/sharedStrings.xml"]
    ? nodes(read("xl/sharedStrings.xml"), "si").map((n) => textOf(n, "t"))
    : [];
  const styles = files["xl/styles.xml"] ? read("xl/styles.xml") : null;
  const formats = new Map(
    styles
      ? nodes(styles, "numFmt").map((n) => [
          n.getAttribute("numFmtId"),
          n.getAttribute("formatCode") ?? "",
        ])
      : [],
  );
  const cellFormats = styles
    ? nodes(styles, "cellXfs")
        .flatMap((n) => nodes(n, "xf"))
        .map((n) => {
          const id = Number(n.getAttribute("numFmtId") ?? 0);
          return (
            formats.get(String(id)) ??
            (id === 0 ? "General" : id === 49 ? "@" : id === 1 ? "0" : "unsupported")
          );
        })
    : [];
  const rawRows = nodes(read(path), "row");
  if (rawRows.length > 2001) throw new Error("Use at most 2,000 data rows.");
  const rows: WorkbookRow[] = rawRows
    .map((row) => {
      const values: string[] = [];
      const number = Number(row.getAttribute("r"));
      if (!Number.isInteger(number) || number < 1) throw new Error("Invalid Excel row number.");
      const cells = nodes(row, "c");
      if (cells.length > 64) throw new Error("Use at most 64 columns.");
      for (const cell of cells) {
        const ref = cell.getAttribute("r") ?? "";
        const letters = /^[A-Z]+/.exec(ref)?.[0];
        if (!letters) throw new Error(`Row ${number}: invalid cell reference.`);
        const index = [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
        if (index > 63) throw new Error("Use at most 64 columns.");
        const type = cell.getAttribute("t");
        const value = textOf(cell, "v");
        let data =
          type === "s" ? strings[Number(value)] : type === "inlineStr" ? textOf(cell, "t") : value;
        if (data === undefined) throw new Error(`Row ${number}: invalid shared string.`);
        // Respect zero-padded identifiers explicitly formatted as e.g. 00000000.
        const format = cellFormats[Number(cell.getAttribute("s") ?? 0)];
        if (format && format.length > 64)
          throw new Error(`Row ${number}: numeric format is too long; use Text identifiers.`);
        if ((!type || type === "n") && format && !/^(General|@|0+)$/.test(format))
          throw new Error(
            `Row ${number}: unsupported numeric/date formatting; format identifiers as Text.`,
          );
        if ((!type || type === "n") && /^0+$/.test(format ?? "") && /^\d+$/.test(data))
          data = data.padStart(format.length, "0");
        if (["e", "b", "d"].includes(type ?? ""))
          throw new Error(`Row ${number}: errors, booleans and dates are unsupported.`);
        values[index] = data.trim();
      }
      return { number, values, formula: nodes(row, "f").length > 0 };
    })
    .filter((r) => r.formula || r.values.some((v) => v?.trim()));
  if (!rows.length) throw new Error("The workbook is empty.");
  if (rows[0].formula) throw new Error("Formula-based headers are unsupported.");
  return { headers: rows[0].values, rows: rows.slice(1) };
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export function downloadTemplate() {
  const data = [
    columns,
    ...["20990001", "20990002"].map((number, i) => [
      "P001",
      "LabAssist example",
      "9099",
      "Dr. Example",
      "supervisor@example.com",
      number,
      i ? "Noor Example" : "Hala Example",
      `s${number}@stu.najah.edu`,
    ]),
  ];
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${data.map((row, i) => `<row r="${i + 1}">${row.map((v, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${escape(v)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const parts = {
    "[Content_Types].xml":
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml":
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Department import" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels":
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet,
  };
  const bytes = zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(v)])));
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "labassist-department-template.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
