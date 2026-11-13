import { ReportCoverPreview } from "./ReportCoverPreview";
import { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  ImagePlus,
  List,
  Plus,
  Table2,
  Trash2,
  Type,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import {
  checkFinal,
  disclaimerText,
  guidance,
  reportFolio,
  sectionTemplate,
  type FinalDocument,
  type ReportBlock,
} from "@/domain/finalReport";
import type { Report } from "@/domain/workspace";
import PdfEngine from "./PdfEngine";
import PdfDocument from "./PdfDocument";
import type { EngineProps, EngineReply } from "./pdfTypes";
import { sharePDF, storePDF } from "./pdfFiles";

const stationery = require("../../../assets/web/report-page-background.jpg");
const uid = () => `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
export function FinalReportEditor({
  report,
  supervisor = false,
  onClose,
}: {
  report: Report;
  supervisor?: boolean;
  onClose: () => void;
}) {
  const { state, act } = useWorkspace();
  const t = useCopy();
  const project = state.projects.find((p) => p.id === report.projectId)!;
  const [document, setDocument] = useState<FinalDocument>(
    () =>
      report.document ?? {
        meta: {
          title: project.title,
          specialization: "",
          department: "",
          supervisor: project.supervisorIds
            .map((id) => state.users.find((u) => u.id === id)?.name)
            .filter(Boolean)
            .join(" / "),
          date: new Date().toISOString().slice(0, 10),
          students: project.studentIds.map((id) => {
            const u = state.users.find((u) => u.id === id)!;
            return { name: u.name, number: u.universityNumber ?? "" };
          }),
        },
        sections: sectionTemplate.map((s) => {
          const legacy = Object.entries(report.fields)
            .filter(
              ([key]) =>
                s.title.toLowerCase().includes(key.toLowerCase()) ||
                (key === "Conclusion" && s.id === "conclusions"),
            )
            .map(([, value]) => value)
            .filter(Boolean)
            .join("\n\n");
          return {
            ...s,
            blocks: legacy ? [{ id: uid(), kind: "paragraph" as const, text: legacy }] : [],
          };
        }),
      },
  );
  const [selected, setSelected] = useState("cover"),
    [drawer, setDrawer] = useState<"outline" | "checks" | null>(null),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  const [request, setRequest] = useState<EngineProps["request"]>(null),
    [busy, setBusy] = useState(false),
    [pdfURI, setPdfURI] = useState(""),
    [preview, setPreview] = useState(false),
    [exportMode, setExportMode] = useState<"preview" | "download" | "submit">("preview"),
    [positions, setPositions] = useState<Record<string, number>>({}),
    [generatedSignature, setGeneratedSignature] = useState("");
  const [feedback, setFeedback] = useState(""),
    [feedbackSection, setFeedbackSection] = useState("");
  useEffect(() => {
    if (!busy) return;
    const timeout = setTimeout(() => {
      setBusy(false);
      setNotice("PDF generation took too long. Please retry; your report content is unchanged.");
    }, 90000);
    return () => clearTimeout(timeout);
  }, [busy, request]);
  const editable = !supervisor && report.status === "draft" && project.finalOpen;
  const { meta, sections } = document;
  const section = sections.find((s) => s.id === selected);
  const all = sections.flatMap((s) => s.blocks),
    figures = all.filter((b) => b.kind === "image"),
    tables = all.filter((b) => b.kind === "table");
  const required = sections.filter((s) => !s.optional && s.id !== "disclaimer"),
    started = required.filter((s) => s.blocks.some((b) => b.text.trim())).length,
    checks = checkFinal(meta, sections);
  const signature = JSON.stringify(document);
  const currentPositions = generatedSignature === signature ? positions : {};
  const change = (next: FinalDocument) => {
    if (!editable) return;
    setDocument(next);
    setDirty(true);
    setNotice("");
  };
  const setMeta = (next: FinalDocument["meta"]) => change({ ...document, meta: next });
  const update = (id: string, patch: Partial<ReportBlock>) =>
    change({
      ...document,
      sections: sections.map((s) =>
        s.id === selected
          ? { ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }
          : s,
      ),
    });
  const add = (kind: ReportBlock["kind"], url?: string) => {
    if (!section) return;
    change({
      ...document,
      sections: sections.map((s) =>
        s.id === selected
          ? {
              ...s,
              blocks: [
                ...s.blocks,
                {
                  id: uid(),
                  kind,
                  text: "",
                  ...(url ? { url, size: "medium" as const } : {}),
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
    });
  };
  const move = (id: string, direction: number) => {
    if (!section) return;
    const blocks = [...section.blocks],
      index = blocks.findIndex((b) => b.id === id),
      target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    change({
      ...document,
      sections: sections.map((s) => (s.id === selected ? { ...s, blocks } : s)),
    });
  };
  async function save() {
    if (!editable) return false;
    const savedAt = new Date().toISOString();
    const fields: Record<string, string> = { ...report.fields };
    for (const key of Object.keys(fields)) {
      const s = sections.find(
        (s) =>
          s.title.toLowerCase().includes(key.toLowerCase()) ||
          (key === "Conclusion" && s.id === "conclusions"),
      );
      if (s) fields[key] = s.blocks.map((b) => b.text).join("\n");
    }
    const success = await act({
      type: "report.save",
      id: report.id,
      fields,
      document: { ...document, savedAt },
    });
    if (success) {
      setDirty(false);
      setNotice(t("Final report draft saved.", "تم حفظ مسودة التقرير النهائي."));
    }
    return success;
  }
  async function image() {
    if (!editable) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setNotice(t("Allow photo access to add an image.", "اسمح بالوصول للصور لإضافة صورة."));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        setNotice("Choose a JPG, PNG or WebP under 5 MB.");
        return;
      }
      if (!asset.base64) {
        setNotice("Could not read this image.");
        return;
      }
      const mime = asset.mimeType ?? "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
        setNotice("Choose a JPG, PNG or WebP under 5 MB.");
        return;
      }
      add("image", `data:${mime};base64,${asset.base64}`);
    } catch {
      setNotice(t("Could not add this image.", "تعذر إضافة الصورة."));
    }
  }
  async function generate(mode: "preview" | "download" | "submit") {
    if (busy) return;
    if (editable && !await save()) return;
    setBusy(true);
    setExportMode(mode);
    setNotice(
      t(
        "Laying out A4 pages and updating contents, figures and tables…",
        "جارٍ ترتيب صفحات A4 وتحديث الفهارس والصور والجداول…",
      ),
    );
    setRequest({ id: uid(), document });
  }
  async function result(reply: EngineReply) {
    if (reply.type === "ready" || reply.id !== request?.id) return;
    if (reply.type === "error") {
      setBusy(false);
      setNotice(reply.message);
      return;
    }
    try {
      const uri = await storePDF(reply.data, meta.title);
      setPdfURI(uri);
      setPositions(reply.positions);
      setGeneratedSignature(signature);
      setNotice(
        reply.abstractPages > 1
          ? `Abstract spans ${reply.abstractPages} pages. Shorten it to meet the one-page limit.`
          : t("PDF page numbers and indexes updated.", "تم تحديث أرقام الصفحات والفهارس."),
      );
      if (exportMode === "download") await sharePDF(uri);
      else setPreview(true);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not generate the PDF.");
    } finally {
      setBusy(false);
    }
  }
  const button = (label: string, fn: () => void, icon: ReactNode, disabled = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={fn}
      style={[s.tool, disabled && { opacity: 0.35 }]}
    >
      {icon}
      {!/^(Move block|Remove block|Close )/.test(label) && (
        <AppText style={s.toolText}>{label}</AppText>
      )}
    </Pressable>
  );
  const select = (id: string) => {
    setSelected(id);
    setDrawer(null);
  };
  const tools =
    section && selected !== "disclaimer" && editable ? (
      <View style={s.tools}>
        {button(t("Text", "نص"), () => add("paragraph"), <Type size={17} color="#526443" />)}
        {button(t("Heading", "عنوان"), () => add("heading"), <Plus size={17} color="#526443" />)}
        {button(t("Image", "صورة"), image, <ImagePlus size={17} color="#526443" />)}
        {button(t("Table", "جدول"), () => add("table"), <Table2 size={17} color="#526443" />)}
      </View>
    ) : null;
  const folio = (id: string) =>
    currentPositions[id]
      ? reportFolio(currentPositions[id], currentPositions.introduction || 1)
      : t("At export", "عند التصدير");
  const field = (
    label: string,
    value: string,
    onChangeText: (v: string) => void,
    maxLength = 160,
  ) => (
    <View style={{ gap: 7 }} key={label}>
      <AppText style={s.fieldLabel}>{label}</AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        maxLength={maxLength}
        style={s.input}
      />
    </View>
  );
  return (
    <View style={kit.stack}>
      <PdfEngine request={request} onResult={result} />
      <Button
        title={t("All reports", "كل التقارير")}
        variant="ghost"
        onPress={async () => {
          if (!dirty || !editable || await save()) onClose();
        }}
      />
      <Panel tint="#edf2e5">
        <View style={kit.row}>
          <CheckCircle2 color="#647e50" size={20} />
          <AppText variant="heading" style={kit.grow}>
            {t("Final Report", "التقرير النهائي")}
          </AppText>
          <AppText variant="caption">{report.status}</AppText>
        </View>
        <AppText tone="muted">
          {editable
            ? t("Open for editing", "مفتوح للتعديل")
            : t("Read only · submitted work is preserved", "للعرض · النسخة المسلّمة محفوظة")}
        </AppText>
        <View style={kit.wrap}>
          {editable && (
            <Button title={t("Save Draft", "حفظ المسودة")} variant="soft" onPress={save} />
          )}
          <Button
            title={t("Preview PDF", "معاينة PDF")}
            variant="soft"
            loading={busy}
            disabled={busy}
            onPress={async () => await generate("preview")}
          />
          <Button
            title={t("Export PDF", "تصدير PDF")}
            disabled={busy}
            onPress={async () => await generate("download")}
          />
        </View>
        <AppText variant="caption" tone="muted">
          {dirty
            ? t("Unsaved changes", "تغييرات غير محفوظة")
            : report.document?.savedAt
              ? `${t("Saved", "محفوظ")} ${new Date(report.document.savedAt).toLocaleTimeString()}`
              : t("Team report workspace", "مساحة تقرير الفريق")}
        </AppText>
      </Panel>
      {!!notice && (
        <AppText accessibilityRole="alert" style={s.notice}>
          {notice}
        </AppText>
      )}
      <View style={kit.wrap}>
        <Button
          title={t("Report structure", "هيكل التقرير")}
          variant="soft"
          onPress={() => setDrawer("outline")}
        />
        <Button
          title={`${t("Requirement Review", "مراجعة المتطلبات")} · ${started}/${required.length}`}
          variant="soft"
          onPress={() => setDrawer("checks")}
        />
      </View>
      <Panel>
        <AppText variant="heading">
          {selected === "cover"
            ? t("Cover details", "بيانات الغلاف")
            : selected === "indexes"
              ? t("Automatic indexes", "الفهارس التلقائية")
              : section?.title}
        </AppText>
        {tools}
      </Panel>
      {selected === "cover" ? (
        <>
          <ReportCoverPreview meta={meta} />
          <Panel>
            {field("Project title", meta.title, (v) => setMeta({ ...meta, title: v }))}
            {field(
              "Specialization",
              meta.specialization,
              (v) => setMeta({ ...meta, specialization: v }),
              100,
            )}
            {field(
              "Engineering department",
              meta.department,
              (v) => setMeta({ ...meta, department: v }),
              100,
            )}
            {field(
              "Supervisor name",
              meta.supervisor,
              (v) => setMeta({ ...meta, supervisor: v }),
              100,
            )}
            {field("Report date (YYYY-MM-DD)", meta.date, (v) => setMeta({ ...meta, date: v }), 10)}
            <AppText variant="heading">Students · 2–3 equal teammates</AppText>
            {meta.students.map((student, index) => (
              <View key={index} style={s.student}>
                {field(
                  `Student ${index + 1} name`,
                  student.name,
                  (v) =>
                    setMeta({
                      ...meta,
                      students: meta.students.map((p, i) => (i === index ? { ...p, name: v } : p)),
                    }),
                  100,
                )}
                {field(
                  `Student ${index + 1} number`,
                  student.number,
                  (v) =>
                    setMeta({
                      ...meta,
                      students: meta.students.map((p, i) =>
                        i === index ? { ...p, number: v } : p,
                      ),
                    }),
                  8,
                )}
                {editable && meta.students.length > 2 && (
                  <Button
                    title={`Remove student ${index + 1}`}
                    variant="ghost"
                    onPress={() =>
                      setMeta({ ...meta, students: meta.students.filter((_, i) => i !== index) })
                    }
                  />
                )}
              </View>
            ))}
            {editable && meta.students.length < 3 && (
              <Button
                title="Add third student"
                variant="soft"
                onPress={() =>
                  setMeta({ ...meta, students: [...meta.students, { name: "", number: "" }] })
                }
              />
            )}
            <AppText style={s.serif}>
              Presented in partial fulfilment of the requirements for Bachelor degree in{" "}
              {meta.specialization || "[Name of Specialization]"}.
            </AppText>
          </Panel>
        </>
      ) : selected === "indexes" ? (
        <Panel>
          <AppText variant="caption" tone="primary">
            Generated from your headings and captions
          </AppText>
          <AppText variant="heading">Table of contents</AppText>
          {sections
            .filter((s) => !s.optional || s.blocks.length)
            .map((section) => (
              <View key={section.id} style={{ gap: 9 }}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => select(section.id)}
                  style={s.indexRow}
                >
                  <AppText style={kit.grow}>
                    {section.chapter ? `${section.chapter}. ` : ""}
                    {section.title}
                  </AppText>
                  <AppText style={s.folio}>{folio(section.id)}</AppText>
                </Pressable>
                {section.blocks
                  .filter((b) => b.kind === "heading")
                  .map((b, i) => (
                    <View key={b.id} style={[s.indexRow, { paddingLeft: 15 }]}>
                      <AppText style={kit.grow}>
                        {section.chapter ? `${section.chapter}.` : ""}
                        {i + 1} {b.text}
                      </AppText>
                      <AppText style={s.folio}>{folio(b.id)}</AppText>
                    </View>
                  ))}
              </View>
            ))}
          {[
            { title: "List of figures", blocks: figures },
            { title: "List of tables", blocks: tables },
          ].map((list) => (
            <View key={list.title} style={{ gap: 12 }}>
              <AppText variant="heading">
                {list.title} · {list.blocks.length}
              </AppText>
              {list.blocks.map((b, i) => (
                <View key={b.id} style={s.indexRow}>
                  <AppText style={kit.grow}>
                    {i + 1}. {b.text || "Add a caption"}
                  </AppText>
                  <AppText style={s.folio}>{folio(b.id)}</AppText>
                </View>
              ))}
              {!list.blocks.length && (
                <AppText tone="muted">
                  Add images or tables with captions in your chapters to build this list.
                </AppText>
              )}
            </View>
          ))}
          <AppText tone="muted">
            Cover has no page number. Front matter uses Roman numerals; the main body starts at 1.
            Page numbers update after PDF layout.
          </AppText>
        </Panel>
      ) : (
        section && (
          <>
            <AppText style={s.guidance}>
              {guidance[selected] || "Write your own report content. This section is optional."}
            </AppText>
            <ImageBackground
              source={stationery}
              style={s.paper}
              imageStyle={s.paperImage}
              resizeMode="stretch"
            >
              <View style={s.paperContent}>
                <AppText style={s.paperHeading}>
                  {section.chapter ? `${section.chapter}  ` : ""}
                  {section.title.toUpperCase()}
                </AppText>
                {selected === "disclaimer" ? (
                  <>
                    <AppText style={s.paragraph}>{disclaimerText(meta.department)}</AppText>
                    <AppText variant="caption" tone="muted">
                      This statement is generated from your Word form. Set the department in Cover
                      details.
                    </AppText>
                  </>
                ) : (
                  <>
                    {section.blocks.map((b, index) => (
                      <View key={b.id} style={s.block}>
                        {editable && (
                          <View style={s.blockTools}>
                            <AppText style={[s.folio, kit.grow]}>{b.kind}</AppText>
                            {button(
                              `Move block ${index + 1} up`,
                              () => move(b.id, -1),
                              <ArrowUp size={16} color="#687b59" />,
                              index === 0,
                            )}
                            {button(
                              `Move block ${index + 1} down`,
                              () => move(b.id, 1),
                              <ArrowDown size={16} color="#687b59" />,
                              index === section.blocks.length - 1,
                            )}
                            {button(
                              `Remove block ${index + 1}`,
                              () =>
                                change({
                                  ...document,
                                  sections: sections.map((s) =>
                                    s.id === selected
                                      ? { ...s, blocks: s.blocks.filter((x) => x.id !== b.id) }
                                      : s,
                                  ),
                                }),
                              <Trash2 size={16} color="#ac6355" />,
                            )}
                          </View>
                        )}
                        {b.kind === "paragraph" ? (
                          <TextInput
                            accessibilityLabel={`Paragraph ${index + 1}`}
                            placeholder="Write your report in your own words…"
                            multiline
                            textAlignVertical="top"
                            editable={editable}
                            value={b.text}
                            maxLength={20000}
                            onChangeText={(v) => update(b.id, { text: v })}
                            style={s.paragraphInput}
                          />
                        ) : b.kind === "heading" ? (
                          <View style={kit.row}>
                            <AppText style={s.subheading}>
                              {section.chapter ? `${section.chapter}.` : ""}
                              {
                                section.blocks
                                  .slice(0, index + 1)
                                  .filter((x) => x.kind === "heading").length
                              }
                            </AppText>
                            <TextInput
                              accessibilityLabel={`Subsection heading ${index + 1}`}
                              placeholder="Subsection title"
                              editable={editable}
                              value={b.text}
                              maxLength={160}
                              onChangeText={(v) => update(b.id, { text: v })}
                              style={[s.input, s.subheading, kit.grow]}
                            />
                          </View>
                        ) : b.kind === "image" ? (
                          <>
                            {b.url && (
                              <Image
                                accessibilityLabel={b.text || "Report figure"}
                                source={{ uri: b.url }}
                                style={{
                                  width: "100%",
                                  height: b.size === "small" ? 125 : b.size === "large" ? 280 : 200,
                                }}
                                resizeMode="contain"
                              />
                            )}
                            {field(
                              `Figure caption ${figures.findIndex((x) => x.id === b.id) + 1}`,
                              b.text,
                              (v) => update(b.id, { text: v }),
                              300,
                            )}
                            <Chips
                              value={b.size ?? "medium"}
                              options={["small", "medium", "large"].map((id) => ({
                                id,
                                label: id,
                              }))}
                              onChange={(v) =>
                                editable && update(b.id, { size: v as ReportBlock["size"] })
                              }
                            />
                          </>
                        ) : (
                          <>
                            <ScrollView horizontal contentContainerStyle={{ paddingBottom: 6 }}>
                              <View>
                                {b.rows?.map((row, ri) => (
                                  <View key={ri} style={{ flexDirection: "row" }}>
                                    {row.map((cell, ci) => (
                                      <TextInput
                                        key={ci}
                                        accessibilityLabel={`Table cell ${ri + 1}-${ci + 1}`}
                                        value={cell}
                                        editable={editable}
                                        maxLength={300}
                                        multiline
                                        onChangeText={(v) =>
                                          update(b.id, {
                                            rows: b.rows!.map((r, i) =>
                                              i === ri ? r.map((c, j) => (j === ci ? v : c)) : r,
                                            ),
                                          })
                                        }
                                        style={[
                                          s.cell,
                                          ri === 0 && {
                                            backgroundColor: "#e8eddf",
                                            fontWeight: "700",
                                          },
                                        ]}
                                      />
                                    ))}
                                  </View>
                                ))}
                              </View>
                            </ScrollView>
                            {editable && (
                              <View style={kit.wrap}>
                                <Button
                                  title="+ Row"
                                  variant="ghost"
                                  disabled={(b.rows?.length ?? 0) >= 30}
                                  onPress={() =>
                                    update(b.id, { rows: [...b.rows!, b.rows![0].map(() => "")] })
                                  }
                                />
                                <Button
                                  title="+ Column"
                                  variant="ghost"
                                  disabled={(b.rows?.[0]?.length ?? 0) >= 6}
                                  onPress={() =>
                                    update(b.id, { rows: b.rows!.map((r) => [...r, ""]) })
                                  }
                                />
                                {(b.rows?.length ?? 0) > 2 && (
                                  <Button
                                    title="− Row"
                                    variant="ghost"
                                    onPress={() => update(b.id, { rows: b.rows!.slice(0, -1) })}
                                  />
                                )}{" "}
                                {(b.rows?.[0]?.length ?? 0) > 2 && (
                                  <Button
                                    title="− Column"
                                    variant="ghost"
                                    onPress={() =>
                                      update(b.id, { rows: b.rows!.map((r) => r.slice(0, -1)) })
                                    }
                                  />
                                )}
                              </View>
                            )}
                            {field(
                              `Table caption ${tables.findIndex((x) => x.id === b.id) + 1}`,
                              b.text,
                              (v) => update(b.id, { text: v }),
                              300,
                            )}
                          </>
                        )}
                      </View>
                    ))}
                    {!section.blocks.length && (
                      <View style={s.empty}>
                        <FileText size={32} color="#9aac85" />
                        <AppText tone="muted">Start this section with your own writing.</AppText>
                        {editable && (
                          <Button
                            title="Add first paragraph"
                            variant="soft"
                            onPress={() => add("paragraph")}
                          />
                        )}
                      </View>
                    )}
                    {tools}
                  </>
                )}
              </View>
            </ImageBackground>
            <AppText variant="caption" tone="muted">
              Section editor · Long sections flow onto additional A4 pages in the PDF. Use Preview
              PDF to see exact page breaks.
            </AppText>
          </>
        )
      )}
      {editable && (
        <View style={kit.wrap}>
          <Button title={t("Save Draft", "حفظ المسودة")} onPress={save} />
          <Button
            title={t("Review before submitting", "مراجعة قبل التسليم")}
            variant="soft"
            disabled={busy}
            onPress={async () => await generate("submit")}
          />
        </View>
      )}
      {report.feedback.map((f) => (
        <Panel key={f.id} tint="#eaf0f8">
          <AppText weight="bold">{state.users.find((u) => u.id === f.authorId)?.name}</AppText>
          <AppText variant="caption">
            {f.section || "General feedback"} · {new Date(f.createdAt).toLocaleDateString()}
          </AppText>
          <AppText>{f.body}</AppText>
        </Panel>
      ))}
      {supervisor && (
        <Panel title={t("Supervisor feedback", "ملاحظات المشرف")}>
          <Field
            label="Section / page (optional)"
            value={feedbackSection}
            onChangeText={setFeedbackSection}
          />
          <Field label="Your feedback" value={feedback} multiline onChangeText={setFeedback} />
          <View style={kit.wrap}>
            {(["reviewed", "changes"] as const).map((status) => (
              <Button
                key={status}
                title={status === "reviewed" ? "Reviewed" : "Needs changes"}
                disabled={!feedback.trim()}
                onPress={async () => {
                  if (
                    await act({
                      type: "report.review",
                        submissionId: report.history?.at(-1)?.id ?? "",
                      id: report.id,
                      body: feedback,
                      section: feedbackSection,
                      status,
                    })
                  )
                    setFeedback("");
                }}
              />
            ))}
            <Button
              title="Reopen for this team"
              variant="soft"
              onPress={async () => await act({ type: "report.reopen", id: report.id })}
            />
          </View>
        </Panel>
      )}
      <Modal visible={drawer !== null} animationType="slide" onRequestClose={() => setDrawer(null)}>
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <List color="#526443" />
            <AppText variant="heading" style={kit.grow}>
              {drawer === "outline" ? "Report structure" : "Requirement Review"}
            </AppText>
            {button("Close report panel", () => setDrawer(null), <X color="#526443" />)}
          </View>
          <ScrollView contentContainerStyle={s.drawer}>
            {drawer === "outline" ? (
              <>
                {[
                  { id: "cover", title: "Cover page", optional: false },
                  { ...sections[0] },
                  { ...sections[1] },
                  { ...sections[2] },
                  { id: "indexes", title: "Contents, figures & tables", optional: false },
                  ...sections.slice(3),
                ].map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={item.title}
                    onPress={() => select(item.id)}
                    style={[s.outline, selected === item.id && s.active]}
                  >
                    <View style={kit.grow}>
                      <AppText weight="semibold">{item.title}</AppText>
                      {item.optional && (
                        <AppText variant="caption" tone="muted">
                          Optional
                        </AppText>
                      )}
                      {item.id === "indexes" && (
                        <AppText variant="caption" tone="muted">
                          Generated automatically
                        </AppText>
                      )}
                    </View>
                    <ChevronRight size={17} color="#7f906d" />
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                <AppText tone="muted">Based on your supplied university Word form.</AppText>
                <AppText variant="title">
                  {started}/{required.length}
                </AppText>
                <AppText>Required sections started</AppText>
                <AppText style={s.guidance}>
                  Local structure checks only. AI content review is not connected; finding a keyword
                  is not evidence of compliance or ABET approval.
                </AppText>
                {checks.map((check) => (
                  <Pressable
                    key={check.id}
                    accessibilityRole="button"
                    onPress={() => select(check.section)}
                    style={s.check}
                  >
                    <CheckCircle2
                      size={20}
                      color={
                        check.state === "present"
                          ? "#6a8652"
                          : check.state === "review"
                            ? "#6485a2"
                            : "#b3816e"
                      }
                    />
                    <View style={kit.grow}>
                      <AppText weight="bold">{check.title}</AppText>
                      <AppText variant="caption" style={{ color: "#698158" }}>
                        {check.state === "present"
                          ? "Format check passed"
                          : check.state === "review"
                            ? "Needs content review"
                            : "Missing"}
                      </AppText>
                      <AppText tone="muted">{check.detail}</AppText>
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={preview}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPreview(false)}
      >
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Eye color="#526443" />
            <AppText variant="heading" style={kit.grow}>
              Final report PDF preview
            </AppText>
            {button("Close PDF preview", () => setPreview(false), <X color="#526443" />)}
          </View>
          {!!pdfURI && <PdfDocument uri={pdfURI} />}
          <View style={s.previewFooter}>
            <Button
              title="Download this PDF"
              variant="soft"
              onPress={() => sharePDF(pdfURI).catch((e) => setNotice(String(e)))}
            />
            {exportMode === "submit" && editable && (
              <Button
                title="Confirm submission"
                onPress={async () => {
                  if (await act({ type: "report.submit", id: report.id })) setPreview(false);
                }}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  notice: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#edf2e4",
    color: "#4e663e",
    fontSize: 13,
    lineHeight: 21,
  },
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: {
    minHeight: 40,
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 11,
    backgroundColor: "#eff3e9",
  },
  toolText: { fontSize: 12, color: "#586d46" },
  serif: { fontFamily: "Georgia", fontSize: 14, lineHeight: 24, color: "#293126" },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#58694b" },
  input: {
    fontSize: 15,
    padding: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#d9e1ce",
    backgroundColor: "#fff",
    color: "#263325",
    minHeight: 46,
  },
  student: { paddingTop: 14, gap: 12, borderTopWidth: 1, borderColor: "#e1e5d9" },
  indexRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: "#e4e8db",
    alignItems: "flex-start",
  },
  folio: { fontSize: 11, color: "#879575" },
  guidance: { fontSize: 12, lineHeight: 21, color: "#7a866f", paddingHorizontal: 4 },
  paper: {
    borderWidth: 1,
    borderColor: "#dedfce",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 480,
  },
  paperImage: { opacity: 0.48 },
  paperContent: { paddingTop: 108, paddingBottom: 65, paddingHorizontal: 18, gap: 18 },
  paperHeading: {
    fontFamily: "Georgia",
    fontSize: 17,
    lineHeight: 26,
    fontWeight: "700",
    color: "#273329",
  },
  paragraph: { fontFamily: "Georgia", fontSize: 15, lineHeight: 27, color: "#283028" },
  paragraphInput: {
    fontFamily: "Georgia",
    fontSize: 16,
    lineHeight: 28,
    color: "#283028",
    padding: 10,
    minHeight: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e8dd",
    backgroundColor: "#ffffffbd",
  },
  subheading: { fontFamily: "Georgia", fontSize: 17, fontWeight: "700", color: "#31432d" },
  block: { gap: 12, paddingBottom: 20, borderBottomWidth: 1, borderColor: "#e2e5d8" },
  blockTools: { flexDirection: "row", alignItems: "center", gap: 5 },
  cell: {
    width: 125,
    minHeight: 50,
    borderWidth: 0.5,
    borderColor: "#c5ceba",
    padding: 9,
    fontSize: 14,
    color: "#293724",
    backgroundColor: "#ffffffbd",
  },
  empty: { alignItems: "center", paddingVertical: 25, gap: 17 },
  modal: { flex: 1, backgroundColor: "#fafbf6" },
  modalHeader: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#dde4d3",
    alignItems: "center",
  },
  drawer: { padding: 18, gap: 13 },
  outline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#e1e6d8",
    backgroundColor: "#fff",
  },
  active: { borderColor: "#91a67c", backgroundColor: "#e8efdf" },
  check: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    gap: 12,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e6d8",
  },
  previewFooter: {
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderTopWidth: 1,
    borderColor: "#dde3d4",
  },
});
