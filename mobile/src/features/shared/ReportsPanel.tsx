import { PresentationEditor } from "@/native/reports/PresentationEditor";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import Svg, { Rect, Ellipse, Path, Circle, G, Text as SvgText } from "react-native-svg";
import { AppText, Button } from "@/components";
import { Chips, Field, Panel, kit, useCopy } from "@/components/MobileKit";
import { useWorkspace } from "@/state/WorkspaceProvider";
import type { Report, ReportKind } from "@/domain/workspace";
import { colors } from "@/theme";
import templates from "../../../assets/data/templates.json";
import { FinalReportEditor } from "@/native/reports/FinalReportEditor";
import { WeeklyReportEditor } from "@/native/reports/WeeklyReportEditor";

const labels: Record<string, [string, string]> = {
  completed: ["Completed work", "العمل المنجز"],
  progress: ["Progress", "التقدم"],
  tasks: ["Tasks completed", "المهام المنجزة"],
  delays: ["Delays", "التأخير"],
  problems: ["Problems", "المشاكل"],
  plan: ["Next week plan", "خطة الأسبوع القادم"],
};
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function ReportsPanel({
  supervisor = false,
  onlyFinal = false,
}: {
  supervisor?: boolean;
  onlyFinal?: boolean;
}) {
  const { state, actorId, act } = useWorkspace();
  const t = useCopy();
  const [kind, setKind] = useState<ReportKind>(onlyFinal ? "final" : "weekly");
  const [selected, setSelected] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [feedback, setFeedback] = useState("");
  const [section, setSection] = useState("");
  const [preview, setPreview] = useState(false);
  const [slide, setSlide] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);
  const reports = state.reports.filter(
    (r) =>
      r.kind === kind &&
      state.projects.some(
        (p) =>
          p.id === r.projectId &&
          (supervisor ? p.supervisorIds.includes(actorId) : p.studentIds.includes(actorId)),
      ) &&
      (!supervisor || r.status !== "draft"),
  );
  const report = state.reports.find((r) => r.id === selected);
  const draft = fields ?? report?.fields ?? {};
  const title = state.projects.find((p) => p.id === report?.projectId)?.title ?? "";
  const [template, setTemplate] = useState("margin");
  const [color, setColor] = useState("#526443");
  const open = (r: Report) => {
    setSelected(r.id);
    setFields(null);
    setFeedback("");
    setSection("");
    setTemplate(r.template);
    setColor(r.color);
    if (supervisor) act({ type: "report.view", id: r.id });
  };
  function save() {
    if (!report) return false;
    return act({ type: "report.save", id: report.id, fields: draft, template, color });
  }
  async function exportPDF() {
    setExporting(true);
    setExportError("");
    try {
      const html = `<html><head><meta charset="UTF-8"><style>body{font:16px sans-serif;color:#0d1528;padding:32px}h1,h2{color:${color}}section{margin:24px 0;break-inside:avoid}p{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(title)}</h1>${Object.entries(
        draft,
      )
        .map(
          ([k, v]) =>
            `<section><h2>${escapeHtml(labels[k]?.[0] ?? k)}</h2><p dir="auto">${escapeHtml(v)}</p></section>`,
        )
        .join("")}</body></html>`;
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
      else
        setExportError(
          t("Sharing is unavailable on this device.", "المشاركة غير متاحة على هذا الجهاز."),
        );
    } catch {
      setExportError(
        t("Could not export the PDF. Please retry.", "تعذر تصدير PDF. يرجى المحاولة مجددًا."),
      );
    } finally {
      setExporting(false);
    }
  }
  const hero = !supervisor && (
    <Panel tint={colors.primaryWash}>
      <AppText variant="caption" tone="primary">
        SMALL UPDATES. A COMPLETE STORY.
      </AppText>
      <AppText variant="title">From this week’s work{"\n"}to your final report.</AppText>
      <AppText tone="muted">
        Capture what you learned, show what you built, and keep the evidence together.
      </AppText>
      <Svg width={170} height={110} viewBox="0 0 170 110" style={{ alignSelf: "flex-end" }}>
        <G transform="rotate(-7 85 55)">
          <Rect x={22} y={7} width={126} height={97} rx={12} fill="#fffff6" stroke="#bbcba5" />
          <Path d="M39 8V103M50 27H135M50 42H135M50 57H135M50 72H135M50 87H135" stroke="#d5dfc7" />
          <Path
            d="M58 48H77V33H96V65H121M57 80H70L80 68L91 76L105 59L126 45"
            stroke="#78915d"
            strokeWidth={1.6}
            fill="none"
          />
          <Circle cx={58} cy={48} r={3} fill="#98b17c" />
          <Circle cx={121} cy={65} r={3} fill="#98b17c" />
          <SvgText x={58} y={25} fontSize={8} fill="#74865f">
            V = IR · f(t)
          </SvgText>
          <SvgText x={56} y={96} fontSize={7} fill="#74865f">
            one idea at a time
          </SvgText>
        </G>
      </Svg>
    </Panel>
  );
  if (kind === "weekly" && !supervisor && reports.length) {
    const weeklyReport = report ?? [...reports].sort((a, b) => b.week - a.week)[0];
    return (
      <View style={kit.stack}>
        {hero}
        <Chips
          options={[
            { id: "weekly", label: t("Weekly", "أسبوعي") },
            { id: "final", label: t("Final report", "النهائي") },
            { id: "presentation", label: t("Presentation", "العرض") },
          ]}
          value={kind}
          onChange={(v) => {
            setKind(v as ReportKind);
            setSelected(null);
          }}
        />
        <WeeklyReportEditor key={weeklyReport.id} report={weeklyReport} onSelect={setSelected} />
      </View>
    );
  }
  if (kind === "presentation" && reports.length) {
    const deckReport = report ?? reports[0];
    return (
      <View style={kit.stack}>
        <Chips
          value={kind}
          onChange={(v) => {
            setKind(v as ReportKind);
            setSelected(null);
          }}
          options={[
            { id: "weekly", label: "Weekly" },
            { id: "final", label: "Final report" },
            { id: "presentation", label: "Presentation" },
          ]}
        />
        {supervisor && (
          <Chips
            value={deckReport.id}
            onChange={(id) => {
              const r = reports.find((r) => r.id === id);
              if (r) open(r);
            }}
            options={reports.map((r) => ({
              id: r.id,
              label: state.projects.find((p) => p.id === r.projectId)?.title ?? r.projectId,
            }))}
          />
        )}
        <PresentationEditor
          key={deckReport.id}
          report={deckReport}
          supervisor={supervisor}
          onClose={() => {
            setKind("weekly");
            setSelected(null);
          }}
        />
      </View>
    );
  }
  if (kind === "final" && reports.length) {
    const finalReport = report ?? reports[0];
    return (
      <View style={kit.stack}>
        {hero}
        <Chips
          options={[
            { id: "weekly", label: t("Weekly", "أسبوعي") },
            { id: "final", label: t("Final report", "النهائي") },
            { id: "presentation", label: t("Presentation", "العرض") },
          ]}
          value={kind}
          onChange={(v) => {
            setKind(v as ReportKind);
            setSelected(null);
          }}
        />
        {supervisor && (
          <Chips
            value={finalReport.id}
            options={reports.map((r) => ({
              id: r.id,
              label: state.projects.find((p) => p.id === r.projectId)?.title ?? r.projectId,
            }))}
            onChange={(id) => {
              const r = reports.find((r) => r.id === id);
              if (r) open(r);
            }}
          />
        )}
        <FinalReportEditor
          key={finalReport.id}
          report={finalReport}
          supervisor={supervisor}
          onClose={() => {
            setKind("weekly");
            setSelected(null);
          }}
        />
      </View>
    );
  }
  return (
    <View style={kit.stack}>
      {hero}
      <Chips
        options={[
          { id: "weekly", label: t("Weekly", "أسبوعي") },
          { id: "final", label: t("Final report", "النهائي") },
          { id: "presentation", label: t("Presentation", "العرض") },
        ]}
        value={kind}
        onChange={(v) => {
          setKind(v as ReportKind);
          setSelected(null);
          setFields(null);
        }}
      />
      {!supervisor && kind === "weekly" && !report && (
        <Button
          title={t("Start next weekly report", "بدء التقرير الأسبوعي التالي")}
          variant="soft"
          onPress={() => {
            const project = state.projects.find((p) => p.studentIds.includes(actorId));
            if (!project) return;
            const week =
              Math.max(
                0,
                ...state.reports
                  .filter((r) => r.projectId === project.id && r.kind === "weekly")
                  .map((r) => r.week),
              ) + 1;
            act({ type: "weekly.create", projectId: project.id, week });
            setShowDrafts(true);
          }}
        />
      )}
      {!supervisor && !report && (
        <Button
          title={`${t("Saved Drafts", "المسودات المحفوظة")} (${reports.filter((x) => x.status === "draft").length})`}
          variant="soft"
          onPress={() => setShowDrafts(!showDrafts)}
        />
      )}
      {!report &&
        reports
          .filter((r) => supervisor || r.status !== "draft" || showDrafts)
          .map((r) => (
            <Panel key={r.id}>
              <AppText variant="heading">
                {state.projects.find((p) => p.id === r.projectId)?.title}
              </AppText>
              <AppText tone="muted">
                {r.kind === "weekly"
                  ? t(`Week ${r.week}`, `الأسبوع ${r.week}`)
                  : t("Team workspace", "مساحة الفريق")}{" "}
                · {r.status}
              </AppText>
              <Button title={t("Open", "فتح")} variant="soft" onPress={() => open(r)} />
            </Panel>
          ))}
      {!report && !reports.length && (
        <Panel>
          <AppText>
            {t("No submitted work to review yet.", "لا توجد تسليمات للمراجعة حاليًا.")}
          </AppText>
        </Panel>
      )}
      {report && (
        <>
          <Button
            title={t("All reports", "كل التقارير")}
            variant="ghost"
            onPress={() => {
              setSelected(null);
              setFields(null);
            }}
          />
          <Panel tint={colors.primaryWash}>
            <AppText variant="heading">{title}</AppText>
            <AppText>{report.status.toUpperCase()}</AppText>
            {report.submittedAt && (
              <AppText variant="caption" tone="muted">
                {new Date(report.submittedAt).toLocaleString()}
              </AppText>
            )}
          </Panel>
          {kind === "presentation" && !supervisor && report.status === "draft" && (
            <>
              <AppText variant="heading">{t("Layout template", "قالب التصميم")}</AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {templates.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: template === p.id }}
                    onPress={() => setTemplate(p.id)}
                    style={[
                      s.template,
                      template === p.id && { borderColor: color, borderWidth: 2 },
                    ]}
                  >
                    <TemplatePreview
                      template={p.id}
                      title="Your project"
                      body="Your ideas, clearly presented."
                      color={color}
                    />
                    <AppText variant="caption">{p.name}</AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <AppText variant="label">{t("Accent color", "لون القالب")}</AppText>
              <Chips
                value={color}
                options={["#526443", "#547a9d", "#86629a", "#a05272", "#387f7d", "#394253"].map(
                  (c) => ({ id: c, label: c }),
                )}
                onChange={setColor}
              />
            </>
          )}
          {Object.entries(draft).map(([key, value]) => (
            <Panel key={key}>
              {!supervisor && report.status === "draft" ? (
                <Field
                  label={labels[key] ? t(...labels[key]) : key}
                  value={value}
                  multiline
                  onChangeText={(text) => setFields({ ...draft, [key]: text })}
                />
              ) : (
                <>
                  <AppText variant="heading">{labels[key] ? t(...labels[key]) : key}</AppText>
                  <AppText>{value || "—"}</AppText>
                </>
              )}
            </Panel>
          ))}
          {!supervisor && report.status === "draft" && (
            <View style={kit.wrap}>
              <Button title={t("Save draft", "حفظ المسودة")} onPress={save} />
              <Button
                title={t("Review before submitting", "مراجعة قبل التسليم")}
                variant="soft"
                onPress={() => {
                  if (save()) setPreview(true);
                }}
              />
            </View>
          )}
          {(!supervisor || report.status !== "draft") && (
            <Button
              title={
                kind === "presentation"
                  ? t("Present full screen", "عرض بملء الشاشة")
                  : t("Paper preview", "معاينة الورقة")
              }
              variant="soft"
              onPress={() => {
                setSlide(0);
                setPreview(true);
              }}
            />
          )}
          {!supervisor &&
            report.kind === "weekly" &&
            report.status === "submitted" &&
            !report.openedBy.length && (
              <Button
                title={t("Withdraw and edit", "سحب للتعديل")}
                variant="ghost"
                onPress={() => act({ type: "report.withdraw", id: report.id })}
              />
            )}
          {report.feedback.map((f) => (
            <Panel key={f.id} tint={colors.softBlue}>
              <AppText weight="semibold">
                {state.users.find((u) => u.id === f.authorId)?.name}
              </AppText>
              <AppText variant="caption" tone="muted">
                {f.section || t("General feedback", "ملاحظات عامة")}
              </AppText>
              <AppText>{f.body}</AppText>
            </Panel>
          ))}
          {supervisor && (
            <Panel title={t("Supervisor feedback", "ملاحظات المشرف")}>
              <Field
                label={t("Section / slide (optional)", "القسم / السلايد (اختياري)")}
                value={section}
                onChangeText={setSection}
              />
              <Field
                label={t("Your feedback", "الملاحظات")}
                multiline
                value={feedback}
                onChangeText={setFeedback}
              />
              <View style={kit.wrap}>
                <Button
                  title={t("Reviewed", "تمت المراجعة")}
                  disabled={!feedback.trim()}
                  onPress={() => {
                    if (
                      act({
                        type: "report.review",
                        id: report.id,
                        body: feedback,
                        section,
                        status: "reviewed",
                      })
                    )
                      setFeedback("");
                  }}
                />
                <Button
                  title={t("Needs changes", "بحاجة تعديلات")}
                  variant="soft"
                  disabled={!feedback.trim()}
                  onPress={() => {
                    if (
                      act({
                        type: "report.review",
                        id: report.id,
                        body: feedback,
                        section,
                        status: "changes",
                      })
                    )
                      setFeedback("");
                  }}
                />
              </View>
              {report.kind !== "weekly" && (
                <Button
                  title={t("Reopen for this team", "إعادة الفتح لهذا الفريق")}
                  variant="ghost"
                  onPress={() => {
                    act({ type: "report.reopen", id: report.id });
                    setSelected(null);
                  }}
                />
              )}
            </Panel>
          )}
          <Button
            title={t("Export PDF", "تصدير PDF")}
            variant="ghost"
            loading={exporting}
            onPress={exportPDF}
          />
          {exportError && <AppText tone="danger">{exportError}</AppText>}
          <Modal
            visible={preview}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => setPreview(false)}
          >
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
              <View style={[kit.row, { padding: 16 }]}>
                <AppText variant="heading" style={kit.grow}>
                  {title}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("Close preview", "إغلاق المعاينة")}
                  onPress={() => setPreview(false)}
                  style={kit.iconButton}
                >
                  <X color={colors.text} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
                {kind === "presentation" ? (
                  <>
                    <TemplatePreview
                      template={template}
                      color={color}
                      title={Object.keys(draft)[slide] ?? ""}
                      body={Object.values(draft)[slide] ?? ""}
                    />
                    <AppText align="center">
                      {slide + 1} / {Object.keys(draft).length}
                    </AppText>
                    <View style={kit.wrap}>
                      <Button
                        title={t("Previous", "السابق")}
                        disabled={slide === 0}
                        onPress={() => setSlide((s) => s - 1)}
                      />
                      <Button
                        title={t("Next", "التالي")}
                        disabled={slide >= Object.keys(draft).length - 1}
                        onPress={() => setSlide((s) => s + 1)}
                      />
                    </View>
                  </>
                ) : (
                  Object.entries(draft).map(([k, v]) => (
                    <View key={k} style={s.paper}>
                      <AppText variant="heading">{labels[k] ? t(...labels[k]) : k}</AppText>
                      <AppText>{v || "—"}</AppText>
                    </View>
                  ))
                )}
                {!supervisor && report.status === "draft" && (
                  <Button
                    title={t("Confirm submission", "تأكيد التسليم")}
                    onPress={() => {
                      if (act({ type: "report.submit", id: report.id })) {
                        setPreview(false);
                        setFields(null);
                      }
                    }}
                  />
                )}
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </>
      )}
    </View>
  );
}
export function TemplatePreview({
  template,
  title,
  body,
  color,
}: {
  template: string;
  title: string;
  body: string;
  color: string;
}) {
  const c = (templates.find((t) => t.id === template) ?? templates[0]).composition;
  const { width } = useWindowDimensions();
  const accent = (fill: string) => (fill === "#526443" ? color : fill);
  return (
    <Svg
      viewBox="0 0 960 540"
      width="100%"
      height={(Math.min(width - 70, 500) * 540) / 960}
      accessibilityLabel={title}
    >
      <Rect width={960} height={540} fill={c.background} />
      {c.shapes.map((s, i) =>
        s.kind === "ellipse" ? (
          <Ellipse
            key={i}
            cx={s.x + s.w / 2}
            cy={s.y + s.h / 2}
            rx={s.w / 2}
            ry={s.h / 2}
            fill={accent(s.fill)}
            stroke={s.stroke}
          />
        ) : (
          <Rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx={s.radius}
            fill={accent(s.fill)}
            stroke={s.stroke}
          />
        ),
      )}
      {c.texts.map((text, i) => (
        <SvgText
          key={i}
          x={text.x}
          y={text.y + text.size}
          fontSize={text.size}
          fontWeight={text.bold ? "bold" : "normal"}
          fill={accent(text.color)}
        >
          {(text.role === "title" ? title : text.role === "body" ? body : text.text).slice(
            0,
            text.role === "body" ? 110 : 70,
          )}
        </SvgText>
      ))}
    </Svg>
  );
}
const s = StyleSheet.create({
  template: {
    width: 210,
    padding: 10,
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  paper: { padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
});
