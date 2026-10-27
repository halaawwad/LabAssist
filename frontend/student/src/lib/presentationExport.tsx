import { slideScene, objectFingerprint, type CanvasObject } from "./presentationScene";
import {
  unbase64,
  unpackPresentation,
  parseXml,
  elements,
  relationshipsPart,
} from "./presentationImport";
import { deckPalette, type Deck } from "./presentations";
import { Document as PdfDocument, Page, View, Text, Image, Font, pdf } from "@react-pdf/renderer";
Font.register({
  family: "DeckFont",
  fonts: [
    { src: "/report-fonts/amiri-regular.ttf" },
    { src: "/report-fonts/amiri-bold.ttf", fontWeight: 700 },
  ],
});
export async function exportDeckPdf(deck: Deck) {
  return pdf(
    <PdfDocument title={deck.title}>
      {deck.slides.map((s, i) => {
        const c = slideScene(deck, s, i);
        return (
          <Page
            key={s.id}
            size={[960, c.height]}
            wrap={false}
            style={{ backgroundColor: c.background }}
          >
            {c.objects.map((o) => {
              const pos = {
                position: "absolute" as const,
                left: o.x,
                top: o.y,
                width: o.w,
                height: o.h,
                ...(o.rotation ? { transform: `rotate(${o.rotation}deg)` } : {}),
              };
              if (o.kind === "shape")
                return (
                  <View
                    key={o.id}
                    style={{
                      ...pos,
                      backgroundColor: o.fill ?? "transparent",
                      borderRadius: o.geometry === "ellipse" ? o.w / 2 : (o.radius ?? 0),
                      ...(o.stroke ? { borderWidth: 1, borderColor: o.stroke } : {}),
                    }}
                  />
                );
              if (o.kind === "image")
                return (
                  <Image
                    key={o.id}
                    src={o.src!}
                    style={{ ...pos, objectFit: o.fit ?? "contain", borderRadius: o.radius ?? 0 }}
                  />
                );
              const family = /[\u0600-\u06ff]/.test(o.text ?? "")
                ? "DeckFont"
                : o.font === "Georgia"
                  ? "Times-Roman"
                  : o.font === "Courier New"
                    ? "Courier"
                    : "Helvetica";
              return (
                <Text
                  key={o.id}
                  style={{
                    ...pos,
                    fontSize: o.size ?? 24,
                    color: o.color ?? "#243530",
                    fontWeight: o.bold ? 700 : 400,
                    fontFamily: family,
                    textAlign: o.align ?? "left",
                    lineHeight: 1.3,
                    overflow: "hidden",
                    backgroundColor: o.fill ?? "transparent",
                  }}
                >
                  {o.text}
                </Text>
              );
            })}
          </Page>
        );
      })}
    </PdfDocument>,
  ).toBlob();
}

const escape = (text: string) =>
  text
    // XML 1.0 excludes these control characters from exported text.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
    );
const xml = (s: string) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${s}`;
const emu = (n: number) => Math.round(n * 914400);
const rel = (id: string, type: string, target: string) =>
  `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`;
const rels = (s: string) =>
  xml(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${s}</Relationships>`,
  );
const group =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
const ns =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
function textBox(
  id: number,
  name: string,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  size: number,
  color: string,
  bold = false,
  font = "Arial",
  align = "left",
) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr vertOverflow="clip" wrap="square" lIns="0" rIns="0" tIns="0" bIns="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${text
    .split("\n")
    .map(
      (line) =>
        `<a:p><a:pPr algn="${align === "center" ? "ctr" : align === "right" ? "r" : "l"}" rtl="${/[\u0600-\u06ff]/.test(line) ? 1 : 0}"><a:lnSpc><a:spcPct val="130000"/></a:lnSpc><a:spcAft><a:spcPts val="0"/></a:spcAft></a:pPr><a:r><a:rPr lang="en-US" sz="${size * 100}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color.slice(1)}"/></a:solidFill><a:latin typeface="${font}"/><a:cs typeface="Arial"/></a:rPr><a:t xml:space="preserve">${escape(line)}</a:t></a:r><a:endParaRPr lang="en-US"/></a:p>`,
    )
    .join("")}</p:txBody></p:sp>`;
}
async function imageBounds(src: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const image = new globalThis.Image();
    image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight });
    image.onerror = () => resolve({ w: 470, h: 330 });
    image.src = src;
  });
}
async function nativeObjects(
  objects: CanvasObject[],
  files: Record<string, Uint8Array>,
  prefix: string,
  startId: number,
  unit = 1 / 72,
) {
  let output = "",
    relationships = "";
  let serial = startId;
  for (const o of objects.filter((o) => !o.hidden)) {
    const id = serial++,
      x = o.x * unit,
      y = o.y * unit,
      w = o.w * unit,
      h = o.h * unit;
    let shape = "";
    if (o.kind === "text") {
      shape = textBox(
        id,
        o.id.replace(/[^\w-]/g, ""),
        o.text ?? "",
        x,
        y,
        w,
        h,
        (o.size ?? 24) * unit * 72,
        o.color ?? "#243530",
        o.bold,
        o.font ?? "Arial",
        o.align ?? "left",
      );
      if (o.fill && o.fill !== "transparent")
        shape = shape.replace(
          "<a:noFill/>",
          `<a:solidFill><a:srgbClr val="${o.fill.slice(1)}"/></a:solidFill>`,
        );
    } else if (o.kind === "shape") {
      shape = rectangle(
        id,
        o.fill && o.fill !== "transparent" ? o.fill : "#ffffff",
        x,
        y,
        w,
        h,
        o.geometry === "ellipse" ? "ellipse" : o.radius ? "roundRect" : "rect",
        o.stroke,
      );
      if (!o.fill || o.fill === "transparent")
        shape = shape
          .replace('<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>', "<a:noFill/>")
          .replace('<a:solidFill><a:srgbClr val="ffffff"/></a:solidFill>', "<a:noFill/>");
    } else if (o.src) {
      const match = o.src.match(/^data:image\/(png|jpeg|gif);base64,(.+)$/);
      if (!match) continue;
      const ext = match[1] === "jpeg" ? "jpg" : match[1],
        rid = `rIdLabAssistImage${prefix}${id}`,
        name = `labassist-${prefix}-${id}.${ext}`;
      files["ppt/media/" + name] = unbase64(match[2]!);
      relationships += rel(rid, "image", "../media/" + name);
      const bounds = await imageBounds(o.src),
        scale = Math.min(w / bounds.w, h / bounds.h),
        iw = o.fit === "cover" ? w : bounds.w * scale,
        ih = o.fit === "cover" ? h : bounds.h * scale;
      let crop = "";
      if (o.fit === "cover") {
        const ratio = bounds.w / bounds.h,
          frame = w / h;
        if (ratio > frame) {
          const inset = Math.round((1 - frame / ratio) * 50000);
          crop = `<a:srcRect l="${inset}" r="${inset}"/>`;
        } else {
          const inset = Math.round((1 - ratio / frame) * 50000);
          crop = `<a:srcRect t="${inset}" b="${inset}"/>`;
        }
      }
      shape = `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Image ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${emu(x + (w - iw) / 2)}" y="${emu(y + (h - ih) / 2)}"/><a:ext cx="${emu(iw)}" cy="${emu(ih)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    }
    if (o.rotation)
      shape = shape.replace("<a:xfrm>", `<a:xfrm rot="${Math.round(o.rotation * 60000)}">`);
    output += shape;
  }
  return { xml: output, relationships };
}
function rectangle(
  id: number,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  kind = "rect",
  stroke?: string,
) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Accent ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(w)}" cy="${emu(h)}"/></a:xfrm><a:prstGeom prst="${kind}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${color.slice(1)}"/></a:solidFill><a:ln>${stroke ? `<a:solidFill><a:srgbClr val="${stroke.slice(1)}"/></a:solidFill>` : "<a:noFill/>"}</a:ln></p:spPr></p:sp>`;
}
/** Editable OOXML presentation: native text, embedded images, speaker notes, 16:9 slides. */
export async function exportDeckPptx(deck: Deck) {
  if (deck.imported) return exportImportedPowerPoint(deck);
  const { zipSync, strToU8 } = await import("fflate"),
    files: Record<string, Uint8Array> = {},
    theme = deckPalette(deck);
  const put = (p: string, s: string) => (files[p] = strToU8(s));
  let overrides =
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>';
  put("_rels/.rels", rels(rel("rId1", "officeDocument", "ppt/presentation.xml")));
  put(
    "ppt/presentation.xml",
    xml(
      `<p:presentation ${ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${deck.slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    ),
  );
  put(
    "ppt/_rels/presentation.xml.rels",
    rels(
      rel("rId1", "slideMaster", "slideMasters/slideMaster1.xml") +
        deck.slides.map((_, i) => rel(`rId${i + 2}`, "slide", `slides/slide${i + 1}.xml`)).join(""),
    ),
  );
  put(
    "ppt/slideMasters/slideMaster1.xml",
    xml(
      `<p:sldMaster ${ns}><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMap accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" bg1="lt1" bg2="lt2" folHlink="folHlink" hlink="hlink" tx1="dk1" tx2="dk2"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles/></p:sldMaster>`,
    ),
  );
  put(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    rels(
      rel("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml") +
        rel("rId2", "theme", "../theme/theme1.xml"),
    ),
  );
  put(
    "ppt/slideLayouts/slideLayout1.xml",
    xml(
      `<p:sldLayout ${ns} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`,
    ),
  );
  put(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    rels(rel("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")),
  );
  const colors = [
    ["dk1", theme.ink],
    ["lt1", theme.paper],
    ["dk2", "#34463f"],
    ["lt2", theme.soft],
    ["accent1", theme.accent],
    ["accent2", theme.secondary],
    ["accent3", "#a58ab5"],
    ["accent4", "#bb8f77"],
    ["accent5", "#85a99c"],
    ["accent6", "#8594ac"],
    ["hlink", "#507e9b"],
    ["folHlink", "#8f75a8"],
  ];
  put(
    "ppt/theme/theme1.xml",
    xml(
      `<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="LabAssist"><a:themeElements><a:clrScheme name="${theme.name}">${colors.map(([name, color]) => `<a:${name}><a:srgbClr val="${color!.slice(1)}"/></a:${name}>`).join("")}</a:clrScheme><a:fontScheme name="Studio"><a:majorFont><a:latin typeface="Aptos Display"/><a:ea typeface=""/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="Aptos"/><a:ea typeface=""/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="Studio"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst>${[1, 2, 3].map(() => '<a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>').join("")}</a:lnStyleLst><a:effectStyleLst>${[1, 2, 3].map(() => "<a:effectStyle><a:effectLst/></a:effectStyle>").join("")}</a:effectStyleLst><a:bgFillStyleLst>${[1, 2, 3].map(() => '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>').join("")}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`,
    ),
  );
  for (const [i, s] of deck.slides.entries()) {
    const n = i + 1;
    let relationships = rel("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml");
    const composition = slideScene(deck, s, i);
    const rendered = await nativeObjects(composition.objects, files, `built-${n}`, 20);
    const shapes = rendered.xml;
    relationships += rendered.relationships;
    relationships += rel("rId3", "notesSlide", `../notesSlides/notesSlide${n}.xml`);
    put(
      `ppt/slides/slide${n}.xml`,
      xml(
        `<p:sld ${ns}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${composition.background.slice(1)}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
      ),
    );
    put(`ppt/slides/_rels/slide${n}.xml.rels`, rels(relationships));
    put(
      `ppt/notesSlides/notesSlide${n}.xml`,
      xml(
        `<p:notes ${ns}><p:cSld><p:spTree>${group}${textBox(2, "Speaker notes", s.notes, 0.7, 1, 6, 8, 14, theme.ink).replace("<p:nvPr/>", '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr>')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`,
      ),
    );
    put(
      `ppt/notesSlides/_rels/notesSlide${n}.xml.rels`,
      rels(rel("rId1", "slide", `../slides/slide${n}.xml`)),
    );
    overrides += `<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`;
  }
  put(
    "[Content_Types].xml",
    xml(
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Default Extension="gif" ContentType="image/gif"/>${overrides}</Types>`,
    ),
  );
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

/** Patch a copy of the source package instead of rebuilding its master/layout/theme. */
async function exportImportedPowerPoint(deck: Deck) {
  const { zipSync, strToU8, strFromU8 } = await import("fflate"),
    source = deck.imported!,
    files = unpackPresentation(unbase64(source.package));
  const read = (p: string) => parseXml(strFromU8(files[p]!)),
    write = (p: string, d: Document) => {
      files[p] = strToU8(new XMLSerializer().serializeToString(d));
    };
  const pres = read("ppt/presentation.xml"),
    presRels = read("ppt/_rels/presentation.xml.rels"),
    types = read("[Content_Types].xml");
  const pns = "http://schemas.openxmlformats.org/presentationml/2006/main",
    rns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    pkg = "http://schemas.openxmlformats.org/package/2006/relationships";
  const addType = (part: string, type: string) => {
    if (
      Array.from(types.documentElement.children).some(
        (e) => e.getAttribute("PartName") === "/" + part,
      )
    )
      return;
    const e = types.createElementNS(types.documentElement.namespaceURI, "Override");
    e.setAttribute("PartName", "/" + part);
    e.setAttribute("ContentType", type);
    types.documentElement.append(e);
  };
  const sldIds = elements(pres, "sldIdLst", pns)[0]!;
  while (sldIds.firstChild) sldIds.firstChild.remove();
  for (const e of Array.from(presRels.documentElement.children))
    if (e.getAttribute("Type")?.endsWith("/slide")) e.remove();
  // Retain all untouched source parts, media, themes, notes, effects and chart data.
  for (const [i, s] of deck.slides.entries()) {
    const sourcePart = s.sourcePart ?? deck.slides.find((s) => s.sourcePart)?.sourcePart;
    if (!sourcePart) throw Error("The original slide layout is missing.");
    const part = `ppt/slides/labassist-${i + 1}.xml`,
      d = read(sourcePart),
      tree = elements(d, "spTree", pns)[0]!;
    const originalRels = files[relationshipsPart(sourcePart)]
      ? read(relationshipsPart(sourcePart))
      : parseXml(rels(""));
    const scene = slideScene(deck, s, i),
      maxId = Math.max(
        1,
        ...elements(d, "cNvPr", pns).map((e) => Number(e.getAttribute("id")) || 1),
      );
    const sources = new Map(
      (s.objects ?? [])
        .filter((o) => o.source?.part === s.sourcePart)
        .map((o) => [o.source!.shapeId, o]),
    );
    if (!s.sourcePart)
      for (const e of Array.from(tree.children))
        if (!["nvGrpSpPr", "grpSpPr"].includes(e.localName)) e.remove();
    for (const shapeId of s.sourceShapeIds ?? []) {
      const original = Array.from(tree.children).find(
          (e) => elements(e, "cNvPr", pns)[0]?.getAttribute("id") === shapeId,
        ),
        o = sources.get(shapeId);
      if (!original) continue;
      if (!o || o.hidden) {
        original.remove();
        continue;
      }
      if (o.source?.baseline === objectFingerprint(o)) continue;
      const result = await nativeObjects(
        [o],
        files,
        `import-${i + 1}`,
        Number(shapeId),
        source.width / 960 / 914400,
      );
      const wrapper = parseXml(
          `<p:sld ${ns}><p:cSld><p:spTree>${result.xml}</p:spTree></p:cSld></p:sld>`,
        ),
        replacement = elements(wrapper, "spTree", pns)[0]?.firstElementChild;
      if (replacement) original.replaceWith(d.importNode(replacement, true));
      if (result.relationships) {
        const rd = parseXml(rels(result.relationships));
        for (const e of Array.from(rd.documentElement.children))
          originalRels.documentElement.append(originalRels.importNode(e, true));
      }
    }
    const fresh = scene.objects.filter((o) => !o.locked && !o.source);
    const result = await nativeObjects(
      fresh,
      files,
      `new-${i + 1}`,
      maxId + 100,
      source.width / 960 / 914400,
    );
    const wrapper = parseXml(
      `<p:sld ${ns}><p:cSld><p:spTree>${result.xml}</p:spTree></p:cSld></p:sld>`,
    );
    for (const e of Array.from(elements(wrapper, "spTree", pns)[0]!.children))
      tree.append(d.importNode(e, true));
    if (result.relationships) {
      const rd = parseXml(rels(result.relationships));
      for (const e of Array.from(rd.documentElement.children))
        originalRels.documentElement.append(originalRels.importNode(e, true));
    }
    if ((s.objects ?? []).some((o) => o.source && JSON.parse(o.source.baseline).z !== o.z)) {
      for (const o of scene.objects.filter((o) => !o.locked && o.source)) {
        const node = Array.from(tree.children).find(
          (e) => elements(e, "cNvPr", pns)[0]?.getAttribute("id") === o.source!.shapeId,
        );
        if (node) tree.append(node);
      }
    }
    // Clone notes so duplicated slides never overwrite each other's notes.
    const notePart = `ppt/notesSlides/labassist-${i + 1}.xml`,
      noteXml = xml(
        `<p:notes ${ns}><p:cSld><p:spTree>${group}${textBox(2, "Speaker notes", s.notes, 0.7, 1, 6, 8, 14, "#243530").replace("<p:nvPr/>", '<p:nvPr><p:ph type="body" idx="1"/></p:nvPr>')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`,
      );
    const oldNote = Array.from(originalRels.documentElement.children).find((e) =>
      e.getAttribute("Type")?.endsWith("/notesSlide"),
    );
    if (oldNote) oldNote.remove();
    const nr = originalRels.createElementNS(pkg, "Relationship");
    nr.setAttribute("Id", "rIdLabAssistNotes");
    nr.setAttribute("Type", rns + "/notesSlide");
    nr.setAttribute("Target", "../notesSlides/" + notePart.split("/").pop());
    originalRels.documentElement.append(nr);
    files[notePart] = strToU8(noteXml);
    files[relationshipsPart(notePart)] = strToU8(
      rels(rel("rId1", "slide", "../slides/" + part.split("/").pop())),
    );
    addType(
      notePart,
      "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
    );
    write(part, d);
    write(relationshipsPart(part), originalRels);
    addType(part, "application/vnd.openxmlformats-officedocument.presentationml.slide+xml");
    const rid = `rIdLabAssistSlide${i + 1}`,
      r = presRels.createElementNS(pkg, "Relationship");
    r.setAttribute("Id", rid);
    r.setAttribute("Type", rns + "/slide");
    r.setAttribute("Target", "slides/" + part.split("/").pop());
    presRels.documentElement.append(r);
    const id = pres.createElementNS(pns, "p:sldId");
    id.setAttribute("id", String(1024 + i));
    id.setAttributeNS(rns, "r:id", rid);
    sldIds.append(id);
  }
  for (const [ext, mime] of [
    ["png", "image/png"],
    ["jpg", "image/jpeg"],
    ["gif", "image/gif"],
  ])
    if (
      !Array.from(types.documentElement.children).some((e) => e.getAttribute("Extension") === ext)
    ) {
      const e = types.createElementNS(types.documentElement.namespaceURI, "Default");
      e.setAttribute("Extension", ext!);
      e.setAttribute("ContentType", mime!);
      types.documentElement.append(e);
    }
  write("ppt/presentation.xml", pres);
  write("ppt/_rels/presentation.xml.rels", presRels);
  write("[Content_Types].xml", types);
  const output = zipSync(files, { level: 6 });
  return new Blob([output.buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
